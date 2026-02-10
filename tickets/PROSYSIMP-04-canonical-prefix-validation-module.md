# PROSYSIMP-04: Canonical ID/prefix validation module

## Summary
Create a shared, canonical prefix validation module for state additions/removals/resolutions and enforce cross-category prefix correctness.

## Depends on
- None

## File list it expects to touch
- `src/llm/validation/state-id-prefixes.ts` (new)
- `src/llm/validation/index.ts` (new or existing barrel)
- `src/llm/schemas/writer-validation-schema.ts`
- `src/models/state/keyed-entry.ts`
- `test/unit/llm/validation/state-id-prefixes.test.ts` (new)
- `test/unit/llm/schemas/writer-response-transformer.test.ts`
- `test/integration/llm/schema-pipeline.test.ts`

## Implementation checklist
1. Add canonical prefix constants: `th-`, `cn-`, `inv-`, `hp-`, `td-`, `cs-`.
2. Implement helpers for:
- detecting ID-like values
- validating allowed prefix per field
- validating no-ID additions and ID-only removals/resolutions
3. Return deterministic rule keys for each failure case (for downstream validator payloads).
4. Wire module into schema refinement for field-level prefix checks.
5. Add tests for category mismatch (example: `th-*` in `constraintsRemoved`).

## Out of scope
- Do not add page-service commit/rejection logic in this ticket.
- Do not implement migration logic in this ticket.
- Do not change prompt text in this ticket.

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
