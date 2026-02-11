# PAGWRISPE-02: Make Writer JSON Schema Creative-Only and Strict
**Status**: ✅ COMPLETED

## Summary
Refactor the writer structured-output schema to reject all state/canon mutation fields and only accept creative scene output fields.

## Assumptions Reassessment (2026-02-11)
- `WRITER_GENERATION_SCHEMA` is still state/canon-heavy and must be narrowed to creative-only fields.
- Runtime still consumes `WriterResult` compatibility fields in engine/page-builder and canon updates, so this ticket must preserve `WriterResult` public API.
- `WriterResultSchema` currently still requires `newCanonFacts`; this is incompatible with a creative-only schema output. The validator must accept missing legacy state/canon fields with safe defaults to avoid regression.
- Existing tests in `test/unit/llm/schemas/writer-schema.test.ts` and `test/integration/llm/schema-pipeline.test.ts` currently assert state/canon-heavy writer payloads and must be updated.

## File list it expects to touch
- `src/llm/schemas/writer-schema.ts`
- `src/llm/schemas/writer-validation-schema.ts`
- `test/unit/llm/schemas/writer-schema.test.ts`
- `test/unit/llm/schemas.test.ts`
- `test/integration/llm/schema-pipeline.test.ts`

## Implementation checklist
1. Remove state/canon properties from `WRITER_GENERATION_SCHEMA`:
   - `currentLocation`
   - `threatsAdded` / `threatsRemoved`
   - `constraintsAdded` / `constraintsRemoved`
   - `threadsAdded` / `threadsResolved`
   - `newCanonFacts` / `newCharacterCanonFacts`
   - `inventoryAdded` / `inventoryRemoved`
   - `healthAdded` / `healthRemoved`
   - `characterStateChangesAdded` / `characterStateChangesRemoved`
2. Keep `additionalProperties: false` and ensure removed fields are not tolerated.
3. Update required fields list to exactly match creative-only contract.
4. Update schema tests to assert removed fields are absent from both `properties` and `required`.
5. Add/adjust integration coverage to prove payloads with old state fields fail validation.
6. Keep compatibility by defaulting omitted legacy writer fields in validator output (no public API removal in this ticket).

## Out of scope
- Do not change prompt text in this ticket.
- Do not alter planner schema.
- Do not implement reconciler logic.
- Do not modify engine page building/state accumulation behavior.
- Do not remove legacy fields from `WriterResult` type in `src/llm/types.ts`.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Writer schema remains strict JSON Schema with `strict: true`.
- `choices`, `sceneSummary`, `protagonistAffect`, and `isEnding` contract rules are preserved.
- Endings invariant remains enforceable (`isEnding=true` implies zero choices).
- WriterResult compatibility fields remain available to downstream engine code via validator defaults.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - `WRITER_GENERATION_SCHEMA` was narrowed to creative-only fields (`narrative`, `choices`, `protagonistAffect`, `sceneSummary`, `isEnding`) with `additionalProperties: false`.
  - `WriterResultSchema` was updated so `newCanonFacts` defaults to `[]`, allowing creative-only structured outputs while preserving downstream `WriterResult` compatibility fields.
  - Tests were updated to assert removed state/canon fields are absent from writer schema `properties` and `required`.
  - Integration coverage was added to prove payloads containing legacy state fields are invalid at the strict writer schema boundary.
- Deviations from original plan:
  - Added `src/llm/schemas/writer-validation-schema.ts` to scope because `newCanonFacts` being required would have broken creative-only schema outputs.
  - No prompt changes were made (still out of scope).
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts` passed.
  - `npm run typecheck` passed.
