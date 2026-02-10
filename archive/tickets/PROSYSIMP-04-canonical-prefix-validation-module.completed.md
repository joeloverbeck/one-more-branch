# PROSYSIMP-04: Canonical ID/prefix validation module

**Status**: ✅ COMPLETED

## Summary
Create a shared canonical ID/prefix validation module for writer-output state additions/removals/resolutions and enforce cross-category prefix correctness during writer schema validation.

## Reassessed assumptions (2026-02-10)
- `src/llm/validation/` does not exist yet and must be introduced in this ticket.
- Prefix validation is currently implicit/informal in prompt/schema descriptions, but not centrally enforced in `WriterResultSchema`.
- `src/models/state/keyed-entry.ts` already defines engine-side ID helpers/types and should remain unchanged for this ticket; this ticket is scoped to LLM writer validation only.
- Existing relevant tests are `test/unit/llm/schemas/writer-response-transformer.test.ts` and `test/integration/llm/schema-pipeline.test.ts`; a new focused unit test file is needed for the new module.

## Depends on
- None

## Updated file list expected to touch
- `src/llm/validation/state-id-prefixes.ts` (new)
- `src/llm/validation/index.ts` (new)
- `src/llm/schemas/writer-validation-schema.ts`
- `test/unit/llm/validation/state-id-prefixes.test.ts` (new)
- `test/unit/llm/schemas/writer-response-transformer.test.ts`
- `test/integration/llm/schema-pipeline.test.ts`

## Implementation checklist
1. Add canonical prefix constants: `th-`, `cn-`, `inv-`, `hp-`, `td-`, `cs-`.
2. Implement helpers for:
- detecting ID-like values
- validating allowed prefix per field
- validating no-ID additions and ID-only removals/resolutions
3. Return deterministic rule keys for each failure case for downstream validator payload compatibility.
4. Wire the module into writer schema refinement for field-level prefix checks.
5. Add tests for category mismatch (example: `th-*` in `constraintsRemoved`) and ID-like additions.

## Out of scope
- Do not add page-service commit/rejection logic in this ticket.
- Do not implement migration logic in this ticket.
- Do not change prompt text in this ticket.
- Do not change public model-layer APIs (`src/models/state/*`) in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Additions for threats/constraints/threads/inventory/health never accept ID-like strings.
- Removals/resolutions only accept IDs and only for their correct category prefix.
- Validation logic for prefixes exists in one shared module and is reused, not duplicated.

## Outcome
- **Completion date**: 2026-02-10
- **What was changed**:
  - Added shared canonical prefix validator module at `src/llm/validation/state-id-prefixes.ts` and barrel export `src/llm/validation/index.ts`.
  - Wired prefix/id validation into `WriterResultSchema` refinement in `src/llm/schemas/writer-validation-schema.ts` with deterministic rule keys:
    - `state_id.addition.must_not_be_id_like`
    - `state_id.id_only_field.requires_id`
    - `state_id.id_only_field.prefix_mismatch`
  - Added targeted unit tests in `test/unit/llm/validation/state-id-prefixes.test.ts`.
  - Strengthened schema/transformer and integration tests for ID-like additions and cross-category prefix mismatches.
- **Deviations from original plan**:
  - `src/models/state/keyed-entry.ts` was not changed because canonical prefix validation is enforced in the LLM schema layer for this ticket scope.
  - Existing integration test fixtures using plain text in ID-only fields were updated to canonical IDs to match ticket invariants.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts` passed.
  - `npm run typecheck` passed.
