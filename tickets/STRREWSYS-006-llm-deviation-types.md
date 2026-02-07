# STRREWSYS-006: Add Deviation Field to LLM Types

## Summary
Extend the LLM generation result types to include deviation detection output, and add context types needed for structure rewriting.

## Dependencies
- STRREWSYS-005 must be completed first (deviation detection types)

## Files to Touch

### Modified Files
- `src/llm/types.ts`
- `test/unit/llm/types.test.ts`

## Out of Scope
- Do NOT modify prompts (handled in STRREWSYS-007)
- Do NOT modify response parsing (handled in STRREWSYS-008)
- Do NOT modify LLM client or generators
- Do NOT modify GenerationResult (it's for opening pages, continuation is different)

## Implementation Details

### `src/llm/types.ts` Changes

Add imports:
```typescript
import type { DeviationResult } from '../models/story-arc.js';
```

Add new types after existing types:
```typescript
/**
 * Extended generation result for continuation pages including deviation detection.
 */
export interface ContinuationGenerationResult extends GenerationResult {
  /** Deviation detection result from LLM evaluation */
  readonly deviation: DeviationResult;
}

/**
 * A completed beat with its resolution for rewrite context.
 */
export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly description: string;
  readonly objective: string;
  readonly resolution: string;
}

/**
 * Context for structure regeneration.
 */
export interface StructureRewriteContext {
  /** Original character concept */
  readonly characterConcept: string;

  /** Original worldbuilding */
  readonly worldbuilding: string;

  /** Original tone */
  readonly tone: string;

  /** Completed beats with their resolutions */
  readonly completedBeats: readonly CompletedBeat[];

  /** Current narrative state summary */
  readonly narrativeSummary: string;

  /** Current act index where deviation occurred */
  readonly currentActIndex: number;

  /** Current beat index where deviation occurred */
  readonly currentBeatIndex: number;

  /** Reason for the rewrite */
  readonly deviationReason: string;

  /** Overall theme from original structure (to maintain thematic coherence) */
  readonly originalTheme: string;
}

/**
 * Result of structure regeneration.
 */
export interface StructureRewriteResult {
  /** The regenerated structure (includes preserved + new beats) */
  readonly structure: StoryStructure;

  /** Beat IDs that were preserved from original */
  readonly preservedBeatIds: readonly string[];

  /** Raw LLM response for debugging */
  readonly rawResponse: string;
}
```

Update `GenerationResult` to be extensible:
```typescript
export interface GenerationResult {
  narrative: string;
  choices: string[];
  stateChangesAdded: string[];
  stateChangesRemoved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
  isEnding: boolean;
  beatConcluded: boolean;
  beatResolution: string;
  rawResponse: string;
}
```

### `test/unit/llm/types.test.ts` Updates

Add tests:
```typescript
describe('ContinuationGenerationResult', () => {
  it('should extend GenerationResult with deviation field');
  it('should accept NoDeviation');
  it('should accept BeatDeviation');
});

describe('CompletedBeat', () => {
  it('should have all required fields');
});

describe('StructureRewriteContext', () => {
  it('should have all required fields');
  it('should accept empty completedBeats array');
});

describe('StructureRewriteResult', () => {
  it('should have structure and preservedBeatIds');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `test/unit/llm/types.test.ts` - all existing and new tests pass
- Run with: `npm test -- test/unit/llm/types.test.ts`

### Invariants That Must Remain True
1. **Backward compatibility** - `GenerationResult` still works as before
2. **Type safety** - `ContinuationGenerationResult` properly extends `GenerationResult`
3. **Immutability** - All arrays are readonly
4. **Existing tests pass** - `npm run test:unit` passes

## Technical Notes
- `ContinuationGenerationResult` is used for continuation page generation
- `GenerationResult` is still used for opening page generation (no deviation possible)
- `StructureRewriteContext` is built from story + deviation in structure-rewriter
- These are pure type definitions - no implementation logic here
