**Status**: Proposed

# BEACONSCESIGGAT-04: Add false-positive regression and cross-domain analyst gating tests

## Summary
Add targeted integration-style tests that exercise the new gating contract in realistic mocked analyst flows: one action-heavy false-positive repro, one true-positive turning-point completion, and a cross-domain set (political thriller, wilderness survival, romance drama).

## Depends on
- BEACONSCESIGGAT-01
- BEACONSCESIGGAT-02
- BEACONSCESIGGAT-03

## Blocks
- BEACONSCESIGGAT-06

## File list it expects to touch
- `test/integration/engine/page-service.test.ts`
- `test/unit/engine/page-service.test.ts` (if shared fixtures/helpers are easier here)
- `test/fixtures/` (new fixture JSON/text files only if needed)

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
  - New parameterized/grouped cases: same gate semantics across political/survival/romance fixtures.
- Existing page-service integration tests continue to pass.
- `npm run test:integration -- test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- No domain-specific hardcoded logic is introduced in test expectations.
- Branch/page immutability guarantees remain unchanged.
- Beat progression only advances through existing service pathways.
- Deviation and pacing behavior remains unaffected unless explicitly asserted.
