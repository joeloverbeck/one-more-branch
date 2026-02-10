**Status**: ✅ COMPLETED

# BEACONSCESIGGAT-04: Add false-positive regression and cross-domain analyst gating tests

## Summary
Add targeted integration-style tests that exercise the new gating contract in realistic mocked analyst flows: one action-heavy false-positive repro, one true-positive turning-point completion, and a cross-domain set (political thriller, wilderness survival, romance drama).

## Assumption Reassessment (2026-02-10)
- Completion gating is already enforced before engine progression in `src/llm/schemas/analyst-response-transformer.ts` (`beatConcluded` is normalized with `completionGateSatisfied`).
- `generateNextPage` consumes `AnalystResult` and does not independently enforce `completionGateSatisfied`; tests here should validate progression behavior from post-validation analyst outputs rather than add new runtime guardrails.
- Integration tests in `test/integration/engine/page-service.test.ts` currently mock `generateAnalystEvaluation` directly; these mocks should include the full diagnostic shape (scene/objective/commitment/structural/entry/anchors/gate fields) to reflect current contract.
- New JSON fixture files are not required for this ticket; inline deterministic fixtures in integration tests are sufficient.
- `npm run typecheck` validates `src/**/*` (not `test/**/*`) in this repo. Test correctness is validated by running the targeted integration suite.

## Depends on
- BEACONSCESIGGAT-01
- BEACONSCESIGGAT-02
- BEACONSCESIGGAT-03

## Blocks
- BEACONSCESIGGAT-06

## File list it expects to touch
- `test/integration/engine/page-service.test.ts`
- `tickets/BEACONSCESIGGAT-04-false-positive-regression-and-cross-domain-tests.md`

## Implementation checklist
1. Add false-positive repro test:
   - Narrative is high-intensity action/escalation.
   - Active beat objective lacks explicit completion evidence.
   - Analyst mock returns diagnostics with non-`CLEAR_EXPLICIT` evidence and `completionGateSatisfied: false`.
   - Assert beat does not conclude and act/beat index does not advance.
2. Add true-positive turning-point test:
   - Narrative includes explicit commitment aligned to objective anchors.
   - `commitmentStrength` meets threshold and gate is satisfied.
   - Assert beat concludes and progression advances correctly.
3. Add cross-domain variants (at least 3):
   - Political thriller
   - Wilderness survival
   - Romance drama
   Assert same diagnostic fields and gate semantics work without domain-specific assumptions.
4. Keep tests deterministic with mocked analyst/writer generation.
5. Ensure analyst mocks in this file use full current `AnalystResult` diagnostics fields.

## Out of scope
- Do not change production engine logic in this ticket.
- Do not add runtime guardrail behavior.
- Do not tune pacing rewrite/nudge heuristics.
- Do not alter unrelated e2e suites.

## Acceptance criteria

### Specific tests that must pass
- `test/integration/engine/page-service.test.ts`
  - New case: "action-heavy scene without explicit objective evidence does not conclude beat".
  - New case: "turning_point with explicit commitment and anchor evidence can conclude beat".
  - New parameterized/grouped cases: same gate semantics across political/survival/romance scenarios.
- Existing page-service integration tests continue to pass.
- `npm run test:integration -- test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- No domain-specific hardcoded logic is introduced in test expectations.
- Branch/page immutability guarantees remain unchanged.
- Beat progression only advances through existing service pathways.
- Deviation and pacing behavior remains unaffected unless explicitly asserted.

## Outcome
- Completed on: 2026-02-10
- What changed:
  - Added integration regression test for high-intensity/no-explicit-evidence non-conclusion.
  - Added integration turning-point true-positive completion test with explicit commitment and anchor evidence.
  - Added parameterized cross-domain integration coverage (political thriller, wilderness survival, romance drama) validating story-agnostic gate semantics.
  - Updated integration analyst mocks to the current full `AnalystResult` diagnostics shape.
  - Updated `buildStructure()` fixture in integration tests to current `StoryStructure` contract fields (`premise`, `pacingBudget`, beat `role`).
- Deviations from original plan:
  - No new `test/fixtures/` files were added; scenarios are inline and deterministic.
  - No production engine logic changes were needed.
- Verification:
  - `npm run test:integration -- test/integration/engine/page-service.test.ts` (pass)
  - `npm run typecheck` (pass)
