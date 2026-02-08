**Status**: ✅ COMPLETED

# WRIANASPL-01: Add WriterResult, AnalystResult, and AnalystContext types

## Summary

Add three new interfaces to `src/llm/types.ts` that define the shapes for the split writer and analyst LLM responses, plus the context object the analyst call needs.

## Files to Touch

- `src/llm/types.ts` — Add `WriterResult`, `AnalystResult`, `AnalystContext` interfaces
- `test/unit/llm/types.test.ts` — Add type-level tests confirming the new interfaces exist and are structurally correct

## Out of Scope

- Do NOT modify `GenerationResult` or `ContinuationGenerationResult` (they remain unchanged)
- Do NOT modify any existing interfaces
- Do NOT add any runtime logic — this ticket is types only
- Do NOT touch any files outside `src/llm/types.ts` and its test
- Do NOT add exports to `src/llm/index.ts` yet (that is WRIANASPL-10)

## Implementation Details

### `WriterResult`

Contains every field from `GenerationResult` **except** `beatConcluded`, `beatResolution`, and the deviation-related fields. Specifically:

```typescript
export interface WriterResult {
  narrative: string;
  choices: string[];
  currentLocation: string;
  threatsAdded: string[];
  threatsRemoved: string[];
  constraintsAdded: string[];
  constraintsRemoved: string[];
  threadsAdded: string[];
  threadsResolved: string[];
  newCanonFacts: string[];
  newCharacterCanonFacts: Record<string, string[]>;
  inventoryAdded: string[];
  inventoryRemoved: string[];
  healthAdded: string[];
  healthRemoved: string[];
  characterStateChangesAdded: Array<{ characterName: string; states: string[] }>;
  characterStateChangesRemoved: Array<{ characterName: string; states: string[] }>;
  protagonistAffect: ProtagonistAffect;
  isEnding: boolean;
  rawResponse: string;
}
```

Import `ProtagonistAffect` from `../models/protagonist-affect.js`.

### `AnalystResult`

```typescript
export interface AnalystResult {
  beatConcluded: boolean;
  beatResolution: string;
  deviationDetected: boolean;
  deviationReason: string;
  invalidatedBeatIds: string[];
  narrativeSummary: string;
  rawResponse: string;
}
```

### `AnalystContext`

```typescript
export interface AnalystContext {
  narrative: string;
  structure: StoryStructure;
  accumulatedStructureState: AccumulatedStructureState;
  activeState: ActiveState;
}
```

Imports needed: `StoryStructure`, `AccumulatedStructureState` from `../models/story-arc.js`, `ActiveState` from `../models/state/index.js`.

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — All types resolve with zero errors
- `test/unit/llm/types.test.ts` — Existing tests still pass; new compile-time assertions for `WriterResult`, `AnalystResult`, `AnalystContext`

### Invariants that must remain true

- `GenerationResult` interface is byte-for-byte unchanged
- `ContinuationGenerationResult` interface is byte-for-byte unchanged
- All other existing interfaces in `types.ts` are unchanged
- All existing tests pass: `npm run test:unit`

## Outcome

- **Completed**: 2026-02-08
- **Commit**: `5845c03` — "Implemented WRIANASPL-01."
- **Changes**: Added `WriterResult`, `AnalystResult`, and `AnalystContext` interfaces to `src/llm/types.ts`; added compile-time type assertions in `test/unit/llm/types.test.ts`
- **Deviations**: None — implemented exactly as specified
- **Verification**: typecheck passes, all unit tests pass
