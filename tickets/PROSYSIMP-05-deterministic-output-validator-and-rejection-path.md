# PROSYSIMP-05: Deterministic writer output validator and rejection path

## Summary
Add deterministic post-LLM/pre-commit validation that rejects invalid writer payloads with structured rule-key errors and guarantees no page commit on failure.

## Depends on
- `PROSYSIMP-02`
- `PROSYSIMP-04`

## File list it expects to touch
- `src/llm/validation/writer-output-validator.ts` (new)
- `src/llm/schemas/writer-response-transformer.ts`
- `src/llm/writer-generation.ts`
- `src/llm/client.ts`
- `src/engine/page-service.ts`
- `src/server/utils/llm-error-formatter.ts`
- `test/unit/llm/validation/writer-output-validator.test.ts` (new)
- `test/unit/llm/client.test.ts`
- `test/unit/engine/page-service.test.ts`
- `test/integration/engine/page-service.test.ts`

## Implementation checklist
1. Add deterministic validator checks for:
- additions contain no IDs
- removals/resolutions contain valid category IDs only
- unique `(choiceType, primaryDelta)` pairs across choices
- required/non-empty protagonistAffect fields
2. Make validator emit structured payload with stable `ruleKey[]` and offending fields.
3. Convert validator failures into non-retryable `LLMError` code path.
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
