# NARARCAUD-12: Premise Promises — Concept Stage
**Status**: COMPLETED

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: S
**Dependencies**: None
**Spec reference**: D1 (part 1) — Concept-to-Delivery Pipeline gaps

## Summary

Add `premisePromises` to `ConceptVerification` so the concept verifier explicitly identifies 3-5 promises the premise makes to the audience. These are tracked at runtime in NARARCAUD-13.

## Assumption Reassessment (Code + Tests)

- The original scope assumed changing only type/schema/prompt/docs was sufficient.
- In current architecture, that assumption is incorrect: `src/llm/concept-verifier.ts` performs strict runtime parsing for required `ConceptVerification` fields, so `premisePromises` must also be parsed/validated there or runtime parsing will accept incomplete objects relative to the type contract.
- Existing tests are not limited to schema/type checks. The concept verifier has parser/prompt tests and shared fixtures that must be updated to avoid false negatives and to assert the new invariant.

## Corrected Scope

- Add required `readonly premisePromises: readonly string[]` to `ConceptVerification`.
- Enforce `premisePromises` in JSON schema with array length constraints (`minItems: 3`, `maxItems: 5`) and non-empty string items.
- Update concept verifier prompt instructions/output contract to define premise promises as audience expectations (not beats).
- Update runtime parser validation in `src/llm/concept-verifier.ts` so `premisePromises` is required, is an array, has 3-5 non-empty strings, and trims values.
- Update fixtures and unit tests that construct/validate `ConceptVerification`.
- Update prompt documentation in `prompts/concept-verifier-prompt.md`.

## Files to Touch

- `src/models/concept-generator.ts` — add `readonly premisePromises: readonly string[]` to `ConceptVerification`
- `src/llm/schemas/concept-verifier-schema.ts` — add `premisePromises` array (3-5 items, required)
- `src/llm/prompts/concept-verifier-prompt.ts` — add premise promise instruction
- `src/llm/concept-verifier.ts` — parse/validate `premisePromises` as a required field
- `test/fixtures/concept-generator.ts` — include `premisePromises` in concept verification fixture
- `test/unit/llm/concept-verifier.test.ts` — add/adjust parser tests for `premisePromises`
- `test/unit/llm/prompts/concept-verifier-prompt.test.ts` — assert prompt includes premise promise requirements
- `prompts/concept-verifier-prompt.md` — update doc

## Out of Scope

- Runtime tracking of premise promise fulfillment (NARARCAUD-13)
- Analyst/planner wiring

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: concept verifier schema includes `premisePromises` array
- [x] Unit test: `ConceptVerification` requires `premisePromises`
- [x] Unit test: concept verifier parser rejects missing/invalid `premisePromises`
- [x] Unit test: concept verifier parser accepts valid 3-5 `premisePromises`
- [x] Invariant: All existing concept tests pass (mocks updated)

## Outcome

- Completed on: 2026-02-27
- What changed:
  - Added required `premisePromises` to `ConceptVerification` model.
  - Added strict schema contract for `premisePromises` (`3-5` non-empty strings).
  - Updated concept verifier prompt + prompt doc to define premise promises as audience expectations (not beats).
  - Added runtime parser validation for `premisePromises` in `src/llm/concept-verifier.ts`.
  - Updated fixtures and tests to enforce and verify this invariant.
- Deviations from original plan:
  - Scope was corrected before implementation to include runtime parser + fixture/test updates; original ticket omitted parser enforcement.
  - While running full `npm test`, fixed an unrelated stale e2e rewrite fixture by adding required `openingImage`/`closingImage` fields so repository-wide tests are green.
- Verification results:
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm run test:unit -- test/unit/llm/concept-verifier.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts` passed.
  - `npm run test:e2e -- test/e2e/engine/structure-rewriting-journey.test.ts` passed.
  - `npm test` passed.
