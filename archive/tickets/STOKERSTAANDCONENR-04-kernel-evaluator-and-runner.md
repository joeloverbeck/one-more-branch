# STOKERSTAANDCONENR-04: Kernel Evaluator & Stage Runner

**Status**: COMPLETED
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-01, STOKERSTAANDCONENR-03
**Spec Phase**: 3b, 3c

## Summary

Create the kernel evaluator (two-phase LLM evaluation of generated kernels) and a thin kernel stage runner that orchestrates ideator -> evaluator. Register new generation stages.

## Assumption Reassessment (2026-02-19)

- `src/models/story-kernel.ts` already exists and already includes kernel score/evaluation types plus `computeKernelOverallScore`.
- `src/models/saved-kernel.ts` and `src/persistence/kernel-repository.ts` already exist (from earlier tickets), so they are out of scope here.
- The spec references `src/llm/concept-stage-runner.ts`, but this codebase currently has no concept stage runner file; concept orchestration is performed in `src/server/services/concept-service.ts`.
- `src/server/services/kernel-service.ts` does not exist yet and is planned in STOKERSTAANDCONENR-05, so this ticket stays focused on LLM-layer evaluator + runner and stage typing.

## Architecture Decision

- `kernel-evaluator.ts` owns evaluation correctness (parsing, exact coverage checks, score computation).
- `kernel-stage-runner.ts` remains a thin composition layer that emits progress callbacks and composes ideator/evaluator.
- Persistence, routing, and API validation remain in later tickets.

This keeps the LLM pipeline reusable, testable in isolation, and avoids coupling runner logic to HTTP/service concerns.

## File List

### New Files
- `src/llm/prompts/kernel-evaluator-prompt.ts` -- Evaluator prompt builders (scoring + deep evaluation)
- `src/llm/schemas/kernel-evaluator-schema.ts` -- Evaluator JSON schemas
- `src/llm/kernel-evaluator.ts` -- Evaluation function
- `src/llm/kernel-stage-runner.ts` -- Pipeline orchestration (ideator -> evaluator)

### Modified Files
- `src/engine/types.ts` -- Add `'GENERATING_KERNELS'` and `'EVALUATING_KERNELS'` to `GENERATION_STAGES`

### Test Files
- `test/unit/llm/kernel-evaluator.test.ts` -- Prompt construction, scoring/deep parsing, coverage validation
- `test/unit/llm/kernel-stage-runner.test.ts` -- Pipeline orchestration with mocked ideator/evaluator
- `test/unit/engine/types.test.ts` -- Stage enum/type ordering expectations

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

Export both schemas and keep field contracts strict.

### `src/llm/prompts/kernel-evaluator-prompt.ts`

Export two prompt builders mirroring concept evaluator phases:

- `buildKernelEvaluatorScoringPrompt(context: KernelEvaluatorContext): ChatMessage[]`
- `buildKernelEvaluatorDeepEvalPrompt(context: KernelEvaluatorContext, scoredKernels: readonly ScoredKernel[]): ChatMessage[]`

**Scoring system prompt** must include:
- Role: narrative theory evaluator
- 5-dimension scoring rubric with explicit 0-5 anchors from spec section 3b
- Instructions to score ALL kernels, not just top N
- Evidence requirement for each score
- Instruction not to compute weighted totals in-model

**Deep-eval system prompt** must include:
- Evaluate all provided kernels
- Do not rescore and do not alter kernels
- Produce strengths, weaknesses, and tradeoff summary per kernel

### `src/llm/kernel-evaluator.ts`

`evaluateKernels(context: KernelEvaluatorContext, apiKey: string, options?: Partial<GenerationOptions>): Promise<KernelEvaluationResult>`

Where `KernelEvaluationResult = { scoredKernels: readonly ScoredKernel[]; evaluatedKernels: readonly EvaluatedKernel[]; rawResponse: string }`

Two-phase evaluation:
1. Phase 1: Score all kernels -> get `ScoredKernel[]`
2. Phase 2: Deep evaluate all kernels -> get `EvaluatedKernel[]`
3. Compute `overallScore` via `computeKernelOverallScore` for each scored kernel server-side
4. Validate exact kernel coverage in both phases (no missing/extra kernels)
5. Return all evaluated kernels sorted by `overallScore` descending for stable downstream behavior

### `src/llm/kernel-stage-runner.ts`

`runKernelStage(input: KernelSeedInput, onStage?: GenerationStageCallback, deps?: KernelStageRunnerDeps): Promise<KernelStageResult>`

Where `KernelStageResult = { ideatedKernels: readonly StoryKernel[]; scoredKernels: readonly ScoredKernel[]; evaluatedKernels: readonly EvaluatedKernel[]; rawIdeatorResponse: string; rawEvaluatorResponse: string }`

Orchestration:
1. Fire `GENERATING_KERNELS` stage started
2. Call `generateKernels`
3. Fire `GENERATING_KERNELS` stage completed
4. Fire `EVALUATING_KERNELS` stage started
5. Call `evaluateKernels`
6. Fire `EVALUATING_KERNELS` stage completed
7. Return all evaluated kernels (not filtered)

## Out of Scope

- Kernel persistence (already delivered in STOKERSTAANDCONENR-02)
- Routes, services, UI (STOKERSTAANDCONENR-05 through -08)
- Concept changes (STOKERSTAANDCONENR-09, -10)
- Prompt documentation (STOKERSTAANDCONENR-11)
- Broad concept pipeline refactors (for example introducing a shared generic stage orchestrator across concept/kernel)

## Acceptance Criteria

### Tests That Must Pass
- `GENERATION_STAGES` includes `'GENERATING_KERNELS'` and `'EVALUATING_KERNELS'`
- `GenerationStage` type accepts the new stage values
- Evaluator scoring prompt includes 5-dimension scoring rubric with 0-5 anchors
- Evaluator prompts include evidence requirements and no-filtering instructions
- `evaluateKernels` computes `overallScore` using `computeKernelOverallScore`
- `evaluateKernels` returns ALL kernels evaluated, not a subset
- `evaluateKernels` rejects responses that omit/add kernels versus requested set
- `runKernelStage` calls ideator then evaluator in sequence
- `runKernelStage` fires stage callbacks in correct order (started/completed for each stage)
- `runKernelStage` passes `apiKey` through to both LLM calls
- Stage runner returns all evaluated kernels without filtering

## Invariants

- Stage callback order: `GENERATING_KERNELS` started -> completed -> `EVALUATING_KERNELS` started -> completed
- All kernels are evaluated (no top-N filtering)
- `overallScore` is computed server-side via `computeKernelOverallScore`, not trusted from LLM
- Existing `GENERATION_STAGES` entries remain unchanged in value
- Existing concept pipeline behavior is unaffected

## Outcome

- **Completion date**: 2026-02-19
- **Implemented changes**:
- Added kernel evaluator prompt/schema/evaluator modules with two-phase scoring + deep evaluation.
- Added kernel stage runner orchestration with deterministic stage callbacks and dependency injection for testability.
- Added `GENERATING_KERNELS` and `EVALUATING_KERNELS` to engine generation stages.
- Added/updated unit coverage for evaluator, runner, engine stage list, stage-model config, and prompt logging prompt types.
- Added `kernelEvaluator` as a first-class LLM stage/prompt/config key and wired default model config.
- **Deviations vs original plan**:
- Instead of a single `buildKernelEvaluatorPrompt`, implementation follows the existing concept architecture with separate scoring/deep prompt builders.
- Ticket scope remained LLM-layer only; persistence/service/routes stayed deferred to STOKERSTAANDCONENR-05+ as intended after reassessment.
- **Verification**:
- `npm test` passed.
- `npm run lint` passed.
- `npm run typecheck` passed.
