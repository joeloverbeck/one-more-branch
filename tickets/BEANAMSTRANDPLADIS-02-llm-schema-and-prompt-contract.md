# BEANAMSTRANDPLADIS-02: Require beat name in structure schemas and prompts

## Summary
Update structure-generation and structure-rewrite LLM contracts so every beat includes a required short `name`.

## File list it expects to touch
- `src/llm/schemas/structure-schema.ts`
- `src/llm/prompts/structure-prompt.ts`
- `src/llm/prompts/structure-rewrite-prompt.ts`
- `test/unit/llm/schemas/structure-schema.test.ts`
- `test/unit/llm/prompts/structure-prompt.test.ts`
- `test/unit/llm/prompts/structure-rewrite-prompt.test.ts`

## Implementation checklist
1. Update schema required fields for beats to include `name`.
2. Update output-shape instructions in generation prompt.
3. Update output-shape instructions in rewrite prompt.
4. Update prompt examples so each beat includes `name`.
5. Update schema/prompt tests accordingly.

## Out of scope
- Do not change parsing/validation code paths beyond schema requirements.
- Do not modify structure merge/rewrite behavior.
- Do not modify repository persistence conversions.
- Do not modify view-model formatting.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/structure-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/structure-prompt.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/prompts/structure-rewrite-prompt.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Beat `name` is treated as required in both generation and rewrite schema contracts.
- Beat `description`, `objective`, and `role` stay required.
- Prompt constraints unrelated to beat naming remain unchanged.

