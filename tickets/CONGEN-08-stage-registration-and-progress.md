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

## Architecture Note

- CONGEN-02 introduced `concept-ideator` internals (`src/llm/concept-ideator.ts`, prompt, schema) and stage-model support for `conceptIdeator`, but intentionally did **not** add LLM barrel/client orchestration exports.
- In this ticket pass, keep that boundary explicit: add concept-stage exports/wiring only when the concept-generation service/orchestration is ready in the same pass, so partial public API exposure does not drift ahead of runtime integration.
- Preferred direction (no compatibility aliases): export only canonical stage modules and update all call sites directly during orchestration cutover.
- CONGEN-05 implemented route-level progress lifecycle for concept endpoints using existing `'new-story'` flow as an interim state.
- In this ticket, perform a **clean cutover** to canonical concept progress primitives:
  - Add `'concept-generation'` flow type and use it directly in concept routes.
  - Add concept stage literals and emit them from concept routes/service flow.
  - Remove interim `'new-story'` usage for concept endpoints in the same pass.
  - Do not introduce backward-compat aliases or dual-write behavior.

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

### 4. Route Cutover Requirement (from CONGEN-05 interim implementation)

Update concept endpoints in `src/server/routes/stories.ts`:

- `POST /stories/generate-concepts`
- `POST /stories/stress-test-concept`

Required cutover behavior:

- Start progress with `'concept-generation'` (not `'new-story'`).
- Emit concept-specific stage events (`GENERATING_CONCEPTS`, `EVALUATING_CONCEPTS`, `STRESS_TESTING_CONCEPT`) as appropriate.
- Preserve existing error contract and progress fail semantics.

## Acceptance Criteria

### Tests That Must Pass

1. **`GENERATION_STAGES` includes new stages**: Array contains `'GENERATING_CONCEPTS'`, `'EVALUATING_CONCEPTS'`, `'STRESS_TESTING_CONCEPT'`
2. **`GenerationStage` type accepts new values**: TypeScript compilation passes with new stage values
3. **`getStageModel` accepts new stage names**: `getStageModel('conceptIdeator')` returns default model without error
4. **Progress service accepts new flow type**: `generationProgressService.start('test', 'concept-generation')` works
5. **Existing generation stages still work**: All current stage values remain valid
6. **Concept routes use concept-generation flow**: No `'new-story'` progress lifecycle usage remains for concept endpoints
7. **Concept routes emit concept stage names**: Progress snapshots reflect concept-specific stages during concept generation/stress-test

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- **All existing tests pass** — this is the critical invariant since we're modifying shared type definitions
- Existing `GenerationStage` values remain valid (no removals, no reordering)
- Existing `LlmStage` values remain valid
- Existing `GenerationFlowType` values remain valid
- `getStageModel()` fallback behavior unchanged for existing stages
