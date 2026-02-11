**Status**: ✅ COMPLETED

# PAGPLASPE-03: Add Planner Schema, Zod Validation, and Transformer

## Summary
Implement strict planner schema contracts and normalized transformation into `PagePlan` so downstream logic receives machine-validated planner output.

## Depends on
- PAGPLASPE-01

## Blocks
- PAGPLASPE-04
- PAGPLASPE-05
- PAGPLASPE-06

## File list it expects to touch
- `src/llm/schemas/page-planner-schema.ts`
- `src/llm/schemas/page-planner-validation-schema.ts`
- `src/llm/schemas/page-planner-response-transformer.ts`
- `src/llm/schemas/index.ts`
- `test/unit/llm/schemas/page-planner-schema.test.ts`
- `test/unit/llm/schemas/page-planner-response-transformer.test.ts`
- `test/unit/llm/schemas.test.ts`

## Assumption Reassessment (2026-02-11)
- `src/llm/schemas/page-planner-*` files do not exist yet in the codebase; this ticket must create them from scratch.
- Existing schema/transformer patterns are writer/analyst-focused; planner wiring is not present in generation/client code yet.
- Spec 09 requires deterministic planner validation rules (ID prefix checks, duplicate-intent rejection, replace payload completeness, thread taxonomy enum validity). This ticket will implement the subset that belongs in schema/validation/transformer layers and keep engine integration out of scope.
- `PagePlan` in `src/llm/types.ts` is the source of truth for field names/types (including `characterState.replace.add.states: string[]`), even where Spec 09 prose examples differ.

## Implementation checklist
1. Add strict JSON schema (`response_format`) for planner output.
2. Add zod validation schema aligned to JSON schema and `PagePlan` types.
3. Add transformer that trims strings, drops empty normalized strings, and returns validated `PagePlan`.
4. Preserve `rawResponse` and emit `LLMError` with machine-readable context on validation failure.
5. Export planner schema/validator from schema barrel.
6. Add focused tests for valid/invalid payloads and trimming behavior.

## Out of scope
- Planner LLM client call/wiring.
- Engine integration and state reconciliation.
- Writer schema changes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-response-transformer.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Planner schema is `strict: true` and rejects unknown keys.
- Transformer output conforms to `PagePlan` with non-empty required textual fields after trim.
- Existing writer/analyst/structure schemas continue to validate as before.

## Outcome
- Completion date: 2026-02-11
- What changed:
  - Added new planner schema contract: `src/llm/schemas/page-planner-schema.ts`.
  - Added planner zod validation with deterministic checks for ID-prefix fields, duplicate normalized intents, replace completeness, and required trimmed text: `src/llm/schemas/page-planner-validation-schema.ts`.
  - Added planner response transformer returning `PagePlanGenerationResult` with `rawResponse`, normalization, and `LLMError` validation context: `src/llm/schemas/page-planner-response-transformer.ts`.
  - Updated schema barrel exports: `src/llm/schemas/index.ts`.
  - Added/updated unit tests:
    - `test/unit/llm/schemas/page-planner-schema.test.ts`
    - `test/unit/llm/schemas/page-planner-response-transformer.test.ts`
    - `test/unit/llm/schemas.test.ts`
- Deviations from original plan:
  - Transformer returns `PagePlanGenerationResult` (includes `rawResponse`) rather than bare `PagePlan`, to satisfy checklist item requiring preserved raw response.
  - Deterministic validation from Spec 09 was partially implemented in the validation schema layer; planner client/engine wiring remains out of scope.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/page-planner-schema.test.ts test/unit/llm/schemas/page-planner-response-transformer.test.ts test/unit/llm/schemas.test.ts`
  - `npm run typecheck`
