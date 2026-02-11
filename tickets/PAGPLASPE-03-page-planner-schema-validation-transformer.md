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

## Implementation checklist
1. Add strict JSON schema (`response_format`) for planner output.
2. Add zod validation schema aligned to JSON schema and `PagePlan` types.
3. Add transformer that trims strings, drops empty normalized strings, and returns validated `PagePlan`.
4. Preserve `rawResponse` and emit `LLMError` with machine-readable context on validation failure.
5. Export planner schema/validator from schema barrel.
6. Add focused tests for valid/invalid payloads and trimming behavior.

## Out of scope
- Deterministic semantic validation (ID prefix mismatch, duplicate intents) beyond base schema/transform steps.
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
