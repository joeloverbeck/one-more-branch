**Status**: ✅ COMPLETED

# FAIHANANDOBSSPE-01: Introduce `GenerationPipelineMetrics` Contract and Result Plumbing

## Summary
Add the canonical metrics type required by Spec 13 and thread it through the page-generation result contract so downstream orchestration can populate and emit it consistently.

## Depends on
- `specs/08-writing-prompts-split-architecture.md`

## Blocks
- `tickets/FAIHANANDOBSSPE-02-page-service-stage-lifecycle-and-retry-observability.md`
- `tickets/FAIHANANDOBSSPE-05-integration-observability-and-hard-failure-coverage.md`

## File list it expects to touch
- `src/llm/types.ts`
- `src/llm/index.ts`
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`
- `test/unit/llm/types.test.ts`
- `test/unit/llm/result-merger.test.ts`

## Implementation checklist
1. Add `GenerationPipelineMetrics` with required fields:
   - `plannerDurationMs`
   - `writerDurationMs`
   - `reconcilerDurationMs`
   - `plannerValidationIssueCount`
   - `writerValidationIssueCount`
   - `reconcilerIssueCount`
   - `reconcilerRetried`
   - `finalStatus` (`success` | `hard_error`)
2. Define where the canonical type lives (`src/llm/types.ts` or `src/engine/types.ts`) and re-export from the other module if needed to avoid duplicate definitions.
3. Add a generation result-level field (engine-facing contract) for metrics so `generateFirstPage()` and `generateNextPage()` can return/forward structured metrics without loose dictionaries. Keep this additive/backward-compatible.
4. Keep current return payload backward-compatible unless explicitly required by Spec 13 follow-up tickets.
5. Add/adjust focused unit tests for type-safe metrics presence and shape.

## Out of scope
- Emitting lifecycle logs.
- Implementing retry control flow changes.
- Mapping hard failures to new error codes.
- Server route JSON response changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/result-merger.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Spec 08 pipeline contract remains intact: planner -> writer -> reconciler for opening and continuation.
- No legacy writer-only fallback path is introduced.
- Existing `ContinuationGenerationResult`/engine flow remains replay-safe and branch-isolation behavior is unchanged.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added canonical `GenerationPipelineMetrics` type in `src/llm/types.ts` and exported it via `src/llm/index.ts`.
  - Added backward-compatible metrics plumbing in `src/engine/page-service.ts` so `generateFirstPage()`, `generateNextPage()`, and `getOrGeneratePage()` can return structured metrics.
  - Added/updated unit tests for metrics contract shape and page-service metrics propagation.
- Deviations from original plan:
  - `src/engine/types.ts` and `test/unit/llm/client.test.ts` were not touched; assumptions were corrected to the current architecture and active test coverage points.
  - No lifecycle logging or duration capture implementation was added in this ticket; durations and validation counters are contract-plumbed with placeholder values (`0`) for now.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts test/unit/llm/types.test.ts test/unit/llm/result-merger.test.ts`
  - `npm run typecheck`
