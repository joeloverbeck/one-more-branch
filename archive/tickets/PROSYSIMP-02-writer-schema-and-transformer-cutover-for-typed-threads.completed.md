# PROSYSIMP-02: Writer schema and transformer cutover for typed threads
**Status**: ✅ COMPLETED

## Summary
Cut writer contracts over from `threadsAdded: string[]` to `threadsAdded: ThreadAdd[]` with hard rejection of legacy string arrays.

## Depends on
- `PROSYSIMP-01`

## Assumption Reassessment (2026-02-10)
- `PROSYSIMP-01` already established thread enums (`ThreadType`, `Urgency`) and typed persisted/open thread entries.
- Current runtime still stores/applys `activeStateChanges.threadsAdded` as `string[]` (`ActiveStateChanges` + persistence serializer types). This ticket does **not** change that model/persistence contract.
- Therefore, this ticket is a writer-boundary cutover only: typed `threadsAdded` is required at LLM schema/validation/transformer boundaries, then mapped to plain text for existing `ActiveStateChanges` in `page-builder`.
- `writer-response-transformer` still contains legacy recovery for malformed/plain-string `choices`. That path is unrelated to thread shape and remains in scope-neutral behavior for this ticket.

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
- `test/unit/engine/page-builder.test.ts`

## Implementation checklist
1. Define `ThreadAdd` in writer types as `{ text: string; threadType: ThreadType; urgency: Urgency }`.
2. Update JSON schema (`writer-schema`) to require object entries for `threadsAdded`.
3. Update Zod schema (`writer-validation-schema`) to parse only typed thread objects and reject string arrays.
4. In transformer, trim `text`, reject empty-after-trim text, and preserve enum fields.
5. Ensure `threadsResolved` remains `string[]` (IDs only) and is still trimmed.
6. Remove any thread-specific legacy acceptance path in transformer/schema.
7. Update `page-builder` mapping to convert typed writer `threadsAdded` objects into `ActiveStateChanges.threadsAdded` text strings so existing engine/persistence contracts remain unchanged.

## Out of scope
- Do not implement prompt text updates in this ticket.
- Do not add runtime post-LLM deterministic validator in this ticket.
- Do not add migration logic for persisted pages in this ticket.
- Do not change `ActiveStateChanges`/persistence serializer thread delta shape in this ticket.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-builder.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Runtime accepts exactly one writer schema shape for `threadsAdded` (object array only).
- Any payload with `threadsAdded: string[]` fails validation.
- Thread text is trimmed and empty-after-trim entries are rejected.
- `threadType` and `urgency` values are preserved from writer payload to `WriterResult`.
- Existing `ActiveStateChanges.threadsAdded` continues to receive text-only thread additions via page-builder mapping.
- Non-thread fields preserve existing required/optional behavior unless explicitly changed by later tickets.

## Outcome
- Completion date: 2026-02-10
- What changed:
  - Writer contract updated to `threadsAdded: ThreadAdd[]` in `src/llm/types.ts`.
  - Writer JSON schema + Zod validation now require typed thread objects and reject legacy string arrays.
  - Writer transformer now trims `threadsAdded[].text`, preserves `threadType`/`urgency`, and rejects empty-after-trim thread text.
  - `page-builder` now maps typed `threadsAdded` objects to text for existing `ActiveStateChanges` compatibility.
  - Tests updated for new thread shape in writer schema/transformer/integration/type coverage, plus page-builder mapping coverage.
- Deviations from original plan:
  - Added `test/unit/engine/page-builder.test.ts` to cover the required typed-writer-to-string-state mapping boundary that was implicit but not listed in the original file scope.
  - Explicitly documented that model/persistence `ActiveStateChanges` thread delta shape remains string-based and out of scope for this ticket.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/schemas/writer-response-transformer.test.ts`
  - `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/llm/types.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/engine/page-builder.test.ts`
  - `npm run typecheck`
