# PROSYSIMP-02: Writer schema and transformer cutover for typed threads

## Summary
Cut writer contracts over from `threadsAdded: string[]` to `threadsAdded: ThreadAdd[]` with hard rejection of legacy string arrays.

## Depends on
- `PROSYSIMP-01`

## File list it expects to touch
- `src/llm/types.ts`
- `src/llm/schemas/writer-schema.ts`
- `src/llm/schemas/writer-validation-schema.ts`
- `src/llm/schemas/writer-response-transformer.ts`
- `src/engine/page-builder.ts`
- `test/unit/llm/schemas/writer-schema.test.ts`
- `test/unit/llm/schemas/writer-response-transformer.test.ts`
- `test/integration/llm/schema-pipeline.test.ts`
- `test/unit/llm/types.test.ts`

## Implementation checklist
1. Define `ThreadAdd` in writer types as `{ text: string; threadType: ThreadType; urgency: Urgency }`.
2. Update JSON schema (`writer-schema`) to require object entries for `threadsAdded`.
3. Update Zod schema (`writer-validation-schema`) to parse only typed thread objects and reject string arrays.
4. In transformer, trim `text`, reject empty-after-trim text, and preserve enum fields.
5. Ensure `threadsResolved` remains `string[]` (IDs only) and is still trimmed.
6. Remove any thread-specific legacy acceptance path in transformer/schema.

## Out of scope
- Do not implement prompt text updates in this ticket.
- Do not add runtime post-LLM deterministic validator in this ticket.
- Do not add migration logic for persisted pages in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Runtime accepts exactly one writer schema shape for `threadsAdded` (object array only).
- Any payload with `threadsAdded: string[]` fails validation.
- Thread text is trimmed and empty-after-trim entries are rejected.
- Non-thread fields preserve existing required/optional behavior unless explicitly changed by later tickets.
