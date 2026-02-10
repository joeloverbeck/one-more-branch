**Status**: Proposed

# BEACONSCESIGGAT-05: Add optional runtime guardrail for turning_point completion gate mismatches

## Summary
Implement Phase 2 optional safety net in engine: when analyst returns `beatConcluded: true` for a `turning_point` but `completionGateSatisfied: false`, override to non-concluded and emit warning log to prevent premature progression.

## Depends on
- BEACONSCESIGGAT-03

## Blocks
- BEACONSCESIGGAT-06

## File list it expects to touch
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts` (only if integration assertion is added)

## Implementation checklist
1. In continuation flow, detect active beat role before applying progression updates.
2. If active beat role is `turning_point` and analyst payload has:
   - `beatConcluded === true`
   - `completionGateSatisfied === false`
   then force `beatConcluded` to `false` for progression logic.
3. Log a warning with enough context to audit (story/page IDs, beat ID/role, failure reason).
4. Keep behavior unchanged for non-`turning_point` roles unless separately configured.
5. Add unit tests for guardrail trigger and non-trigger paths.

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
- Optional: matching integration assertion in `test/integration/engine/page-service.test.ts`.
- `npm run test:unit -- test/unit/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Existing progression behavior for setup/escalation/resolution beats stays unchanged.
- Writer output and page assembly remain unaffected.
- System stays backward-safe if diagnostics are absent (no crash, conservative behavior).
