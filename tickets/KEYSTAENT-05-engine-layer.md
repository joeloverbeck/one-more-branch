# KEYSTAENT-05: Update engine layer for KeyedEntry types

**Status**: PENDING
**Priority**: 5
**Depends on**: KEYSTAENT-02, KEYSTAENT-03
**Branch**: keyed-state-entries

---

## Summary

Update engine-layer modules to work with the new `KeyedEntry` types, the flat `characterStateChangesRemoved` in `WriterResult`, and the new `CharacterStateChanges` shape.

## Files to Touch

- `src/engine/character-state-manager.ts` — **MODIFY**
- `src/engine/inventory-manager.ts` — **MODIFY**
- `src/engine/health-manager.ts` — **MODIFY**
- `src/engine/page-builder.ts` — **MODIFY**
- `src/engine/page-service.ts` — **MODIFY (type propagation only)**
- `src/engine/parent-state-collector.ts` — **NO CHANGES** (uses `Page` transitively, types flow through)

## What to Implement

### `character-state-manager.ts`

- `createCharacterStateChanges(added, removed)`:
  - `added` parameter stays: `Array<{ characterName: string; states: readonly string[] }>`
  - `removed` parameter changes from `Array<{ characterName: string; states: readonly string[] }>` to `string[]` (flat list of IDs)
  - Return type changes from `readonly SingleCharacterStateChanges[]` to `CharacterStateChanges` (the new `{ added, removed }` shape)
  - The function body simplifies: just normalize/trim the `added` entries and return `{ added: normalizedAdded, removed }`
- `formatCharacterStateForPrompt(state)`:
  - `state` is now `Record<string, readonly KeyedEntry[]>`
  - Format each entry as `- [${s.id}] ${s.text}` instead of `- ${s}`
- `getCharacterState()`: return type changes from `readonly string[]` to `readonly KeyedEntry[]`
- `hasCharacterState()`: compare against `.text` field instead of the string directly

### `inventory-manager.ts`

- `Inventory` is now `readonly KeyedEntry[]`
- `addInventoryItem()`, `removeInventoryItem()`: these helper functions need to work with `KeyedEntry`. `removeInventoryItem` should match by `.id` field, not by text normalization.
- `formatInventoryForPrompt()`: format each item as `- [${item.id}] ${item.text}`
- `createInventoryChanges()`: no change needed (still takes `readonly string[]` for added/removed)
- `normalizeItemName()`, `hasInventoryItem()`, `countInventoryItem()`: update to work with `KeyedEntry` (search by `.text` field for text-based lookups, or by `.id` for ID-based lookups)

### `health-manager.ts`

- Same pattern as inventory-manager
- `Health` is now `readonly KeyedEntry[]`
- `formatHealthForPrompt()`: format as `- [${entry.id}] ${entry.text}`
- `removeHealthEntry()`: match by `.id`
- Text-based helpers update to use `.text` field

### `page-builder.ts`

- `buildFirstPage` and `buildContinuationPage`: the call to `createCharacterStateChanges` changes:
  ```typescript
  // OLD:
  createCharacterStateChanges(result.characterStateChangesAdded, result.characterStateChangesRemoved)
  // NEW (removed is now string[]):
  createCharacterStateChanges(result.characterStateChangesAdded, result.characterStateChangesRemoved)
  ```
  The call site looks the same but the second argument type changes from `Array<{characterName, states}>` to `string[]`, which is what `WriterResult` now provides.

### `page-service.ts`

- The `generateNextPage` function constructs `ContinuationContext` with `accumulatedInventory`, `accumulatedHealth`, `accumulatedCharacterState` from parent state — these now flow as `KeyedEntry[]` / `Record<string, readonly KeyedEntry[]>` transitively. No code changes needed if types propagate correctly; verify type-checking passes.

## Out of Scope

- Model layer changes (KEYSTAENT-01, KEYSTAENT-02)
- LLM schema/prompt changes (KEYSTAENT-03, KEYSTAENT-04)
- Persistence layer (KEYSTAENT-06)
- Migration script (KEYSTAENT-07)
- `src/engine/canon-manager.ts` — no changes (canon facts are plain strings)
- `src/engine/ancestor-collector.ts` — no changes
- `src/engine/structure-*.ts` — no changes

## Acceptance Criteria

### Tests that must pass

Update `test/unit/engine/character-state-manager.test.ts`:

1. `createCharacterStateChanges(added, ['cs-1', 'cs-3'])` returns `{ added: [...], removed: ['cs-1', 'cs-3'] }`
2. `formatCharacterStateForPrompt({'Mira': [{id:'cs-1',text:'Freed'}]})` contains `[cs-1] Freed`
3. `getCharacterState(state, 'Mira')` returns `KeyedEntry[]`
4. `hasCharacterState(state, 'Mira', 'Freed')` matches against `.text` field

Update `test/unit/engine/inventory-manager.test.ts`:

5. `formatInventoryForPrompt([{id:'inv-1',text:'Sword'}])` contains `[inv-1] Sword`
6. `removeInventoryItem` works with `KeyedEntry` input

Update `test/unit/engine/health-manager.test.ts`:

7. `formatHealthForPrompt([{id:'hp-1',text:'Bruised arm'}])` contains `[hp-1] Bruised arm`

Update `test/unit/engine/page-builder.test.ts`:

8. `buildFirstPage` accepts `WriterResult` with `characterStateChangesRemoved: string[]`
9. `buildContinuationPage` accepts `WriterResult` with `characterStateChangesRemoved: string[]`
10. Built pages contain `accumulatedInventory` as `KeyedEntry[]`

### Invariants that must remain true

- All engine functions remain immutable (no mutation of input data)
- `page-service.ts` passes type-checking without code changes (pure type propagation)
- `npm run typecheck` passes for all files in `src/engine/`
- Page creation via `createPage()` still correctly applies all state changes
