# CONGEN-08: Stage Registration and Progress Tracking

**Status**: PENDING
**Depends on**: CONGEN-01
**Blocks**: CONGEN-06

## Summary

Register the 3 new concept generation stages in the engine's type system and stage-model configuration, and add a new progress flow type for concept generation.

## Files to Create

- None

## Files to Touch

- `src/engine/types.ts` — Add 3 new stages to `GENERATION_STAGES` array
- `src/config/stage-model.ts` — Add 3 new stages to `LlmStage` union type
- `src/server/services/generation-progress.ts` — Add `'concept-generation'` to `GenerationFlowType`

## Out of Scope

- Client-side stage phrase pools and display names (CONGEN-06)
- LLM generators, prompts, schemas (CONGEN-02, 03, 04)
- Route handlers (CONGEN-05)
- UI changes (CONGEN-06, CONGEN-07)

## Work Description

### 1. Generation Stages (`src/engine/types.ts`)

Add to `GENERATION_STAGES` array:
```typescript
'GENERATING_CONCEPTS',
'EVALUATING_CONCEPTS',
'STRESS_TESTING_CONCEPT',
```

These must be added to the array (which is `as const`), making them valid `GenerationStage` values. Place them at the end of the array to avoid disrupting existing stage indices.

### 2. LLM Stage Model (`src/config/stage-model.ts`)

Add to `LlmStage` union type:
```typescript
| 'conceptIdeator'
| 'conceptEvaluator'
| 'conceptStressTester'
```

This allows per-stage model selection via `getStageModel()`. The default model fallback (`config.llm.defaultModel`) applies when no stage-specific model is configured.

### 3. Progress Flow Type (`src/server/services/generation-progress.ts`)

Add `'concept-generation'` to `GenerationFlowType`:
```typescript
export type GenerationFlowType = 'new-story' | 'choice' | 'begin-adventure' | 'concept-generation';
```

This allows the concept service to start a progress record with `generationProgressService.start(progressId, 'concept-generation')`.

## Acceptance Criteria

### Tests That Must Pass

1. **`GENERATION_STAGES` includes new stages**: Array contains `'GENERATING_CONCEPTS'`, `'EVALUATING_CONCEPTS'`, `'STRESS_TESTING_CONCEPT'`
2. **`GenerationStage` type accepts new values**: TypeScript compilation passes with new stage values
3. **`getStageModel` accepts new stage names**: `getStageModel('conceptIdeator')` returns default model without error
4. **Progress service accepts new flow type**: `generationProgressService.start('test', 'concept-generation')` works
5. **Existing generation stages still work**: All current stage values remain valid

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- **All existing tests pass** — this is the critical invariant since we're modifying shared type definitions
- Existing `GenerationStage` values remain valid (no removals, no reordering)
- Existing `LlmStage` values remain valid
- Existing `GenerationFlowType` values remain valid
- `getStageModel()` fallback behavior unchanged for existing stages
