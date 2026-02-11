# PAGWRISPE-06: Wire Engine to Plan-Guided Writer + Reconciler Boundary
**Status**: ✅ COMPLETED

## Summary
Update page-service continuation orchestration to use the plan-aware writer API boundary (`generatePageWriterOutput`) while preserving current runtime compatibility. Full deterministic reconciler behavior remains deferred to Spec 11 implementation tickets.

## Assumptions Reassessment (2026-02-11)
1. `src/engine/page-service.ts` already calls planner before writer for opening and continuation flows, and already propagates observability IDs.
2. `src/llm/client.ts` already exports `generatePageWriterOutput(context, plan, options)` as the plan-aware writer API from Ticket 05.
3. There is currently no implemented reconciler module from `specs/11-deterministic-state-reconciler-spec.md` (`state-reconciler.ts` and related types/errors are absent).
4. `src/engine/page-builder.ts` and current engine tests still rely on legacy `WriterResult` compatibility fields for state/canon deltas.
5. Because Spec 11 reconciler internals are not yet implemented, this ticket cannot safely enforce planner-intent-only state mutation without introducing broader behavioral and test-surface changes outside approved scope.

## Updated scope
- Switch continuation generation in `page-service` to call `generatePageWriterOutput(context, plan, options)` instead of directly calling `generateWriterPage`.
- Preserve existing page assembly and canon update behavior (legacy `WriterResult` compatibility path remains unchanged).
- Keep planner-before-writer ordering and observability ID behavior intact.
- Update impacted unit/integration tests to assert the new API boundary call shape.

## File list it expects to touch (updated)
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`
- `test/integration/engine/replay.test.ts`

## Implementation checklist
1. Replace continuation writer invocation in `generateNextPage()` with `generatePageWriterOutput(continuationContext, pagePlan, options)`.
2. Preserve existing writer validation context and observability options for non-breaking behavior.
3. Update test mocks/imports from `generateWriterPage` to `generatePageWriterOutput` where continuation flow is under test.
4. Keep planner-before-writer call ordering assertions passing under the new API call.

## Out of scope
- Do not implement `state-reconciler` internals from Spec 11 in this ticket.
- Do not change `page-builder` accumulation semantics in this ticket.
- Do not remove legacy compatibility fields from `WriterResult`.
- Do not alter persistence schema or route behavior.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner executes before writer in opening and continuation flows.
- Request observability IDs remain present and correlated through planner + writer calls.
- Public `page-service` function signatures remain unchanged.
- Deterministic replay and branch isolation behavior remain unchanged.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - `src/engine/page-service.ts` continuation generation now calls `generatePageWriterOutput(continuationContext, pagePlan, options)` instead of directly calling `generateWriterPage`.
  - Existing observability and writer validation context were preserved.
  - Tests in `test/unit/engine/page-service.test.ts`, `test/integration/engine/page-service.test.ts`, and `test/integration/engine/replay.test.ts` were updated to use the plan-aware writer API boundary and its 3-argument call shape.
- Deviations from originally drafted plan:
  - Full reconciler-boundary enforcement was not implemented because Spec 11 reconciler modules are not yet present; ticket scope was corrected first to a non-breaking boundary wiring change.
  - No `page-builder` state application behavior was changed in this ticket.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/replay.test.ts` passed.
  - `npm run typecheck` passed.
