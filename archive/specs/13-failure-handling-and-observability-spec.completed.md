**Status**: ✅ COMPLETED

# Spec 13: Failure Handling and Observability for Planner/Writer/Reconciler

## Objective

Add explicit failure semantics and metrics for the three-step generation pipeline from day one.

## Required Runtime Behavior

## Retry model

1. Planner failure: retry via existing retry wrapper.
2. Writer failure: retry via existing retry wrapper.
3. Reconciler failure: one explicit pipeline retry with failure reasons fed back into planner/writer prompts.
4. If second reconciler attempt fails: return hard error and abort page generation.

## Hard Error Conditions

1. Unknown remove/resolve IDs.
2. Duplicate or contradictory final-state outcomes.
3. Evidence gate failure for required intents.
4. Cross-field consistency failure (state/canon violations).

## Observability Data Model

Add `GenerationPipelineMetrics` type in `src/llm/types.ts` or `src/engine/types.ts`:

- `plannerDurationMs`
- `writerDurationMs`
- `reconcilerDurationMs`
- `plannerValidationIssueCount`
- `writerValidationIssueCount`
- `reconcilerIssueCount`
- `reconcilerRetried` (boolean)
- `finalStatus` (`success` | `hard_error`)

## Logging Requirements

Use structured logs at each stage with `storyId`, `pageId`, `requestId`:

1. Planner started/completed/failed.
2. Writer started/completed/failed.
3. Reconciler started/completed/failed, including rule-key counters.
4. Retry attempt reason payload.
5. Hard failure payload for user-safe error surface and internal diagnostics.

## Existing Files to Update

- `src/engine/page-service.ts`
- `src/logging/*` (if helper additions needed)
- `src/llm/writer-generation.ts` (align counter format with planner/reconciler)
- `src/llm/client.ts` (propagate observability context)

## User-Facing Error Contract

Add/extend engine error code (example):

- `GENERATION_RECONCILIATION_FAILED`

Error payload must include:

- high-level message
- retry attempted flag
- compact list of reconciliation issue codes

## Acceptance Criteria

1. All three steps emit structured metrics and lifecycle logs.
2. Reconciler retry path runs exactly once.
3. Hard failure returns deterministic error code and diagnostics.
4. Integration tests assert both success and hard-fail pipelines.

## Required Tests

1. Unit: metrics aggregation and durations.
2. Unit: retry-once control flow.
3. Integration: forced reconciler failures produce hard error with expected code.
4. Integration: successful generation includes all stage logs/metrics.
