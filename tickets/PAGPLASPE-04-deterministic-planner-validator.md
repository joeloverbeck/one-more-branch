# PAGPLASPE-04: Deterministic Planner Validation Rules (IDs, Replace Payloads, Duplicates)

## Summary
Add deterministic planner-output validation rules required by Spec 09 so invalid plans fail fast with machine-readable issues before downstream use.

## Depends on
- PAGPLASPE-01
- PAGPLASPE-03

## Blocks
- PAGPLASPE-05
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/validation/page-planner-output-validator.ts`
- `src/llm/validation/state-id-prefixes.ts`
- `src/llm/schemas/page-planner-response-transformer.ts`
- `test/unit/llm/validation/page-planner-output-validator.test.ts`
- `test/unit/llm/validation/state-id-prefixes.test.ts`
- `test/unit/llm/schemas/page-planner-response-transformer.test.ts`

## Implementation checklist
1. Add planner rule keys and issue model for deterministic validation failures.
2. Validate ID prefix correctness in all `removeIds` / `resolveIds` / replace remove-side IDs.
3. Reject empty thread text after normalization.
4. Reject malformed replace entries (missing remove identifier or missing replacement payload).
5. Detect and reject duplicate intents within each category after normalization.
6. Ensure invalid thread taxonomy enum values are surfaced with deterministic machine-readable rule keys.

## Out of scope
- Retrying generation on planner validation failure.
- Engine recovery/fallback policy from Spec 13.
- Deterministic reconciliation behavior from Spec 11.
- Any prompt text changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/page-planner-output-validator.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner deterministic validation failures are reported as machine-readable structured issues (not string-only errors).
- Existing writer ID-prefix validation behavior remains unchanged.
- Valid planner outputs are unaffected by validator (no lossy transformation).
