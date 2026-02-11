# PAGWRISPE-02: Make Writer JSON Schema Creative-Only and Strict
**Status**: Draft

## Summary
Refactor the writer structured-output schema to reject all state/canon mutation fields and only accept creative scene output fields.

## File list it expects to touch
- `src/llm/schemas/writer-schema.ts`
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

## Out of scope
- Do not change prompt text in this ticket.
- Do not alter planner schema.
- Do not implement reconciler logic.
- Do not modify engine page building/state accumulation behavior.

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
