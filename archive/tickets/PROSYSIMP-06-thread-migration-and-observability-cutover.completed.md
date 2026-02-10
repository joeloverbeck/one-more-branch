# PROSYSIMP-06: Hard-cut thread migration and observability

## Status
**Status**: ✅ COMPLETED

## Summary
Implement one-time migration of legacy thread strings to typed thread objects and add structured observability for migration and validator failures.

## Depends on
- `PROSYSIMP-01`
- `PROSYSIMP-02`
- `PROSYSIMP-05`

## Reassessed assumptions (2026-02-10)
- Writer-boundary cutover already exists:
  - `threadsAdded: ThreadAdd[]` is enforced in writer schema/types/transformer.
  - legacy `threadsAdded: string[]` payloads are already rejected at runtime.
- Engine/persistence delta shape is intentionally still text-based:
  - `ActiveStateChanges.threadsAdded` remains `string[]` and is mapped from typed writer output in `page-builder`.
  - This ticket must not change that public model/persistence delta API.
- Deterministic validator already emits structured `validationIssues`/`ruleKeys` and is non-retryable.
- Gaps that still remain and are in scope for this ticket:
  - migration utility still migrates `openThreads` through generic keyed-entry logic without enforcing typed thread metadata and strict thread-shape validation.
  - migration report does not expose failed-page counters.
  - validator-failure observability is logged, but does not emit per-rule counter-style records with stable identifiers.

## Corrected scope for this ticket
1. Keep `ActiveStateChanges.threadsAdded: string[]` unchanged (no breaking API changes).
2. Tighten migration for persisted `accumulatedActiveState.openThreads`:
- convert legacy string/tagged entries to typed thread objects with deterministic defaults (`INFORMATION`, `MEDIUM`)
- trim thread text and reject empty-after-trim values
- reject unknown/invalid thread entry shapes instead of silently swallowing them
3. Add migration reporting/observability for failures:
- include `pagesFailed` in migration report
- log migration errors with stable `storyId`/`pageId` context
4. Add validator-failure counter-style logs keyed by rule key, with `storyId`/`pageId`/`requestId` when available.
5. Preserve all existing non-thread migration behavior except where needed for strict thread migration correctness.

## File list expected to touch (minimal)
- `src/persistence/migrate-keyed-entries.ts`
- `scripts/migrate-to-keyed-entries.ts`
- `src/llm/writer-generation.ts`
- `src/llm/types.ts`
- `src/engine/page-service.ts`
- `test/unit/persistence/migrate-keyed-entries.test.ts`
- `test/unit/llm/client.test.ts`
- `test/unit/engine/page-service.test.ts`

## Implementation checklist
1. Add migration step for persisted `openThreads` to convert legacy entries into `{ id, text, threadType: INFORMATION, urgency: MEDIUM }`.
2. Trim migrated thread text and fail that page migration on empty-after-trim values.
3. Fail that page migration on unknown thread shapes; include `storyId` and `pageId` in error logs.
4. Emit migration summary counters:
- total pages scanned
- pages migrated
- pages failed
5. Emit structured validator-failure counters keyed by rule key, including `storyId`, `pageId`, and `requestId` when available in generation options.
6. Keep runtime legacy `threadsAdded: string[]` rejection behavior intact (already delivered in `PROSYSIMP-02`).

## Out of scope
- Do not add backward-compatibility unions for old/new thread shapes.
- Do not add new schema features beyond typed threads and required observability fields.
- Do not change `ActiveStateChanges` thread delta shape (`threadsAdded: string[]`).
- Do not change non-thread migration behavior except where needed for strict thread migration correctness.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/persistence/migrate-keyed-entries.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/persistence/page-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Post-cutover runtime accepts only typed thread additions.
- Migration defaults are deterministic (`INFORMATION`, `MEDIUM`) and text trimming is always applied.
- Migration and validation logs include stable identifiers for debugging.
- No dual runtime path exists for legacy thread schema or legacy prompt contract.

## Outcome
- Completion date: 2026-02-10
- What was actually changed:
- Hardened thread migration in `src/persistence/migrate-keyed-entries.ts` for `accumulatedActiveState.openThreads`: legacy entries now normalize to typed objects with deterministic defaults (`INFORMATION`, `MEDIUM`), trim text, and fail page migration on unsupported shape or empty-after-trim text.
- Added migration reporting and observability for failures: `MigrationReport.pagesFailed`, per-page failure logging with `storyId`/`pageId`, and updated migration script summary output.
- Added validator-failure counter-style logs in `src/llm/writer-generation.ts` keyed by `ruleKey`, with optional `storyId`/`pageId`/`requestId` context.
- Plumbed observability context through generation options from `src/engine/page-service.ts` without breaking existing API contracts (optional fields only).
- Strengthened tests for thread migration edge cases and validator observability logging.
- Deviations from original plan:
- Kept `ActiveStateChanges.threadsAdded` as `string[]` per corrected scope and existing runtime contract; no model/persistence delta breaking change.
- Did not modify `src/persistence/page-serializer-types.ts` because thread-object cutover remains at persisted accumulated thread state and writer boundary, not delta field shape.
- Verification results:
- `npm run test:unit -- --runTestsByPath test/unit/persistence/migrate-keyed-entries.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/llm/client.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/engine/page-service.test.ts`
- `npm run test:integration -- --runTestsByPath test/integration/persistence/page-repository.test.ts`
- `npm run typecheck`
