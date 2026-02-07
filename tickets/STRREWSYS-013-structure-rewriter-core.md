# STRREWSYS-013: Implement Structure Rewriter Core

## Summary
Create the core structure rewriting orchestrator that calls the LLM to regenerate structure and merges preserved beats with new content.

## Dependencies
- STRREWSYS-006 (StructureRewriteContext, StructureRewriteResult types)
- STRREWSYS-012 (extractCompletedBeats, buildRewriteContext)
- STRREWSYS-014 (structure rewrite prompt)

## Files to Touch

### New Files
- `src/engine/structure-rewriter.ts`
- `test/unit/engine/structure-rewriter.test.ts`

### Modified Files
- `src/engine/index.ts` (add exports)

## Out of Scope
- Do NOT modify page-service.ts (handled in STRREWSYS-011)
- Do NOT modify LLM client
- Do NOT implement response parsing here (use existing structure parser)
- Do NOT handle persistence (caller handles)

## Implementation Details

### New File: `src/engine/structure-rewriter.ts`

```typescript
import { LLMClient } from '../llm/client';
import { buildStructureRewritePrompt } from '../llm/prompts/structure-rewrite-prompt';
import { createStoryStructure, StructureGenerationResult } from './structure-manager';
import {
  CompletedBeat,
  StructureRewriteContext,
  StructureRewriteResult,
} from '../llm/types';
import { StoryStructure, StoryBeat, StoryAct } from '../models/story-arc';

/**
 * Interface for structure rewriting.
 */
export interface StructureRewriter {
  /**
   * Rewrites the story structure from the current point forward.
   */
  rewriteStructure(
    context: StructureRewriteContext,
    apiKey: string
  ): Promise<StructureRewriteResult>;
}

/**
 * Creates a structure rewriter instance.
 */
export function createStructureRewriter(
  llmClient?: LLMClient
): StructureRewriter {
  const client = llmClient ?? createDefaultLLMClient();

  return {
    async rewriteStructure(
      context: StructureRewriteContext,
      apiKey: string
    ): Promise<StructureRewriteResult> {
      const prompt = buildStructureRewritePrompt(context);

      const response = await client.generate({
        messages: [{ role: 'user', content: prompt }],
        apiKey,
      });

      const rawResponse = response.content;

      // Parse regenerated structure
      const parsedResult = parseRewriteResponse(rawResponse, context);

      // Merge preserved beats with regenerated
      const mergedStructure = mergePreservedWithRegenerated(
        context.completedBeats,
        parsedResult.regeneratedStructure,
        context.originalTheme
      );

      const preservedBeatIds = context.completedBeats.map(b => b.beatId);

      return {
        structure: mergedStructure,
        preservedBeatIds,
        rawResponse,
      };
    },
  };
}

/**
 * Parses the LLM response for regenerated structure.
 */
function parseRewriteResponse(
  rawResponse: string,
  context: StructureRewriteContext
): { regeneratedStructure: StoryStructure } {
  // Parse REGENERATED_ACTS section
  // Similar to structure-generator parsing but for partial structure

  const lines = rawResponse.split('\n');

  const acts: Array<{
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{ description: string; objective: string }>;
  }> = [];

  let currentAct: {
    name: string;
    objective: string;
    stakes: string;
    entryCondition: string;
    beats: Array<{ description: string; objective: string }>;
  } | null = null;

  let currentBeat: { description: string; objective: string } | null = null;
  let themeEvolution = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // Parse ACT_N: header
    if (/^ACT_\d+:$/.test(trimmed)) {
      if (currentAct) {
        if (currentBeat) {
          currentAct.beats.push(currentBeat);
          currentBeat = null;
        }
        acts.push(currentAct);
      }
      currentAct = {
        name: '',
        objective: '',
        stakes: '',
        entryCondition: '',
        beats: [],
      };
      continue;
    }

    if (currentAct) {
      // Parse act fields
      if (trimmed.startsWith('NAME:')) {
        currentAct.name = trimmed.substring(5).trim();
      } else if (trimmed.startsWith('OBJECTIVE:') && !currentBeat) {
        currentAct.objective = trimmed.substring(10).trim();
      } else if (trimmed.startsWith('STAKES:')) {
        currentAct.stakes = trimmed.substring(7).trim();
      } else if (trimmed.startsWith('ENTRY_CONDITION:')) {
        currentAct.entryCondition = trimmed.substring(16).trim();
      } else if (trimmed === 'BEATS:') {
        // Start beats section
      } else if (trimmed.startsWith('- DESCRIPTION:')) {
        if (currentBeat) {
          currentAct.beats.push(currentBeat);
        }
        currentBeat = {
          description: trimmed.substring(14).trim(),
          objective: '',
        };
      } else if (trimmed.startsWith('OBJECTIVE:') && currentBeat) {
        currentBeat.objective = trimmed.substring(10).trim();
      }
    }

    if (trimmed.startsWith('THEME_EVOLUTION:')) {
      themeEvolution = trimmed.substring(16).trim();
    }
  }

  // Push final beat and act
  if (currentBeat && currentAct) {
    currentAct.beats.push(currentBeat);
  }
  if (currentAct) {
    acts.push(currentAct);
  }

  // Convert to StoryStructure format
  const regeneratedResult: StructureGenerationResult = {
    overallTheme: context.originalTheme + (themeEvolution ? ` | ${themeEvolution}` : ''),
    acts,
    rawResponse,
  };

  return {
    regeneratedStructure: createStoryStructure(regeneratedResult),
  };
}

/**
 * Merges preserved beats with regenerated structure.
 */
export function mergePreservedWithRegenerated(
  preservedBeats: readonly CompletedBeat[],
  regeneratedStructure: StoryStructure,
  originalTheme: string
): StoryStructure {
  // Group preserved beats by act
  const preservedByAct = new Map<number, CompletedBeat[]>();
  for (const beat of preservedBeats) {
    const existing = preservedByAct.get(beat.actIndex) ?? [];
    existing.push(beat);
    preservedByAct.set(beat.actIndex, existing);
  }

  // Build merged acts
  const mergedActs: StoryAct[] = [];

  for (let actIdx = 0; actIdx < 3; actIdx++) {
    const preserved = preservedByAct.get(actIdx) ?? [];
    const regeneratedAct = regeneratedStructure.acts[actIdx];

    if (!regeneratedAct && preserved.length === 0) {
      throw new Error(`Missing act ${actIdx + 1} in merged structure`);
    }

    // Create beats: preserved first, then regenerated
    const mergedBeats: StoryBeat[] = [];

    // Add preserved beats
    for (const pb of preserved) {
      mergedBeats.push({
        id: pb.beatId,
        description: pb.description,
        objective: pb.objective,
      });
    }

    // Add regenerated beats (skip if they'd overlap with preserved)
    if (regeneratedAct) {
      for (const rb of regeneratedAct.beats) {
        // Check if this beat index is already preserved
        const beatIdx = mergedBeats.length;
        const beatId = `${actIdx + 1}.${beatIdx + 1}`;

        // Only add if not overlapping
        if (!preserved.some(pb => pb.beatIndex === beatIdx)) {
          mergedBeats.push({
            id: beatId,
            description: rb.description,
            objective: rb.objective,
          });
        }
      }
    }

    // Use regenerated act metadata if available, or create minimal
    mergedActs.push({
      id: String(actIdx + 1),
      name: regeneratedAct?.name ?? `Act ${actIdx + 1}`,
      objective: regeneratedAct?.objective ?? '',
      stakes: regeneratedAct?.stakes ?? '',
      entryCondition: regeneratedAct?.entryCondition ?? 'Continuing from previous',
      beats: mergedBeats,
    });
  }

  // Renumber beat IDs to be sequential within each act
  for (const act of mergedActs) {
    const renumberedBeats = act.beats.map((beat, idx) => ({
      ...beat,
      id: `${act.id}.${idx + 1}`,
    }));
    (act as { beats: StoryBeat[] }).beats = renumberedBeats;
  }

  return {
    acts: mergedActs,
    overallTheme: originalTheme,
    generatedAt: new Date(),
  };
}

function createDefaultLLMClient(): LLMClient {
  // Import and create default client
  const { createLLMClient } = require('../llm/client');
  return createLLMClient();
}
```

### `src/engine/index.ts` Updates

Add exports:
```typescript
export {
  StructureRewriter,
  createStructureRewriter,
  mergePreservedWithRegenerated,
} from './structure-rewriter';
```

### `test/unit/engine/structure-rewriter.test.ts`

```typescript
import {
  createStructureRewriter,
  mergePreservedWithRegenerated,
} from '../../../src/engine/structure-rewriter';

describe('StructureRewriter', () => {
  describe('rewriteStructure', () => {
    it('should call LLM with correct prompt');
    it('should parse regenerated structure correctly');
    it('should preserve completed beats');
    it('should maintain three-act structure');
    it('should return preservedBeatIds');
    it('should include rawResponse for debugging');
  });
});

describe('mergePreservedWithRegenerated', () => {
  it('should keep preserved beats unchanged');
  it('should append regenerated beats after preserved');
  it('should maintain hierarchical beat IDs');
  it('should preserve original theme');
  it('should handle empty preserved beats');
  it('should handle preserved beats in multiple acts');
  it('should renumber beat IDs sequentially');
  it('should ensure exactly 3 acts');
  it('should ensure 2-4 beats per act');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/engine/structure-rewriter.test.ts`
- Run with: `npm test -- test/unit/engine/structure-rewriter.test.ts`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified** - Preserved beats identical in output
2. **I5: Three-Act Structure** - Output always has exactly 3 acts
3. **I6: Beat Count Per Act** - Each act has 2-4 beats
4. **I7: Hierarchical Beat IDs** - IDs follow "X.Y" format
5. **I8: Immutable Structure Versions** - Output is new object, not mutated
6. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- Structure rewriter is stateless - creates new instance per rewrite
- LLM client is injectable for testing
- Response parsing is lenient - missing fields get defaults
- Beat ID renumbering ensures sequential ordering
- Three-act structure is enforced even if LLM returns fewer/more acts
