# KEYSTAENT-02: Migrate state model types to KeyedEntry

**Status**: ✅ COMPLETED
**Priority**: 2
**Depends on**: KEYSTAENT-01
**Branch**: keyed-state-entries

---

## Summary

Convert all state model types (`Inventory`, `Health`, `CharacterState`, `ActiveState`, `ActiveStateApply`) from plain strings / legacy tagged-entry usage to `KeyedEntry`. Update state and model barrel exports.

## Reassessed Assumptions (2026-02-10)

- `KEYSTAENT-01` already deleted `src/models/state/tagged-entry.ts` and added `src/models/state/keyed-entry.ts`.
- Current code is in a hybrid state: `keyed-entry.ts` exists, but state modules and tests still use string arrays and legacy tagged-entry logic.
- `src/models/index.ts` currently re-exports removed/legacy state symbols, so this ticket must update that barrel too to keep state API coherent.
- Existing `test/unit/models/state.test.ts` still validates legacy `TaggedStateEntry` behavior and must be updated to keyed-ID behavior.

## Files to Touch

- `src/models/state/inventory.ts` — **MODIFY**
- `src/models/state/health.ts` — **MODIFY**
- `src/models/state/character-state.ts` — **MODIFY (major)**
- `src/models/state/active-state.ts` — **MODIFY**
- `src/models/state/active-state-apply.ts` — **MODIFY**
- `src/models/state/index.ts` — **MODIFY**
- `src/models/index.ts` — **MODIFY** (state re-export alignment)
- `test/unit/models/state.test.ts` — **MODIFY** (replace legacy tagged-entry assertions)

## What to Implement

### `inventory.ts`
- `Inventory`: change from `readonly string[]` to `readonly KeyedEntry[]`
- Remove `InventoryItem` type alias (was just `string`)
- `InventoryChanges.added`: stays `readonly string[]` (LLM sends plain text for additions)
- `InventoryChanges.removed`: change to `readonly string[]` (now contains IDs like `"inv-2"`)
- `applyInventoryChanges(current, changes)`: use `removeByIds(current, changes.removed)` then `assignIds(current, changes.added, 'inv')` to preserve monotonic IDs, then concatenate

### `health.ts`
- `Health`: change from `readonly string[]` to `readonly KeyedEntry[]`
- Remove `HealthEntry` type alias
- `HealthChanges.removed`: now contains IDs (`"hp-1"`)
- `applyHealthChanges(current, changes)`: use `removeByIds` + `assignIds(current, ..., 'hp')` to preserve monotonic IDs

### `character-state.ts`
- `CharacterState`: `readonly string[]` → `readonly KeyedEntry[]`
- `AccumulatedCharacterState`: `Record<string, readonly KeyedEntry[]>`
- Replace `SingleCharacterStateChanges` and `CharacterStateChanges` with:
  ```typescript
  interface CharacterStateAddition {
    readonly characterName: string;
    readonly states: readonly string[];
  }
  interface CharacterStateChanges {
    readonly added: readonly CharacterStateAddition[];
    readonly removed: readonly string[];  // flat list of IDs like ["cs-1", "cs-5"]
  }
  ```
- `createEmptyCharacterStateChanges()`: return `{ added: [], removed: [] }`
- `applyCharacterStateChanges(current, changes)`:
  1. Find global max `cs-N` across ALL characters in `current`
  2. Process removals: scan all characters for matching IDs, remove them
  3. Process additions: for each `CharacterStateAddition`, find or create the character entry, assign globally sequential `cs-N` IDs
  4. Remove empty characters from result

### `active-state.ts`
- `ActiveState.activeThreats/activeConstraints/openThreads`: change from `readonly TaggedStateEntry[]` to `readonly KeyedEntry[]`
- Update `isActiveState` type guard: check for `{ id: string, text: string }` instead of `{ prefix, description, raw }`
- Remove `isTaggedStateEntry` helper (replace with `isKeyedEntry`)

### `active-state-apply.ts`
- Replace `applyTaggedChanges` with `applyKeyedChanges(current, added, removed, prefix)`:
  - Use `removeByIds(current, removed)` for removals
  - Use `assignIds(current, added, prefix)` for additions (do not reuse IDs after removal)
  - Concatenate remaining + new entries
- Remove all category validation (`hasExpectedCategoryPrefix`, `StateCategory` import)
- `applyActiveStateChanges()`: call `applyKeyedChanges` with `'th'`, `'cn'`, `'td'` prefixes

### `index.ts`
- Remove stale/legacy tagged-entry exports from the state barrel (`src/models/state/index.ts`). (`tagged-entry.ts` file was already deleted in KEYSTAENT-01.)
- Add `keyed-entry.ts` exports (`KeyedEntry`, `StateIdPrefix`, `extractIdNumber`, `getMaxIdNumber`, `nextId`, `assignIds`, `removeByIds`)
- Remove `SingleCharacterStateChanges` export
- Add `CharacterStateAddition` export
- Update any changed function signatures in re-exports

### `src/models/index.ts`
- Keep top-level `@/models` state exports aligned with `src/models/state/index.ts` changes.

## Out of Scope

- LLM schemas, prompts, or examples (KEYSTAENT-03, KEYSTAENT-04)
- Engine layer changes (KEYSTAENT-05)
- Persistence layer changes (KEYSTAENT-06)
- `src/models/page.ts` — the `Page` interface uses types from this module but does NOT need direct edits (it references `Inventory`, `Health`, etc. which change shape transitively)
- Migration script (KEYSTAENT-07)

## Acceptance Criteria

### Tests that must pass

Update `test/unit/models/state.test.ts`:

1. **Inventory**: `applyInventoryChanges([{id:'inv-1',text:'Sword'}], {added:['Shield'], removed:['inv-1']})` → `[{id:'inv-2',text:'Shield'}]`
2. **Inventory empty removal**: removing an ID that doesn't exist logs warning, inventory unchanged
3. **Health**: `applyHealthChanges([{id:'hp-1',text:'Bruised arm'}], {added:['Poisoned'], removed:['hp-1']})` → `[{id:'hp-2',text:'Poisoned'}]`
4. **Character state additions**: adding states to two characters assigns globally sequential `cs-N` IDs
5. **Character state removals**: `removed: ['cs-1', 'cs-3']` removes matching entries across all characters
6. **Character state global sequencing**: if max existing is `cs-5`, next addition gets `cs-6`
7. **Character state empty cleanup**: characters with all states removed are deleted from result
8. **Active state threats**: `applyActiveStateChanges` with `threatsAdded: ['Fire everywhere']` produces `{id:'th-1', text:'Fire everywhere'}`
9. **Active state removal by ID**: `threatsRemoved: ['th-1']` removes the matching entry
10. **Active state mixed**: additions + removals across threats/constraints/threads work correctly
11. **isActiveState**: returns true for `{currentLocation:'x', activeThreats:[{id:'th-1',text:'y'}], activeConstraints:[], openThreads:[]}`
12. **isActiveState**: returns false for old `TaggedStateEntry` shape `{prefix:'x', description:'y', raw:'z'}`
13. **Legacy tagged-entry parsing tests removed**: `parseTaggedEntry` / `isValidRemovalPrefix` / `extractPrefixFromRemoval` are no longer referenced in `state.test.ts`

### Invariants that must remain true

- All `apply*` functions are immutable — never mutate input arrays or objects
- `cs-N` IDs are globally unique across all characters (not per-character)
- Empty characters (0 state entries) are removed from `AccumulatedCharacterState`
- `npm run typecheck` passes for all files in `src/models/state/`

## Outcome

- **Completed**: 2026-02-10
- **What changed**:
  - Migrated `inventory`, `health`, `character-state`, `active-state`, and `active-state-apply` to `KeyedEntry`-based state handling.
  - Replaced legacy character-state change array shape with `{ added, removed }` and global `cs-*` ID assignment.
  - Updated `src/models/state/index.ts` and `src/models/index.ts` exports to remove tagged-entry exports and expose keyed-entry utilities/types.
  - Rewrote `test/unit/models/state.test.ts` to keyed-ID behavior and kept `test/unit/models/state/keyed-entry.test.ts` as the foundation coverage.
- **Deviations from original plan**:
  - Corrected algorithm wording to preserve monotonic IDs across removals (`assignIds(current, ...)`) to match acceptance examples (`inv-2`, `hp-2`, `th-2` behavior).
  - Added `src/models/index.ts` alignment explicitly since the ticket originally only listed the state barrel.
- **Verification**:
  - `npx jest test/unit/models/state.test.ts test/unit/models/state/keyed-entry.test.ts` (pass)
  - `npx tsc --noEmit src/models/state/*.ts` (pass)
