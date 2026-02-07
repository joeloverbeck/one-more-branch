# STRREWSYS-012: Update Structure Manager for Deviation Support

## Summary
Add helper functions to structure-manager for extracting completed beats and building rewrite context from current state.

## Dependencies
- STRREWSYS-005 (deviation types)
- STRREWSYS-006 (StructureRewriteContext, CompletedBeat types)

## Files to Touch

### Modified Files
- `src/engine/structure-manager.ts`
- `test/unit/engine/structure-manager.test.ts`

## Out of Scope
- Do NOT implement the actual structure rewriting (handled in STRREWSYS-013)
- Do NOT modify page-service.ts (handled in STRREWSYS-011)
- Do NOT modify LLM prompts or parsing

## Implementation Details

### `src/engine/structure-manager.ts` Additions

Add imports:
```typescript
import {
  BeatDeviation,
  DeviationResult,
  isDeviation,
} from '../models/story-arc';
import {
  CompletedBeat,
  StructureRewriteContext,
} from '../llm/types';
import { Story } from '../models/story';
import { VersionedStoryStructure } from '../models/structure-version';
```

Add new functions:
```typescript
/**
 * Extracts completed beats with resolutions from structure state.
 */
export function extractCompletedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): readonly CompletedBeat[] {
  const completedBeats: CompletedBeat[] = [];

  const concludedProgressions = structureState.beatProgressions.filter(
    bp => bp.status === 'concluded'
  );

  for (const progression of concludedProgressions) {
    // Parse beat ID: "1.2" -> actIndex=0, beatIndex=1
    const [actNum, beatNum] = progression.beatId.split('.').map(Number);
    const actIndex = actNum - 1;
    const beatIndex = beatNum - 1;

    const act = structure.acts[actIndex];
    const beat = act?.beats[beatIndex];

    if (!act || !beat) {
      console.warn(`Beat ${progression.beatId} not found in structure`);
      continue;
    }

    completedBeats.push({
      actIndex,
      beatIndex,
      beatId: progression.beatId,
      description: beat.description,
      objective: beat.objective,
      resolution: progression.resolution ?? '',
    });
  }

  // Sort by beat ID for consistent ordering
  completedBeats.sort((a, b) => {
    if (a.actIndex !== b.actIndex) {
      return a.actIndex - b.actIndex;
    }
    return a.beatIndex - b.beatIndex;
  });

  return completedBeats;
}

/**
 * Builds context needed for structure regeneration.
 */
export function buildRewriteContext(
  story: Story,
  structureVersion: VersionedStoryStructure,
  structureState: AccumulatedStructureState,
  deviation: BeatDeviation
): StructureRewriteContext {
  const structure = structureVersion.structure;
  const completedBeats = extractCompletedBeats(structure, structureState);

  return {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    completedBeats,
    narrativeSummary: deviation.narrativeSummary,
    currentActIndex: structureState.currentActIndex,
    currentBeatIndex: structureState.currentBeatIndex,
    deviationReason: deviation.reason,
    originalTheme: structure.overallTheme,
  };
}

/**
 * Gets beat IDs that should be preserved (concluded beats).
 */
export function getPreservedBeatIds(
  structureState: AccumulatedStructureState
): readonly string[] {
  return structureState.beatProgressions
    .filter(bp => bp.status === 'concluded')
    .map(bp => bp.beatId);
}

/**
 * Validates that a new structure preserves all completed beats.
 * Returns true if all completed beats exist unchanged in new structure.
 */
export function validatePreservedBeats(
  originalStructure: StoryStructure,
  newStructure: StoryStructure,
  structureState: AccumulatedStructureState
): boolean {
  const completedBeats = extractCompletedBeats(originalStructure, structureState);

  for (const completed of completedBeats) {
    const newAct = newStructure.acts[completed.actIndex];
    const newBeat = newAct?.beats[completed.beatIndex];

    if (!newBeat) {
      return false;
    }

    // Beat must have same description and objective
    const originalAct = originalStructure.acts[completed.actIndex];
    const originalBeat = originalAct?.beats[completed.beatIndex];

    if (!originalBeat) {
      return false;
    }

    if (
      newBeat.description !== originalBeat.description ||
      newBeat.objective !== originalBeat.objective
    ) {
      return false;
    }
  }

  return true;
}
```

### `test/unit/engine/structure-manager.test.ts` Updates

```typescript
describe('extractCompletedBeats', () => {
  it('should return empty array when no beats concluded');
  it('should return all concluded beats with resolutions');
  it('should preserve beat order by ID');
  it('should include act and beat indices');
  it('should handle missing beats gracefully');
  it('should exclude pending and active beats');
});

describe('buildRewriteContext', () => {
  it('should include all story fields');
  it('should include completed beats from state');
  it('should include deviation reason and summary');
  it('should include original theme');
  it('should include current act/beat indices');
});

describe('getPreservedBeatIds', () => {
  it('should return IDs of concluded beats only');
  it('should return empty array when no concluded beats');
  it('should exclude active and pending beats');
});

describe('validatePreservedBeats', () => {
  it('should return true when all completed beats preserved');
  it('should return false when completed beat is missing');
  it('should return false when completed beat description changed');
  it('should return false when completed beat objective changed');
  it('should return true when new beats added after preserved');
  it('should handle empty completed beats');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/engine/structure-manager.test.ts`
- Run with: `npm test -- test/unit/engine/structure-manager.test.ts`

### Invariants That Must Remain True
1. **I1: Completed Beats Never Modified** - `validatePreservedBeats` enforces this
2. **Beat ordering** - Extracted beats are in chronological order
3. **Complete context** - Rewrite context has all fields needed for regeneration
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- These are helper functions used by page-service and structure-rewriter
- Beat ID format "X.Y" is parsed to get act/beat indices
- Validation is a safeguard, not enforcement (caller decides action)
- Console warnings for missing beats aid debugging without crashing
