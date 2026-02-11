# PAGWRISPE-03: Remove State-ID Validation from Writer Validation Pipeline
**Status**: Draft

## Summary
Update writer validation/transformation so deterministic checks focus on creative-output guarantees only (choice divergence + protagonist affect), with no writer-owned state mutation validation.

## File list it expects to touch
- `src/llm/schemas/writer-validation-schema.ts`
- `src/llm/schemas/writer-response-transformer.ts`
- `src/llm/validation/writer-output-validator.ts`
- `test/unit/llm/validation/writer-output-validator.test.ts`
- `test/unit/llm/schemas/writer-response-transformer.test.ts`
- `test/unit/llm/client.test.ts`

## Implementation checklist
1. Remove writer validation requirements tied to state mutation fields.
2. Keep and enforce:
   - choice uniqueness/divergence checks (`choiceType + primaryDelta`)
   - protagonist-affect non-empty required fields.
3. Remove state-ID prefix checks from deterministic writer validator.
4. Simplify writer response transformer to normalize only creative fields.
5. Update validator unit tests to remove state-ID expectations and keep creative-output rule coverage.

## Out of scope
- Do not change planner validation logic.
- Do not modify retry/backoff behavior.
- Do not alter logging format other than removing obsolete rule counters.
- Do not add reconciler-specific validation in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/validation/writer-output-validator.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Duplicate `(choiceType, primaryDelta)` pairs are still rejected.
- Empty critical protagonist-affect fields are still rejected.
- Writer validation failures are still surfaced as `VALIDATION_ERROR` (non-retryable).
