# STOARCGEN-023: Engine Stage Attempt Runner Extraction

**Status**: TODO
**Depends on**: STOARCGEN-020
**Blocks**: None

## Summary

Extract a retry-aware engine-stage attempt seam from the long procedural generation pipelines that currently interleave progress events, logging, retry accounting, validation metrics, and domain work in one function body.

The highest-value initial target is `src/engine/reconciliation-retry-pipeline.ts`.

## Reassessed State

What is true in the current code:
- `src/engine/reconciliation-retry-pipeline.ts` repeats the same stage skeleton for planner, accountant, and writer:
  - emit `started`
  - log start
  - measure duration
  - run the stage
  - on error: update metrics, log failure, throw
  - on success: emit `completed`, log completion
- the same file also mixes retry-loop control flow, stage metrics accumulation, and domain transitions in a single long function
- `src/engine/analyst-evaluation.ts` has a different but related orchestration problem: it coordinates parallel stage starts/completions manually
- not every engine pipeline should use the same seam, because some are sequential retry-aware stages and some are parallel best-effort evaluators

The correct conclusion is not “one runner for all engine stages.”
The correct conclusion is:
- sequential retry-aware engine stages need a dedicated extraction
- parallel analyst orchestration likely deserves its own follow-up after that

## Problem

The reconciliation retry pipeline currently centralizes too many responsibilities in one procedural loop.

Concrete risks:
- progress emission, logging, timing, and metrics can drift apart across planner/accountant/writer stages
- adding or changing a retry-aware stage requires copying a large error-handling pattern
- the function is harder to reason about because orchestration policy and domain policy are not clearly separated

## Desired Architecture

Introduce a small engine-specific stage attempt runner for sequential retry-aware stages.

It should own:
- callback `started` / `completed` emission
- logger start / completed / failed entries
- per-attempt duration measurement
- invocation of the stage work

It should leave these concerns with the pipeline:
- retry loop policy
- aggregate metrics accumulation
- reconciliation decisions
- domain-specific stage result composition

Illustrative shape:

```typescript
interface EngineStageAttemptContext {
  readonly publicStage: GenerationStage;
  readonly logStage: string;
  readonly attempt: number;
  readonly onGenerationStage?: GenerationStageCallback;
  readonly logContext: Record<string, unknown>;
}

async function runEngineStageAttempt<T>(
  context: EngineStageAttemptContext,
  work: () => Promise<T>
): Promise<{ result: T; durationMs: number }>
```

## Files to Touch

- `src/engine/reconciliation-retry-pipeline.ts`
- `src/engine/generation-pipeline-helpers.ts` or a dedicated adjacent engine orchestration module if cleaner
- related unit/integration tests covering reconciliation retry behavior

Optional follow-up reference only:
- `src/engine/analyst-evaluation.ts` should be reassessed afterward, but is not part of this ticket unless implementation finds a tiny shared primitive that helps both without widening scope

## Detailed Changes

### 1. Extract the sequential engine-stage attempt seam

Create a helper that encapsulates the repeated planner/accountant/writer attempt skeleton.

Constraints:
- preserve current event ordering
- preserve current log messages and log context
- preserve current duration accounting
- preserve current thrown errors

### 2. Migrate planner, accountant, and writer stages

Use the helper for:
- `PLANNING_PAGE`
- `ACCOUNTING_STATE`
- writer stage returned by `resolveWriterStage(mode)`

Do not force the reconciler stage into the helper if its success/degradation semantics still differ materially.

### 3. Keep aggregate metrics in the pipeline

The helper should return timing data.
The pipeline should remain responsible for:
- accumulated duration totals
- validation issue counts
- retry state
- final metrics construction

## Out of Scope

- Analyst parallel evaluation orchestration
- Story preparation parallel stage orchestration
- LLM transport changes
- Route progress persistence changes
- New stage IDs or UI changes

## Acceptance Criteria

### Functional

- Planner, accountant, and writer attempt execution no longer duplicate the same lifecycle skeleton inline
- Progress event ordering and logger output remain behaviorally unchanged
- Retry metrics and validation metrics remain unchanged
- Reconciler behavior remains unchanged

### Tests that should pass or be added

- Add or update focused unit coverage for the extracted engine-stage attempt helper
- Update reconciliation retry pipeline tests to verify stage ordering and metrics remain unchanged
- Keep or strengthen integration coverage around page generation flows that exercise reconciliation retry
- `npm run typecheck` passes
- `npm run lint` passes

## Why This Is Better Architecture

This isolates one real engine orchestration pattern without pretending the whole engine has one universal stage model.

It is cleaner:
- sequential retry-aware stage mechanics move out of the domain-heavy loop

It is more robust:
- planner/accountant/writer cannot quietly drift on logging or progress semantics

It is more extensible:
- future retry-aware engine stages can reuse the same attempt seam without copying a long error-handling block
