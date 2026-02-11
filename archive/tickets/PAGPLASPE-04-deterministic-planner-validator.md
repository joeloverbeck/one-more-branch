**Status**: ✅ COMPLETED

# PAGPLASPE-04: Deterministic Planner Validation Rules (IDs, Replace Payloads, Duplicates)

## Summary
Add deterministic planner-output validation rules required by Spec 09 so invalid plans fail fast with machine-readable issues before downstream use.

## Assumption Reassessment (2026-02-11)
- Planner deterministic validation currently lives in `src/llm/schemas/page-planner-validation-schema.ts` and is surfaced via `src/llm/schemas/page-planner-response-transformer.ts`; there is no `src/llm/validation/page-planner-output-validator.ts` in this repository.
- `test/unit/llm/validation/page-planner-output-validator.test.ts` does not exist; planner deterministic validation coverage is in `test/unit/llm/schemas/page-planner-response-transformer.test.ts`.
- Scope is updated to keep validation centralized in existing planner schema/transformer flow and avoid introducing a parallel validator layer.

## Depends on
- PAGPLASPE-01
- PAGPLASPE-03

## Blocks
- PAGPLASPE-05
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/schemas/page-planner-validation-schema.ts`
- `src/llm/schemas/page-planner-response-transformer.ts`
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
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner deterministic validation failures are reported as machine-readable structured issues (not string-only errors).
- Existing writer ID-prefix validation behavior remains unchanged.
- Valid planner outputs are unaffected by validator (no lossy transformation).

## Outcome
- **Completion date**: 2026-02-11
- **What changed**:
  - Kept deterministic planner validation in the existing schema + transformer flow (`page-planner-validation-schema.ts` + `page-planner-response-transformer.ts`) instead of introducing a parallel planner validator module.
  - Added deterministic rule-key surfacing for invalid thread taxonomy enum failures via `planner.thread_taxonomy.invalid_enum`.
  - Added/strengthened planner transformer unit tests for:
    - empty thread text after trim (`planner.required_text.empty_after_trim`)
    - invalid thread taxonomy enum mapping (`planner.thread_taxonomy.invalid_enum`)
- **Deviations from original plan**:
  - Original ticket assumed `src/llm/validation/page-planner-output-validator.ts` and matching tests existed; this repo uses planner schema-based validation, so scope was corrected to avoid redundant validator layering.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts` ✅
  - `npm run test:unit -- --runTestsByPath test/unit/llm/validation/state-id-prefixes.test.ts` ✅
  - `npm run typecheck` ✅
