**Status**: ✅ COMPLETED

# BEACONSCESIGGAT-05: Add optional runtime guardrail for turning_point completion gate mismatches

## Summary
Implement the Phase 2 runtime safety net in engine: when analyst returns `beatConcluded: true` for an active `turning_point` but `completionGateSatisfied: false`, override to non-concluded and emit a warning log to prevent premature progression.

## Reassessed assumptions (2026-02-10)
- `AnalystResult` already contains completion-gate diagnostics (`completionGateSatisfied`, `completionGateFailureReason`, scene-signal fields).
- `mergeWriterAndAnalystResults()` does not carry completion-gate diagnostics into `ContinuationGenerationResult`; guardrail logic must read raw `analystResult` in `page-service` unless merger/types are expanded.
- Existing integration tests already cover prompt/schema-level completion-gate behavior in `test/integration/engine/page-service.test.ts`; this ticket is runtime engine enforcement.
- Unit `buildStructure()` in `test/unit/engine/page-service.test.ts` starts at `setup`, so turning-point guardrail tests need a dedicated fixture with active beat role `turning_point`.

## Depends on
- BEACONSCESIGGAT-03

## Blocks
- BEACONSCESIGGAT-06

## File list it expects to touch
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts` (no required changes; optional runtime assertion only if needed)

## Implementation checklist
1. In continuation flow, detect active beat role from active structure + parent structure state before applying progression updates.
2. If active beat role is `turning_point` and analyst payload has:
   - `beatConcluded === true`
   - `completionGateSatisfied === false`
   then force `beatConcluded` to `false` for progression logic.
3. Log a warning with enough context to audit (story/page IDs, beat ID/role, failure reason).
4. Keep behavior unchanged for non-`turning_point` roles.
5. Add/adjust unit tests for guardrail trigger and non-trigger paths.

## Out of scope
- Do not apply guardrail to all beat roles in this ticket.
- Do not add new persisted fields or telemetry sinks.
- Do not modify LLM prompt/schema definitions.
- Do not change structure rewriting policy.

## Acceptance criteria

### Specific tests that must pass
- `test/unit/engine/page-service.test.ts`
  - Guardrail test: turning_point + concluded + gate-failed => progression not advanced.
  - Guardrail test: warning logger called with failure context.
  - Non-turning-point control test: same gate-failed payload does not trigger override.
  - Gate-satisfied turning_point control test: progression still advances.
- `npm run test:unit -- test/unit/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing progression behavior for setup/escalation/resolution beats stays unchanged.
- Writer output and page assembly remain unaffected.
- Runtime enforcement is deterministic for `turning_point` beats when diagnostics are present.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Added runtime guardrail in `src/engine/page-service.ts` that checks the active beat role and forces `beatConcluded=false` when:
    - role is `turning_point`
    - analyst returned `beatConcluded=true`
    - analyst returned `completionGateSatisfied=false`
  - Added warning log with audit context (`storyId`, `parentPageId`, `beatId`, `beatRole`, `completionGateFailureReason`).
  - Added focused unit tests in `test/unit/engine/page-service.test.ts` for:
    - guardrail trigger path
    - non-turning-point control path
    - gate-satisfied turning-point control path
- Deviations from original plan:
  - No integration test edits were required because existing integration coverage already exercises completion-gate semantics; this ticket stayed scoped to runtime enforcement.
  - Guardrail reads raw `analystResult` in `page-service` (instead of merged continuation result) because completion-gate diagnostics are not currently propagated by `mergeWriterAndAnalystResults()`.
- Verification:
  - `npm run test:unit -- test/unit/engine/page-service.test.ts` (pass; jest executed all unit suites under current script behavior, all passed)
  - `npm run typecheck` (pass)
