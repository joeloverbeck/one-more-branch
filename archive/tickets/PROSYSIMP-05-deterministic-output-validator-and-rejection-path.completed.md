# PROSYSIMP-05: Deterministic writer output validator and rejection path

**Status**: ✅ COMPLETED

## Summary
Add deterministic post-LLM/pre-commit validation that rejects invalid writer payloads with structured rule-key errors and guarantees no page commit on failure.

## Depends on
- `PROSYSIMP-02`
- `PROSYSIMP-04`

## Reassessed assumptions and scope
- Prefix/category validation already exists in `src/llm/schemas/writer-validation-schema.ts` using `src/llm/validation/state-id-prefixes.ts` and is already exercised by `test/unit/llm/validation/state-id-prefixes.test.ts` plus writer transformer tests.
- Writer validation currently throws `LLMError(code='VALIDATION_ERROR', retryable=true)` in `src/llm/writer-generation.ts`, which conflicts with deterministic rejection/no-retry requirements.
- No dedicated deterministic post-transform validator currently exists for:
  - duplicate `(choiceType, primaryDelta)` pair detection across all choices
  - trimmed non-empty protagonistAffect string fields after normalization
- Page non-commit behavior is mostly covered for generic generation failures; this ticket should add explicit coverage for deterministic validation failure (`VALIDATION_ERROR`).

## File list expected to change (minimal)
- `src/llm/validation/writer-output-validator.ts` (new)
- `src/llm/writer-generation.ts`
- `test/unit/llm/validation/writer-output-validator.test.ts` (new)
- `test/unit/llm/client.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`

## Implementation checklist
1. Add deterministic post-transform validator checks for:
- additions contain no IDs
- removals/resolutions contain valid category IDs only
- unique `(choiceType, primaryDelta)` pairs across choices
- required/non-empty protagonistAffect fields after trim normalization
2. Make validator emit structured payload with stable `ruleKey[]` and offending fields.
3. Convert validator and schema-validation failures into non-retryable `LLMError` code path.
4. Ensure page-service does not persist/commit page data when validator fails.
5. Preserve deterministic behavior: no hidden retry wrapper for validation failures.
6. Add tests for each validator rule from spec and for no-commit behavior.

## Out of scope
- Do not introduce prompt text updates in this ticket.
- Do not implement story-data migration in this ticket.
- Do not add new choice model enums or business semantics beyond validation.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/writer-output-validator.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Validation failures never commit story pages.
- Validation failure payload includes deterministic rule keys and offending field paths.
- Validation failures are non-retryable; transport/transient failures retain existing retry behavior.
- Existing valid payloads continue through unchanged success paths.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Added `src/llm/validation/writer-output-validator.ts` with deterministic post-transform validation and normalized issue extraction.
  - Updated `src/llm/writer-generation.ts` to run deterministic validation post-transform and throw `LLMError(code='VALIDATION_ERROR', retryable=false)` with structured `validationIssues` and `ruleKeys`.
  - Added explicit no-commit regression coverage for validation failures in both unit and integration page-service tests.
  - Added dedicated validator unit tests for ID-like additions, ID-only mismatches, duplicate `(choiceType, primaryDelta)` pairs, and non-empty protagonist affect checks.
- Deviations from original plan:
  - Did not modify `src/llm/client.ts`, `src/engine/page-service.ts`, `src/server/utils/llm-error-formatter.ts`, or `src/llm/schemas/writer-response-transformer.ts`; behavior was achieved by wiring validation in `writer-generation` and adding targeted tests.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/validation/writer-output-validator.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/engine/page-service.test.ts` passed.
  - `npm run typecheck` passed.
