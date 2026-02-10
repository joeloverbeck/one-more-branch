**Status**: Proposed

# BEACONSCESIGGAT-06: Verification and rollout checks for scene-signal completion gating

## Summary
Verification ticket to run focused and full-suite checks after implementation tickets land, and confirm rollout expectations for false-positive reduction and progression discipline.

## Depends on
- BEACONSCESIGGAT-04
- BEACONSCESIGGAT-05 (if implemented)

## Blocks
- None

## File list it expects to touch
- No production source files expected.
- `tickets/BEACONSCESIGGAT-*.md` (status updates only, if archiving process is initiated later).

## Implementation checklist
1. Run focused unit tests for prompt/schema/transformer/page-service changes.
2. Run focused integration tests for page-service gating scenarios.
3. Run aggregate quality gates (`typecheck`, lint if required by branch policy).
4. Record verification outcomes against spec acceptance criteria.

## Out of scope
- Do not add new code features.
- Do not perform refactors unrelated to gating.
- Do not alter fixture semantics unless tests are failing for gating reasons.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- test/unit/llm/prompts/continuation/analyst-structure-evaluation.test.ts`
- `npm run test:unit -- test/unit/llm/prompts/analyst-prompt.test.ts`
- `npm run test:unit -- test/unit/llm/schemas/analyst-response-transformer.test.ts`
- `npm run test:unit -- test/unit/engine/page-service.test.ts`
- `npm run test:integration -- test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- No runtime crashes on malformed analyst output.
- No beat/act progression when completion gate is unsatisfied for guarded scenarios.
- Story-agnostic gate behavior holds across tested domains.
- Existing non-gating flows (opening generation, replay, persistence) remain green in unchanged suites.
