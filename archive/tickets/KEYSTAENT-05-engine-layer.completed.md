# KEYSTAENT-05: Update engine layer for KeyedEntry types

**Status**: ✅ COMPLETED
**Priority**: 5
**Depends on**: KEYSTAENT-02, KEYSTAENT-03
**Branch**: keyed-state-entries

---

## Summary

Most engine-layer migration work is already implemented. Remaining work is to align a few helper APIs and tests with the keyed-entry model and ID-based removal behavior.

## Reassessed Assumptions (2026-02-10)

- Already implemented:
  - `createCharacterStateChanges()` already accepts flat `removed: string[]` and returns `{ added, removed }`.
  - Prompt formatters in character state, inventory, and health already render `[id] text`.
  - `WriterResult.characterStateChangesRemoved` and `ContinuationContext` keyed types already propagate through `page-builder.ts` and `page-service.ts`.
- Still mismatched:
  - `getCharacterState()` in `character-state-manager.ts` currently returns `string[]` (text only), not `KeyedEntry[]`.
  - `removeInventoryItem()` and `removeHealthEntry()` currently remove by case-insensitive text, not by ID.
  - Unit tests still validate old helper behavior in those areas and do not cover the keyed-return helper path in `character-state-manager`.

## Files to Touch (Revised Scope)

- `src/engine/character-state-manager.ts` — **MODIFY**
- `src/engine/inventory-manager.ts` — **MODIFY**
- `src/engine/health-manager.ts` — **MODIFY**
- `test/unit/engine/character-state-manager.test.ts` — **MODIFY**
- `test/unit/engine/inventory-manager.test.ts` — **MODIFY**
- `test/unit/engine/health-manager.test.ts` — **MODIFY**
- `test/unit/engine/page-builder.test.ts` — **VERIFY ONLY** (no code changes expected)
- `src/engine/page-builder.ts` — **VERIFY ONLY** (no code changes expected)
- `src/engine/page-service.ts` — **VERIFY ONLY** (no code changes expected)

## What to Implement

### `character-state-manager.ts`

- `createCharacterStateChanges(added, removed)`:
  - No functional changes expected; keep current `{ added, removed }` behavior.
- `formatCharacterStateForPrompt(state)`:
  - No functional changes expected; keep current `[id] text` rendering.
- `getCharacterState()`: change return from `readonly string[]` to `readonly KeyedEntry[]` (return stored entries, not text projections)
- `hasCharacterState()`: compare against `.text` field instead of the string directly

### `inventory-manager.ts`

- `Inventory` is now `readonly KeyedEntry[]`
- `addInventoryItem()`: no functional changes expected.
- `removeInventoryItem()`: match by `.id` field, not by text normalization.
- `formatInventoryForPrompt()`: format each item as `- [${item.id}] ${item.text}`
- `createInventoryChanges()`: no change needed (still takes `readonly string[]` for added/removed IDs/text additions)
- `normalizeItemName()`, `hasInventoryItem()`, `countInventoryItem()`: keep text-based behavior via `.text`.

### `health-manager.ts`

- Same pattern as inventory-manager
- `Health` is now `readonly KeyedEntry[]`
- `formatHealthForPrompt()`: format as `- [${entry.id}] ${entry.text}`
- `removeHealthEntry()`: match by `.id`
- Text-based helpers remain text-based via `.text` where applicable

### `page-builder.ts` (verify only)

- `buildFirstPage` and `buildContinuationPage`: the call to `createCharacterStateChanges` changes:
  ```typescript
  // OLD:
  createCharacterStateChanges(result.characterStateChangesAdded, result.characterStateChangesRemoved)
  // NEW (removed is now string[]):
  createCharacterStateChanges(result.characterStateChangesAdded, result.characterStateChangesRemoved)
  ```
  The call site looks the same but the second argument type changes from `Array<{characterName, states}>` to `string[]`, which is what `WriterResult` now provides.

### `page-service.ts` (verify only)

- The `generateNextPage` function constructs `ContinuationContext` with `accumulatedInventory`, `accumulatedHealth`, `accumulatedCharacterState` from parent state — these now flow as `KeyedEntry[]` / `Record<string, readonly KeyedEntry[]>` transitively. No code changes needed if types propagate correctly; verify type-checking passes.

## Out of Scope

- Model layer changes (KEYSTAENT-01, KEYSTAENT-02)
- LLM schema/prompt changes (KEYSTAENT-03, KEYSTAENT-04)
- Persistence layer (KEYSTAENT-06)
- Migration script (KEYSTAENT-07)
- `src/engine/canon-manager.ts` — no changes (canon facts are plain strings)
- `src/engine/ancestor-collector.ts` — no changes
- `src/engine/structure-*.ts` — no changes

## Acceptance Criteria (Revised)

### Tests that must pass

Update `test/unit/engine/character-state-manager.test.ts`:

1. `createCharacterStateChanges(added, ['cs-1', 'cs-3'])` returns `{ added: [...], removed: ['cs-1', 'cs-3'] }`
2. `formatCharacterStateForPrompt({'Mira': [{id:'cs-1',text:'Freed'}]})` contains `[cs-1] Freed`
3. `getCharacterState(state, 'Mira')` returns `KeyedEntry[]` (original IDs preserved)
4. `hasCharacterState(state, 'Mira', 'Freed')` matches against `.text` field

Update `test/unit/engine/inventory-manager.test.ts`:

5. `formatInventoryForPrompt([{id:'inv-1',text:'Sword'}])` contains `[inv-1] Sword`
6. `removeInventoryItem(inventory, 'inv-1')` removes by ID (not text)

Update `test/unit/engine/health-manager.test.ts`:

7. `formatHealthForPrompt([{id:'hp-1',text:'Bruised arm'}])` contains `[hp-1] Bruised arm`
8. `removeHealthEntry(health, 'hp-1')` removes by ID (not text)

Update `test/unit/engine/page-builder.test.ts`:

9. `buildFirstPage` accepts `WriterResult` with `characterStateChangesRemoved: string[]`
10. `buildContinuationPage` accepts `WriterResult` with `characterStateChangesRemoved: string[]`
11. Built pages contain `accumulatedInventory` as `KeyedEntry[]`

### Invariants that must remain true

- All engine functions remain immutable (no mutation of input data)
- `page-service.ts` passes type-checking without code changes (pure type propagation)
- `npm run typecheck` passes for all files in `src/engine/`
- Page creation via `createPage()` still correctly applies all state changes

## Outcome

- **Completion date**: 2026-02-10
- **What changed**:
  - Updated `src/engine/character-state-manager.ts` so `getCharacterState()` returns keyed entries and `hasCharacterState()` compares against keyed entry `.text`.
  - Updated `src/engine/inventory-manager.ts` `removeInventoryItem()` to remove by entry ID.
  - Updated `src/engine/health-manager.ts` `removeHealthEntry()` to remove by entry ID.
  - Strengthened engine tests for keyed character-state queries and ID-based removal behavior, and added explicit `characterStateChangesRemoved: string[]` coverage in `page-builder` tests.
- **Deviation from original plan**:
  - `page-builder.ts` and `page-service.ts` required verification only; no source changes were needed because type propagation and call sites were already correct.
  - `createCharacterStateChanges()` and formatter functions were already compliant; no edits required there.
- **Verification**:
  - `npm run test:unit -- --runTestsByPath test/unit/engine/character-state-manager.test.ts test/unit/engine/inventory-manager.test.ts test/unit/engine/health-manager.test.ts test/unit/engine/page-builder.test.ts test/unit/engine/page-service.test.ts`
  - `npm run typecheck`
