# STRREWSYS-006: Add Deviation Field to LLM Types

## Summary
Extend LLM-facing type definitions to support deviation-aware continuation generation and structure-rewrite context/result payloads.

## Dependencies
- STRREWSYS-005 must be completed first (deviation detection types in `src/models/story-arc.ts`)

## Assumption Check (Reassessed)

- `src/models/story-arc.ts` already defines and exports `DeviationResult`.
- `src/llm/types.ts` currently does **not** include `ContinuationGenerationResult`, `CompletedBeat`, `StructureRewriteContext`, or `StructureRewriteResult`.
- The repo uses a schema/transformer pipeline (`src/llm/schemas/*`) and does **not** have `src/llm/continuation-generator.ts`; this ticket should stay limited to shared type definitions and unit typing coverage.
- Existing `GenerationResult` field names are already the canonical API (`stateChangesAdded`, `inventoryAdded`, etc.); this ticket must not rename those fields.
- `CompletedBeat` needs `beatId` to align with downstream STRREWSYS tickets (`STRREWSYS-013` merge/preservation logic).

## Files to Touch

### Modified Files
- `src/llm/types.ts`
- `test/unit/llm/types.test.ts`

## Out of Scope
- Do NOT modify prompts (handled in STRREWSYS-007 and STRREWSYS-014)
- Do NOT modify response parsing (handled in STRREWSYS-008)
- Do NOT modify LLM client/runtime generation flow
- Do NOT introduce breaking changes to `GenerationResult`

## Implementation Details

### `src/llm/types.ts` Changes

Add imports:
```typescript
import type { DeviationResult } from '../models/story-arc.js';
```

Add new types:
```typescript
export interface ContinuationGenerationResult extends GenerationResult {
  readonly deviation: DeviationResult;
}

export interface CompletedBeat {
  readonly actIndex: number;
  readonly beatIndex: number;
  readonly beatId: string;
  readonly description: string;
  readonly objective: string;
  readonly resolution: string;
}

export interface StructureRewriteContext {
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: string;
  readonly completedBeats: readonly CompletedBeat[];
  readonly narrativeSummary: string;
  readonly currentActIndex: number;
  readonly currentBeatIndex: number;
  readonly deviationReason: string;
  readonly originalTheme: string;
}

export interface StructureRewriteResult {
  readonly structure: StoryStructure;
  readonly preservedBeatIds: readonly string[];
  readonly rawResponse: string;
}
```

### `test/unit/llm/types.test.ts` Updates

Add/adjust tests for:
```typescript
describe('ContinuationGenerationResult', () => {
  it('extends GenerationResult and accepts NoDeviation');
  it('extends GenerationResult and accepts BeatDeviation');
});

describe('CompletedBeat', () => {
  it('requires act/beat indices, beatId, and resolution data');
});

describe('StructureRewriteContext', () => {
  it('accepts all required fields');
  it('accepts empty completedBeats');
});

describe('StructureRewriteResult', () => {
  it('contains structure, preservedBeatIds, and rawResponse');
});
```

## Acceptance Criteria

### Tests That Must Pass
- `npm test -- test/unit/llm/types.test.ts`
- Relevant unit suite (`npm run test:unit`)

### Invariants That Must Remain True
1. **Backward compatibility** - `GenerationResult` usage remains valid
2. **Type safety** - `ContinuationGenerationResult` extends `GenerationResult` with `deviation`
3. **Immutability contracts** - new collection fields are readonly in interfaces
4. **No parser/client coupling** - this ticket only introduces type-level contracts

## Technical Notes
- Keep this ticket focused on shared type contracts only.
- Runtime parsing/behavior for `deviation` is intentionally deferred to STRREWSYS-008+.

## Status
- [x] Completed

## Outcome

What changed vs originally planned:
- Added all planned STRREWSYS-006 type contracts in `src/llm/types.ts`:
  - `ContinuationGenerationResult`
  - `CompletedBeat` (including `beatId`)
  - `StructureRewriteContext`
  - `StructureRewriteResult`
- Kept `GenerationResult` API shape unchanged to preserve compatibility (no field renames, no breaking changes).
- Updated `test/unit/llm/types.test.ts` to:
  - Add direct coverage for the new type contracts.
  - Correct the existing `GenerationResult` fixture to include all required fields.
- Verified with:
  - `npm test -- test/unit/llm/types.test.ts`
  - `npm run test:unit`
