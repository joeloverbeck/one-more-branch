# PROSYSIMP-01: Typed thread domain models and persistence shape

**Status**: ✅ COMPLETED

## Summary
Introduce typed thread objects across domain and persistence models so accumulated/open threads carry `threadType` and `urgency` metadata end-to-end.

## Depends on
- None

## Assumptions reassessed against current code
- Current code is still on legacy writer thread additions (`threadsAdded: string[]`) in `ActiveStateChanges` and LLM contracts.
- Writer cutover to typed `threadsAdded` is handled by `PROSYSIMP-02`; this ticket must not preemptively break that flow.
- `openThreads` currently uses generic keyed entries (`{ id, text }`), so metadata cannot be preserved unless domain and persistence shapes are updated here.
- Applying active-state changes currently assigns thread IDs from string additions; this ticket must preserve that behavior while adding deterministic default metadata.

## File list it expects to touch
- `src/models/state/active-state.ts`
- `src/models/state/keyed-entry.ts`
- `src/models/state/active-state-apply.ts`
- `src/models/state/index.ts`
- `src/persistence/page-serializer-types.ts`
- `src/persistence/converters/active-state-converter.ts`
- `test/unit/models/state.test.ts`
- `test/unit/models/state/keyed-entry.test.ts`
- `test/unit/persistence/page-serializer.test.ts`
- `test/unit/persistence/page-repository.test.ts`
- `test/unit/models/page.test.ts` (if shape checks require updates)

## Implementation checklist
1. Add `ThreadType` and `Urgency` enums with initial values from spec.
2. Add a `ThreadEntry` type `{ id, text, threadType, urgency }` for accumulated/open threads.
3. Change `ActiveState.openThreads` to `ThreadEntry[]` while preserving keyed behavior for other state categories.
4. Keep `ActiveStateChanges.threadsAdded` as `string[]` in this ticket (legacy-compatible until `PROSYSIMP-02`), but map additions to typed persisted `ThreadEntry` with deterministic defaults.
5. Keep `threadsResolved` as ID-only (`td-*`) in active state changes.
6. Update active-state guards and converter code to validate/serialize the new thread shape.
7. Add/adjust unit tests for new shape acceptance, default metadata assignment, and rejection of incomplete thread objects.

## Out of scope
- Do not change writer prompt wording in this ticket.
- Do not add new output-validator logic in this ticket.
- Do not implement data migration in this ticket.
- Do not alter threat/constraint/inventory/health entry shapes.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/models/state.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/models/state/keyed-entry.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/persistence/page-serializer.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/persistence/page-repository.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- `openThreads` entries always include `id`, non-empty `text`, valid `threadType`, and valid `urgency`.
- Non-thread keyed state categories remain `{ id, text }` only.
- ID assignment for thread entries remains server-assigned `td-*` and monotonically increasing.
- While writer schema is still legacy in this ticket, newly added thread strings are persisted as typed thread entries using defaults: `threadType=INFORMATION`, `urgency=MEDIUM`.
- Applying active state changes cannot produce duplicate active IDs.

## Outcome
- Completion date: 2026-02-10
- Actual changes:
  - Added `ThreadType`, `Urgency`, and `ThreadEntry` domain types.
  - Switched `ActiveState.openThreads` and persisted `accumulatedActiveState.openThreads` to typed thread entries.
  - Kept `ActiveStateChanges.threadsAdded` as `string[]` in this ticket and mapped new additions to typed entries with deterministic defaults (`INFORMATION`/`MEDIUM`) at apply-time.
  - Updated guards/exports and persistence serializer typing accordingly.
  - Added/updated tests for typed thread validation and default metadata assignment.
- Deviations from original plan:
  - Scope was clarified to avoid writer-schema cutover in this ticket (that remains in `PROSYSIMP-02`).
  - `test/unit/models/page.test.ts` did not require changes after implementation.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/models/state.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/models/state/keyed-entry.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/page-serializer.test.ts` passed.
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/page-repository.test.ts` passed.
  - `npm run typecheck` passed.
