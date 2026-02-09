# Spec: Server-Assigned Keyed IDs for State Entries

**Status**: PENDING
**Created**: 2026-02-09
**Scope**: Models, LLM prompts/schemas, engine, persistence, migration

---

## Problem Statement

The LLM frequently fails to remove stale state entries because:

- **Inventory, health, character state**: Require exact text reproduction for removal. The LLM paraphrases or omits removals entirely (e.g., Mira accumulates both "Chained to a stake" and "Freed from chains").
- **Threats, constraints, threads**: Use LLM-invented prefix keys (e.g., `THREAT_FIRE`). Works better but still occasionally fails (e.g., `THREAT_MANIFESTATION` not found).

Research confirms: **short, server-generated sequential IDs** are dramatically more reliable than text or LLM-invented keys. The LLM only needs to *copy* an ID it can see in the prompt, not *reproduce* text from memory.

## Solution

Our code assigns sequential IDs (`cs-1`, `inv-2`, `hp-1`, `th-3`, `cn-1`, `td-2`) when entries are added during state accumulation. Prompts show `[inv-1] Rusty iron key`. LLM removes by referencing just `"inv-1"`.

### ID Prefixes

| Prefix | Domain |
|--------|--------|
| `inv` | Inventory items |
| `hp` | Health/conditions |
| `cs` | Character states |
| `th` | Active threats |
| `cn` | Active constraints |
| `td` | Open threads |

---

## Phase 1: Foundation Type (`keyed-entry.ts`)

**Create** `src/models/state/keyed-entry.ts`:

```typescript
export interface KeyedEntry {
  readonly id: string;   // e.g., "inv-1", "cs-3", "th-2"
  readonly text: string; // the descriptive content
}

export type StateIdPrefix = 'inv' | 'hp' | 'cs' | 'th' | 'cn' | 'td';
```

Utility functions:
- `extractIdNumber(id)` - parse `"inv-3"` -> `3`
- `getMaxIdNumber(entries, prefix)` - find highest existing ID number
- `nextId(prefix, currentMax)` - generate `"inv-4"`
- `assignIds(existing, newTexts, prefix)` - assign IDs to new entries
- `removeByIds(entries, idsToRemove)` - remove entries by ID, warn if ID not found

**Delete** `src/models/state/tagged-entry.ts` - the entire `TaggedStateEntry`, `parseTaggedEntry`, `isValidCategoryPrefix`, `isValidRemovalPrefix`, `extractPrefixFromRemoval`, `VALID_CATEGORIES` are no longer needed.

---

## Phase 2: State Model Types

### 2a. `src/models/state/inventory.ts`
- `Inventory`: `readonly string[]` -> `readonly KeyedEntry[]`
- `InventoryChanges.removed`: now contains IDs (`"inv-2"`), not text
- `applyInventoryChanges()`: use `removeByIds` + `assignIds` with prefix `'inv'`
- Remove `InventoryItem` type alias (was just `string`)

### 2b. `src/models/state/health.ts`
- `Health`: `readonly string[]` -> `readonly KeyedEntry[]`
- `HealthChanges.removed`: now contains IDs (`"hp-1"`)
- `applyHealthChanges()`: use `removeByIds` + `assignIds` with prefix `'hp'`
- Remove `HealthEntry` type alias

### 2c. `src/models/state/character-state.ts`
- `CharacterState`: `readonly string[]` -> `readonly KeyedEntry[]`
- `AccumulatedCharacterState`: `Record<string, readonly KeyedEntry[]>`
- Replace `SingleCharacterStateChanges` with:
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
- `applyCharacterStateChanges()`:
  - Find global max `cs-N` across ALL characters
  - Process removals: scan all characters for matching IDs
  - Process additions: assign globally sequential `cs-N` IDs
  - Remove empty characters from result

### 2d. `src/models/state/active-state.ts`
- `ActiveState`: `activeThreats/activeConstraints/openThreads` change from `readonly TaggedStateEntry[]` to `readonly KeyedEntry[]`
- Update `isActiveState` type guard: check for `{ id: string, text: string }` instead of `{ prefix, description, raw }`
- `createEmptyActiveState()`: no changes needed (empty arrays are already correct)

### 2e. `src/models/state/active-state-apply.ts`
- Replace `applyTaggedChanges` with `applyKeyedChanges(current, added, removed, prefix)` using `removeByIds` + `assignIds`
- Remove all category validation (`hasExpectedCategoryPrefix`, `StateCategory` import)
- `applyActiveStateChanges()`: call `applyKeyedChanges` with `'th'`, `'cn'`, `'td'` prefixes

### 2f. `src/models/state/index.ts`
- Remove all `tagged-entry.ts` exports
- Add `keyed-entry.ts` exports
- Update changed type exports

---

## Phase 3: LLM Schema + Prompt Changes

### 3a. `src/llm/schemas/writer-schema.ts`
- `threatsAdded` description: `"Plain text description of threat (server assigns ID)"`
- `threatsRemoved` description: `"IDs to remove (e.g., [\"th-1\"]). Use ONLY IDs shown in active threats."`
- Same pattern for constraints and threads (remove all `PREFIX_ID` format references)
- `inventoryRemoved` description: `"IDs to remove (e.g., [\"inv-1\"])"`
- `healthRemoved` description: `"IDs to remove (e.g., [\"hp-2\"])"`
- `characterStateChangesRemoved`: change from `array of { characterName, states }` to **flat `array of string`** (just IDs)

### 3b. `src/llm/schemas/writer-validation-schema.ts`
- Line 87: `characterStateChangesRemoved: CharacterStateChangesArraySchema` -> `z.array(z.string())`
- Rest stays the same (threatsRemoved etc. are already `z.array(z.string())`)

### 3c. `src/llm/schemas/writer-response-transformer.ts`
- Lines 179-184: `characterStateChangesRemoved` processing changes from mapping `{ characterName, states }` objects to just trimming strings:
  ```typescript
  const characterStateChangesRemoved = validated.characterStateChangesRemoved
    .map(id => id.trim()).filter(id => id);
  ```

### 3d. `src/llm/types.ts`
- `WriterResult.characterStateChangesRemoved`: `Array<{ characterName: string; states: string[] }>` -> `string[]`
- `ContinuationContext`: update `accumulatedInventory`, `accumulatedHealth`, `accumulatedCharacterState` to use `KeyedEntry`

### 3e. `src/llm/prompts/sections/shared/state-tracking.ts`
- `ACTIVE_STATE_TRACKING`: Remove all `THREAT_IDENTIFIER: Description` format instructions. Replace with:
  - "To ADD a threat, provide plain text description"
  - "To REMOVE a threat, use its ID exactly as shown (e.g., `th-1`)"
  - Same for constraints and threads
- `INVENTORY_MANAGEMENT`: "Use inventoryRemoved with the item's ID (e.g., `inv-1`)"
- `HEALTH_MANAGEMENT`: "Use healthRemoved with the condition's ID (e.g., `hp-2`)"
- `FIELD_SEPARATION`: Remove `PREFIX_ID: Description format` reference

### 3f. `src/llm/prompts/continuation-prompt.ts`
- Lines 70-78 (character state): `- ${state}` -> `- [${state.id}] ${state.text}`
- Lines 87-93 (inventory): `- ${item}` -> `- [${item.id}] ${item.text}`
- Lines 95-104 (health): `- ${entry}` -> `- [${entry.id}] ${entry.text}`

### 3g. `src/llm/prompts/continuation/active-state-sections.ts`
- `buildThreatsSection`: `- ${t.raw}` -> `- [${t.id}] ${t.text}`
- `buildConstraintsSection`: `- ${c.raw}` -> `- [${c.id}] ${c.text}`
- `buildThreadsSection`: `- ${t.raw}` -> `- [${t.id}] ${t.text}`

### 3h. `src/llm/prompts/opening-prompt.ts`
- Remove `THREAT_IDENTIFIER: Description` format instructions for additions
- Update example JSON to use plain text additions (no prefix)

### 3i. `src/llm/prompts/sections/opening/opening-quality-criteria.ts`
- Remove references to `PREFIX_ID` format

### 3j. `src/llm/prompts/sections/continuation/continuity-rules.ts`
- No structural changes needed (just mentions "NPC CURRENT STATE" etc.)

### 3k. `src/llm/examples.ts`
- Update few-shot examples: `"THREAT_GRIMWALD_SUSPICION: ..."` -> `"Professor Grimwald is watching..."`
- Removal examples: `"THREAT_FIRE"` -> `"th-1"`

---

## Phase 4: Engine Layer

### 4a. `src/engine/character-state-manager.ts`
- `createCharacterStateChanges(added, removed)`: `removed` parameter changes from `Array<{characterName, states}>` to `string[]`

### 4b. `src/engine/inventory-manager.ts`
- Update any helper functions to work with `KeyedEntry` (text lookups use `.text` field)

### 4c. `src/engine/health-manager.ts`
- Same as inventory-manager

### 4d. `src/engine/page-builder.ts`
- `buildFirstPage`/`buildContinuationPage`: pass `result.characterStateChangesRemoved` (now `string[]`)

### 4e. `src/engine/page-service.ts`
- Type propagation for `ContinuationContext` construction (accumulated state fields are now `KeyedEntry[]`)

---

## Phase 5: Persistence Layer

### 5a. `src/persistence/page-serializer-types.ts`
- Replace `TaggedStateEntryFileData { prefix, description, raw }` with `KeyedEntryFileData { id, text }`
- `accumulatedInventory`: `string[]` -> `KeyedEntryFileData[]`
- `accumulatedHealth`: `string[]` -> `KeyedEntryFileData[]`
- `accumulatedCharacterState`: `Record<string, string[]>` -> `Record<string, KeyedEntryFileData[]>`
- `characterStateChanges`: `Array<{ characterName, added, removed }>` -> `{ added: Array<{characterName, states}>, removed: string[] }`

### 5b. `src/persistence/converters/active-state-converter.ts`
- Spread `{ ...entry }` already works for `{ id, text }` (simpler than before with `{ prefix, description, raw }`)
- Type imports change from `TaggedStateEntry` to `KeyedEntry`

### 5c. `src/persistence/page-serializer.ts`
- Update `serializePage` and `deserializePage` for new accumulated state shapes

---

## Phase 6: Migration Script

**Create** `scripts/migrate-to-keyed-entries.ts`

Algorithm:
1. For each story directory in `stories/`:
2. Load all `page_*.json` files
3. Build page tree from `parentPageId` links
4. Process in BFS order from page 1:
   - **Accumulated inventory/health**: Assign `inv-N` / `hp-N` sequentially to each string entry
   - **Accumulated character state**: Assign `cs-N` globally across all characters
   - **Accumulated active state threats/constraints/threads**: Map `{ prefix, description, raw }` -> `{ id: "th-N", text: description }`
   - **Changes (historical)**: Convert `characterStateChanges` to new shape `{ added: [...], removed: [...ids] }`. For old text-based removals in changes, attempt to match to an accumulated entry's assigned ID; if no match, keep as empty (the changes are historical records, accumulated state is authoritative)
5. Write updated JSON back

**Run**: `npx tsx scripts/migrate-to-keyed-entries.ts`

---

## Phase 7: Test Updates

New test file:
- `test/unit/models/state/keyed-entry.test.ts` - unit tests for `assignIds`, `removeByIds`, `extractIdNumber`, `getMaxIdNumber`

Files requiring updates (key changes):
- `test/unit/models/state.test.ts` - all state tests rewritten for `KeyedEntry`
- `test/unit/engine/character-state-manager.test.ts` - new `CharacterStateChanges` shape
- `test/unit/engine/page-builder.test.ts` - `WriterResult` mock updates
- `test/unit/llm/schemas/writer-response-transformer.test.ts` - flat `characterStateChangesRemoved`
- `test/unit/llm/prompts/continuation-prompt.test.ts` - `[id] text` format
- `test/unit/llm/prompts/continuation/active-state-sections.test.ts` - `[id] text` format
- All fixture files using `TaggedStateEntry` or plain string state arrays

---

## Verification

1. `npm run typecheck` - ensures all type changes propagate correctly
2. `npm run test:unit` - model and engine tests pass
3. `npm run test:integration` - full pipeline tests pass
4. `npm run lint` - no lint errors
5. Run migration on existing story, verify page JSONs have `{ id, text }` format
6. Start dev server (`npm run dev`), start a new story, play 3-4 pages:
   - Check browser console for absence of "removal did not match" warnings
   - Verify prompt debug output shows `[inv-1]` style IDs
   - Verify LLM correctly references IDs for removal
   - Verify accumulated state is clean (no stale entries)

---

## Critical Files Summary

| File | Action |
|------|--------|
| `src/models/state/keyed-entry.ts` | CREATE |
| `src/models/state/tagged-entry.ts` | DELETE |
| `src/models/state/inventory.ts` | MODIFY |
| `src/models/state/health.ts` | MODIFY |
| `src/models/state/character-state.ts` | MODIFY (major) |
| `src/models/state/active-state.ts` | MODIFY |
| `src/models/state/active-state-apply.ts` | MODIFY |
| `src/models/state/index.ts` | MODIFY |
| `src/models/page.ts` | MODIFY (type guard) |
| `src/llm/schemas/writer-schema.ts` | MODIFY |
| `src/llm/schemas/writer-validation-schema.ts` | MODIFY |
| `src/llm/schemas/writer-response-transformer.ts` | MODIFY |
| `src/llm/types.ts` | MODIFY |
| `src/llm/prompts/continuation-prompt.ts` | MODIFY |
| `src/llm/prompts/continuation/active-state-sections.ts` | MODIFY |
| `src/llm/prompts/sections/shared/state-tracking.ts` | MODIFY |
| `src/llm/prompts/opening-prompt.ts` | MODIFY |
| `src/llm/examples.ts` | MODIFY |
| `src/engine/character-state-manager.ts` | MODIFY |
| `src/engine/page-builder.ts` | MODIFY |
| `src/persistence/page-serializer-types.ts` | MODIFY |
| `src/persistence/converters/active-state-converter.ts` | MODIFY |
| `src/persistence/page-serializer.ts` | MODIFY |
| `scripts/migrate-to-keyed-entries.ts` | CREATE |
