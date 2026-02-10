# PROSYSIMP-01: Typed thread domain models and persistence shape

## Summary
Introduce typed thread objects across domain and persistence models so open threads carry `threadType` and `urgency` metadata end-to-end.

## Depends on
- None

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

## Implementation checklist
1. Add `ThreadType` and `Urgency` enums with initial values from spec.
2. Add a `ThreadEntry` type `{ id, text, threadType, urgency }` for accumulated/open threads.
3. Change `ActiveState.openThreads` to `ThreadEntry[]` while preserving keyed behavior for other state categories.
4. Update active-state guards and converter code to validate/serialize the new thread shape.
5. Keep `threadsResolved` as ID-only (`td-*`) in active state changes.
6. Add/adjust unit tests for new shape acceptance and rejection of incomplete thread objects.

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
- Applying active state changes cannot produce duplicate active IDs.
