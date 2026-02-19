# STOKERSTAANDCONENR-04: Kernel Evaluator & Stage Runner

**Status**: PENDING
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01, STOKERSTAANDCONENR-03
**Spec Phase**: 3b, 3c

## Summary

Create the kernel evaluator (two-phase LLM evaluation of generated kernels) and the stage runner that orchestrates ideator -> evaluator. Also register new generation stages.

## File List

### New Files
- `src/llm/prompts/kernel-evaluator-prompt.ts` -- Evaluator prompt builder
- `src/llm/schemas/kernel-evaluator-schema.ts` -- Evaluator JSON schema
- `src/llm/kernel-evaluator.ts` -- Evaluation function
- `src/llm/kernel-stage-runner.ts` -- Pipeline orchestration (ideator -> evaluator)

### Modified Files
- `src/engine/types.ts` -- Add `'GENERATING_KERNELS'` and `'EVALUATING_KERNELS'` to `GENERATION_STAGES`

### Test Files
- `test/unit/llm/kernel-evaluator.test.ts` -- Prompt construction, scoring validation
- `test/unit/llm/kernel-stage-runner.test.ts` -- Pipeline orchestration with mocked ideator/evaluator

## Detailed Requirements

### `src/engine/types.ts` modification

Add two new entries to `GENERATION_STAGES` array:
- `'GENERATING_KERNELS'`
- `'EVALUATING_KERNELS'`

Place them before the existing concept stages for logical ordering.

### `src/llm/schemas/kernel-evaluator-schema.ts`

Two-phase schema (mirror concept evaluator pattern):

**Phase 1 (Scoring)**: Array of scored kernels, each with:
- `scores`: object with 5 dimension scores (numbers 0-5)
- `scoreEvidence`: object with 5 dimension evidence arrays (string[])

**Phase 2 (Deep evaluation)**: Array of evaluated kernels, each with:
- `strengths`: string[] (2-3 items)
- `weaknesses`: string[] (2-3 items)
- `tradeoffSummary`: string

Export schema(s) and response type(s).

### `src/llm/prompts/kernel-evaluator-prompt.ts`

`buildKernelEvaluatorPrompt(kernels: readonly StoryKernel[]): { system: string; user: string }`

**System message** must include:
- Role: narrative theory evaluator
- 5-dimension scoring rubric with 0-5 scale descriptions from spec section 3b
- Instructions to score ALL kernels, not just top N
- Evidence requirement for each score

**User message**: Serialized kernel data for evaluation.

### `src/llm/kernel-evaluator.ts`

`evaluateKernels(kernels: readonly StoryKernel[], apiKey: string): Promise<KernelEvaluationResult>`

Where `KernelEvaluationResult = { scoredKernels: readonly ScoredKernel[]; evaluatedKernels: readonly EvaluatedKernel[]; rawResponse: string }`

Two-phase evaluation (mirror concept evaluator):
1. Phase 1: Score all kernels -> get ScoredKernel[]
2. Phase 2: Deep evaluate all kernels -> get EvaluatedKernel[]
3. Compute `overallScore` via `computeKernelOverallScore` for each

### `src/llm/kernel-stage-runner.ts`

`runKernelStage(input: KernelSeedInput, onStage?: GenerationStageCallback): Promise<KernelStageResult>`

Where `KernelStageResult = { evaluatedKernels: readonly EvaluatedKernel[]; rawIdeatorResponse: string; rawEvaluatorResponse: string }`

Orchestration:
1. Fire `GENERATING_KERNELS` stage started
2. Call `generateKernels`
3. Fire `GENERATING_KERNELS` stage completed
4. Fire `EVALUATING_KERNELS` stage started
5. Call `evaluateKernels`
6. Fire `EVALUATING_KERNELS` stage completed
7. Return ALL evaluated kernels (not filtered)

## Out of Scope

- Kernel persistence (STOKERSTAANDCONENR-02)
- Routes, services, UI (STOKERSTAANDCONENR-05 through -08)
- Concept changes (STOKERSTAANDCONENR-09, -10)
- Prompt documentation (STOKERSTAANDCONENR-11)
- Changes to existing concept evaluator or concept stage runner

## Acceptance Criteria

### Tests That Must Pass
- `GENERATION_STAGES` includes `'GENERATING_KERNELS'` and `'EVALUATING_KERNELS'`
- `GenerationStage` type accepts the new stage values
- Evaluator prompt includes 5-dimension scoring rubric
- Evaluator prompt includes evidence requirement
- `evaluateKernels` computes overallScore using `computeKernelOverallScore`
- `evaluateKernels` returns ALL kernels evaluated, not a subset
- `runKernelStage` calls ideator then evaluator in sequence
- `runKernelStage` fires stage callbacks in correct order (started/completed for each stage)
- `runKernelStage` passes apiKey through to both LLM calls
- Stage runner returns all evaluated kernels without filtering

### Invariants
- Stage callback order: GENERATING_KERNELS started -> completed -> EVALUATING_KERNELS started -> completed
- All kernels are evaluated (no top-N filtering)
- `overallScore` is computed server-side via `computeKernelOverallScore`, not trusted from LLM
- Existing `GENERATION_STAGES` entries remain unchanged in value
- Existing concept pipeline is unaffected
