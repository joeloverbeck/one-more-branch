# KEYSTAENT-06: Update persistence layer for KeyedEntry serialization

**Status**: ✅ COMPLETED
**Priority**: 6
**Depends on**: KEYSTAENT-02
**Branch**: keyed-state-entries

---

## Summary

Finalize and verify persistence serialization/deserialization for the keyed-entry model. This is a breaking change: no backwards compatibility or legacy tagged-entry handling is required in runtime persistence code.

## Reassessed Assumptions (2026-02-10)

Current code state differs from the original ticket assumptions:

- Already implemented:
  - `src/persistence/page-serializer-types.ts` already defines `KeyedEntryFileData { id, text }`.
  - `PageFileData` already uses keyed-entry arrays for active state, inventory, health, and character state.
  - `characterStateChanges` already uses `{ added, removed }` shape.
  - `src/persistence/converters/active-state-converter.ts` already serializes/deserializes keyed entries via object spread.
  - `src/persistence/page-serializer.ts` already round-trips keyed entries for inventory, health, active state, and character state.
- Remaining work:
  - Tighten persistence tests around keyed-entry deep-copy/immutability invariants across nested keyed state fields.
  - Remove stale test assumptions that still construct malformed legacy-like data where not required for the assertion intent.

## Files to Touch (Revised Scope)

- `test/unit/persistence/page-serializer.test.ts` — **MODIFY**
- `test/unit/persistence/page-repository.test.ts` — **MODIFY**
- `src/persistence/page-serializer-types.ts` — **VERIFY ONLY**
- `src/persistence/converters/active-state-converter.ts` — **VERIFY ONLY**
- `src/persistence/page-serializer.ts` — **VERIFY ONLY**

## What to Implement

### `test/unit/persistence/page-serializer.test.ts`

- Add/strengthen tests that verify deep-copy behavior for keyed-entry nested fields, especially:
  - `accumulatedActiveState.{activeThreats, activeConstraints, openThreads}`
  - `accumulatedCharacterState`
  - `characterStateChanges.added`
- Keep round-trip coverage for keyed-entry shapes.

### `test/unit/persistence/page-repository.test.ts`

- Update malformed persisted page fixture data to use current `characterStateChanges` object shape when the test intent is page-id mismatch (not schema-shape mismatch), so the failing condition remains focused.

### `src/persistence/*`

- No runtime behavior changes expected unless tests expose a real gap.

## Out of Scope

- Any backwards compatibility parser for legacy tagged-entry persistence format
- Model layer changes (KEYSTAENT-01, KEYSTAENT-02)
- LLM layer changes (KEYSTAENT-03, KEYSTAENT-04)
- Engine layer changes (KEYSTAENT-05)
- Migration script (KEYSTAENT-07)
- `src/persistence/converters/structure-state-converter.ts`
- `src/persistence/converters/protagonist-affect-converter.ts`
- `src/persistence/storage.ts`

## Acceptance Criteria (Revised)

### Tests that must pass

1. `serializePage(page)` emits keyed-entry arrays for inventory/health/active state/character state fields.
2. `deserializePage(serializePage(page))` round-trips keyed persistence fields losslessly.
3. Serializer/deserializer create defensive copies for keyed-entry nested fields (mutating output must not mutate input, and vice versa).
4. Persistence repository tests pass with fixtures aligned to current `characterStateChanges` shape.

### Invariants that must remain true

- `serializePage` -> `deserializePage` remains lossless for keyed-entry fields.
- Page persistence JSON shape remains pure data.
- Breaking-change stance is preserved: runtime code does not attempt legacy tagged-entry fallback handling.
- `npm run typecheck` passes for persistence-related files.

## Outcome

- **Completion date**: 2026-02-10
- **What was actually changed**:
  - Reassessed scope based on current implementation and narrowed work to verification plus targeted test strengthening.
  - Strengthened serializer deep-copy tests for nested keyed fields (`accumulatedActiveState`, `characterStateChanges.added`, `accumulatedCharacterState`).
  - Updated one persistence repository fixture to current `characterStateChanges` object shape so the test remains focused on page-ID mismatch behavior.
- **Deviations from original plan**:
  - No runtime persistence source changes were needed in `src/persistence/`; implementation was already migrated to keyed-entry format.
  - Work shifted from serializer code migration to test hardening and assumption correction.
- **Verification results**:
  - `npm run test:unit -- --coverage=false --testPathPattern=test/unit/persistence` passed.
  - `npm run typecheck` passed.
