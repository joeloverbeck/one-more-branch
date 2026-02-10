# PROSYSIMP-06: Hard-cut thread migration and observability

## Summary
Implement one-time migration of legacy thread strings to typed thread objects and add structured observability for migration and validator failures.

## Depends on
- `PROSYSIMP-01`
- `PROSYSIMP-02`
- `PROSYSIMP-05`

## File list it expects to touch
- `src/persistence/migrate-keyed-entries.ts`
- `src/persistence/page-serializer-types.ts`
- `src/logging/logger.ts`
- `src/logging/types.ts`
- `src/llm/writer-generation.ts`
- `scripts/` migration runner entrypoint if needed
- `test/unit/persistence/migrate-keyed-entries.test.ts`
- `test/integration/persistence/page-repository.test.ts`
- `test/unit/llm/client.test.ts`

## Implementation checklist
1. Add migration step to convert legacy thread strings to `{ text, threadType: INFORMATION, urgency: MEDIUM }`.
2. Trim thread text during migration and fail fast on empty-after-trim values.
3. Fail fast on unknown thread shapes; include stable identifiers (`storyId`, `pageId`) in logs.
4. Emit migration summary counters:
- total pages scanned
- pages migrated
- pages failed
5. Emit structured validator-failure counters keyed by rule key, including `storyId`, `pageId`, and `requestId` when available.
6. Ensure runtime rejects legacy `threadsAdded: string[]` payloads after cutover.

## Out of scope
- Do not add backward-compatibility unions for old/new thread shapes.
- Do not add new schema features beyond typed threads and required observability fields.
- Do not change non-thread migration behavior except where needed for fail-fast correctness.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/persistence/migrate-keyed-entries.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/persistence/page-repository.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Post-cutover runtime accepts only typed thread additions.
- Migration defaults are deterministic (`INFORMATION`, `MEDIUM`) and text trimming is always applied.
- Migration and validation logs include stable identifiers for debugging.
- No dual runtime path exists for legacy thread schema or legacy prompt contract.
