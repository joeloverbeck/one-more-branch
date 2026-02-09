# KEYSTAENT-06: Update persistence layer for KeyedEntry serialization

**Status**: PENDING
**Priority**: 6
**Depends on**: KEYSTAENT-02
**Branch**: keyed-state-entries

---

## Summary

Update the persistence layer types and serialization/deserialization to store `KeyedEntry` data (`{ id, text }`) instead of `TaggedStateEntry` data (`{ prefix, description, raw }`) and plain strings for inventory/health/character state.

## Files to Touch

- `src/persistence/page-serializer-types.ts` — **MODIFY**
- `src/persistence/converters/active-state-converter.ts` — **MODIFY**
- `src/persistence/page-serializer.ts` — **MODIFY**

## What to Implement

### `page-serializer-types.ts`

Replace `TaggedStateEntryFileData`:
```typescript
// OLD:
export interface TaggedStateEntryFileData {
  prefix: string;
  description: string;
  raw: string;
}

// NEW:
export interface KeyedEntryFileData {
  id: string;
  text: string;
}
```

Update `PageFileData`:
- `accumulatedActiveState.activeThreats`: `TaggedStateEntryFileData[]` → `KeyedEntryFileData[]`
- `accumulatedActiveState.activeConstraints`: same
- `accumulatedActiveState.openThreads`: same
- `accumulatedInventory`: `string[]` → `KeyedEntryFileData[]`
- `accumulatedHealth`: `string[]` → `KeyedEntryFileData[]`
- `accumulatedCharacterState`: `Record<string, string[]>` → `Record<string, KeyedEntryFileData[]>`
- `characterStateChanges`: `Array<{ characterName, added, removed }>` → `{ added: Array<{characterName: string, states: string[]}>, removed: string[] }`

### `active-state-converter.ts`

- `accumulatedActiveStateToFileData`: the spread `{ ...entry }` already works for `{ id, text }` (simpler than the old 3-field `TaggedStateEntry`)
- `fileDataToAccumulatedActiveState`: same — spread works
- Update type imports: `TaggedStateEntry` → `KeyedEntry`
- No logic changes needed, just type import changes

### `page-serializer.ts`

`serializePage`:
- `characterStateChanges`: serialize new `{ added, removed }` shape instead of array of `{ characterName, added, removed }`
- `accumulatedCharacterState`: serialize `Record<string, KeyedEntry[]>` → `Record<string, KeyedEntryFileData[]>` (map each entry to `{ id, text }`)
- `accumulatedInventory`: serialize `KeyedEntry[]` → `KeyedEntryFileData[]`
- `accumulatedHealth`: serialize `KeyedEntry[]` → `KeyedEntryFileData[]`

`deserializePage`:
- `characterStateChanges`: deserialize new shape
- `accumulatedCharacterState`: deserialize `Record<string, KeyedEntryFileData[]>` → `Record<string, KeyedEntry[]>`
- `accumulatedInventory`: deserialize `KeyedEntryFileData[]` → `Inventory` (which is `KeyedEntry[]`)
- `accumulatedHealth`: deserialize `KeyedEntryFileData[]` → `Health` (which is `KeyedEntry[]`)
- `inventoryChanges.removed` and `healthChanges.removed`: these stay as `string[]` (IDs), no change
- `inventoryChanges.added` and `healthChanges.added`: stay as `string[]` (plain text), no change

## Out of Scope

- Model layer changes (KEYSTAENT-01, KEYSTAENT-02)
- LLM layer changes (KEYSTAENT-03, KEYSTAENT-04)
- Engine layer changes (KEYSTAENT-05)
- Migration script (KEYSTAENT-07)
- `src/persistence/converters/structure-state-converter.ts` — no changes
- `src/persistence/converters/protagonist-affect-converter.ts` — no changes
- `src/persistence/storage.ts` — no changes (uses serializer)

## Acceptance Criteria

### Tests that must pass

The existing serialization round-trip tests must be updated and pass:

1. `serializePage(page)` produces `accumulatedInventory` as `[{id:'inv-1',text:'Sword'}]` not `['Sword']`
2. `serializePage(page)` produces `accumulatedHealth` as `[{id:'hp-1',text:'Bruised'}]`
3. `serializePage(page)` produces `accumulatedActiveState.activeThreats` as `[{id:'th-1',text:'Fire'}]` not `[{prefix:'THREAT_FIRE',description:'Fire',raw:'...'}]`
4. `serializePage(page)` produces `accumulatedCharacterState` as `{'Mira':[{id:'cs-1',text:'Freed'}]}`
5. `serializePage(page)` produces `characterStateChanges` as `{added:[{characterName:'Mira',states:['Freed']}], removed:['cs-1']}`
6. `deserializePage(serializePage(page))` round-trips correctly for all field types
7. `deserializePage` correctly reconstructs `KeyedEntry[]` from `KeyedEntryFileData[]`

### Invariants that must remain true

- `serializePage` → `deserializePage` is a lossless round-trip
- File format produces valid JSON
- `PageFileData` is a pure data type (no methods, no domain logic)
- `npm run typecheck` passes for all files in `src/persistence/`
