# KEYSTAENT-07: Create migration script for existing story data

**Status**: PENDING
**Priority**: 7
**Depends on**: KEYSTAENT-06
**Branch**: keyed-state-entries

---

## Summary

Create a migration script that converts all existing story data from the old format (plain strings for inventory/health/character state, `TaggedStateEntry` for active state) to the new `KeyedEntry` format with server-assigned IDs.

## Files to Touch

- `scripts/migrate-to-keyed-entries.ts` — **CREATE**

## What to Implement

### Algorithm

1. For each story directory in `stories/`:
2. Load all `page_*.json` files
3. Build page tree from `parentPageId` links
4. Process in BFS order from page 1:

**Accumulated inventory/health**:
- Assign `inv-N` / `hp-N` sequentially to each string entry
- E.g., `["Sword", "Shield"]` → `[{id:"inv-1",text:"Sword"},{id:"inv-2",text:"Shield"}]`

**Accumulated character state**:
- Assign `cs-N` globally across ALL characters
- E.g., `{"Mira": ["Freed", "Armed"], "Greaves": ["Suspicious"]}` → `{"Mira": [{id:"cs-1",text:"Freed"},{id:"cs-2",text:"Armed"}], "Greaves": [{id:"cs-3",text:"Suspicious"}]}`

**Accumulated active state threats/constraints/threads**:
- Map `{ prefix, description, raw }` → `{ id: "th-N", text: description }`
- Use respective prefixes: `th-N` for threats, `cn-N` for constraints, `td-N` for threads

**Changes (historical records)**:
- `characterStateChanges`: convert from `Array<{characterName, added, removed}>` to `{added: Array<{characterName, states}>, removed: string[]}`
- For old text-based removals in character state changes: attempt to match to an accumulated entry's assigned ID; if no match, drop (changes are historical records, accumulated state is authoritative)
- `inventoryChanges.removed` and `healthChanges.removed`: attempt to match old text to the assigned ID of the corresponding accumulated entry. If no match, keep as-is (best effort).

5. Write updated JSON back to each `page_*.json`

### Implementation Details

- Use `fs` and `path` for file operations
- Process stories sequentially (one at a time) to avoid memory issues
- Log progress: `Processing story {storyId}...`, `  Page {pageId}: migrated`
- Log warnings for unmatched removals
- Create a backup of the original file before overwriting (e.g., `page_1.json.bak`)
- Exit with non-zero code if any story fails to migrate

### Run Command

```bash
npx tsx scripts/migrate-to-keyed-entries.ts
```

## Out of Scope

- Runtime code changes (all handled in KEYSTAENT-01 through KEYSTAENT-06)
- Test file updates (KEYSTAENT-08)
- Rollback script (can restore from `.bak` files)
- `story.json` migration — only `page_*.json` files need changes

## Acceptance Criteria

### Tests that must pass

No automated test file for this script (it operates on real `stories/` data). Instead, manual verification:

1. Script runs without errors on the existing `stories/` directory (or no-ops if empty)
2. Script creates `.bak` backup files before overwriting
3. After migration, `page_*.json` files contain:
   - `accumulatedInventory` as `[{id,text}]` arrays
   - `accumulatedHealth` as `[{id,text}]` arrays
   - `accumulatedCharacterState` as `Record<string, [{id,text}]>`
   - `accumulatedActiveState.activeThreats` as `[{id,text}]` (not `{prefix,description,raw}`)
   - `characterStateChanges` as `{added:[...], removed:[...ids]}`
4. IDs are sequential and consistent within each page's accumulated state
5. BFS ordering ensures parent page IDs are assigned before children reference them
6. Script is idempotent: running twice produces same result

### Invariants that must remain true

- No data loss during migration (all text content preserved)
- Parent-child page relationships are preserved
- Story navigation continues to work after migration
- Backup files are always created before overwriting
