# STOKERSTAANDCONENR-01: Kernel Data Model & Types

**Status**: PENDING
**Priority**: HIGH (blocks all other kernel tickets)
**Spec Phase**: 1a, 1b, 1c, 1d

## Summary

Create the StoryKernel type system: kernel interface, seed input, evaluation/scoring types, and SavedKernel persistence type. This is the foundational type layer that everything else depends on.

## File List

### New Files
- `src/models/story-kernel.ts` -- StoryKernel, KernelSeedInput, DirectionOfChange, scoring types, type guards, computeKernelOverallScore
- `src/models/saved-kernel.ts` -- SavedKernel, GeneratedKernelBatch, type guards (isSavedKernel, isGeneratedKernelBatch)

### Test Files
- `test/unit/models/story-kernel.test.ts` -- Type guard tests, score computation, threshold checks
- `test/unit/models/saved-kernel.test.ts` -- SavedKernel/GeneratedKernelBatch type guard tests

## Detailed Requirements

### `src/models/story-kernel.ts`

1. `DIRECTION_OF_CHANGE_VALUES` const array: `['POSITIVE', 'NEGATIVE', 'IRONIC', 'AMBIGUOUS']`
2. `DirectionOfChange` type derived from the const array
3. `isDirectionOfChange(value: unknown): value is DirectionOfChange` type guard
4. `StoryKernel` interface with readonly fields:
   - `dramaticThesis: string`
   - `valueAtStake: string`
   - `opposingForce: string`
   - `directionOfChange: DirectionOfChange`
   - `thematicQuestion: string`
5. `isStoryKernel(value: unknown): value is StoryKernel` type guard (uses `isNonEmptyString` helper + `isDirectionOfChange`)
6. `KernelSeedInput` interface: `thematicInterests?: string`, `emotionalCore?: string`, `sparkLine?: string`, `apiKey: string`
7. `KernelDimensionScores` interface with 5 readonly number fields: `dramaticClarity`, `thematicUniversality`, `generativePotential`, `conflictTension`, `emotionalDepth`
8. `KernelScoreEvidence` interface with 5 readonly `string[]` fields (same dimension names)
9. `ScoredKernel` interface: `kernel`, `scores`, `scoreEvidence`, `overallScore`
10. `EvaluatedKernel` interface: `kernel`, `scores`, `overallScore`, `strengths`, `weaknesses`, `tradeoffSummary`
11. `KERNEL_SCORING_WEIGHTS` const: `{ dramaticClarity: 20, thematicUniversality: 15, generativePotential: 25, conflictTension: 25, emotionalDepth: 15 }`
12. `KERNEL_PASS_THRESHOLDS` const: `{ dramaticClarity: 3, thematicUniversality: 2, generativePotential: 3, conflictTension: 3, emotionalDepth: 2 }`
13. `computeKernelOverallScore(scores: KernelDimensionScores): number` function (weighted sum, each dimension scaled to weight/5)

### `src/models/saved-kernel.ts`

Mirror `src/models/saved-concept.ts` pattern:

1. `SavedKernel` interface: `id`, `name`, `createdAt`, `updatedAt`, `seeds: Omit<KernelSeedInput, 'apiKey'>`, `evaluatedKernel: EvaluatedKernel`
2. `GeneratedKernelBatch` interface: `id`, `createdAt`, `seeds: Omit<KernelSeedInput, 'apiKey'>`, `evaluatedKernels: readonly EvaluatedKernel[]`
3. `isSavedKernel(value: unknown): value is SavedKernel` type guard
4. `isGeneratedKernelBatch(value: unknown): value is GeneratedKernelBatch` type guard

## Out of Scope

- Persistence layer (STOKERSTAANDCONENR-02)
- LLM prompts, schemas, generation pipeline (STOKERSTAANDCONENR-03, -04)
- Routes, services, UI (STOKERSTAANDCONENR-05 through -08)
- Concept enrichment changes (STOKERSTAANDCONENR-09, -10)
- Any changes to existing files

## Acceptance Criteria

### Tests That Must Pass
- `isDirectionOfChange` returns true for all 4 valid values, false for invalid strings and non-strings
- `isStoryKernel` returns true for valid kernel objects, false for objects missing any field, false for objects with invalid `directionOfChange`, false for non-objects
- `computeKernelOverallScore` returns correct weighted sum (e.g., all 5s => 100, all 0s => 0, mixed values match hand-calculated result)
- `isSavedKernel` returns true for valid SavedKernel objects, false for missing fields
- `isGeneratedKernelBatch` returns true for valid batches, false for missing fields

### Invariants
- All interfaces use `readonly` fields
- `DIRECTION_OF_CHANGE_VALUES` uses `as const`
- `KERNEL_SCORING_WEIGHTS` values sum to 100
- No imports from `llm/`, `persistence/`, `server/`, or `engine/` directories
- Type guards follow the same pattern as `isConceptSpec` in `concept-generator.ts`
