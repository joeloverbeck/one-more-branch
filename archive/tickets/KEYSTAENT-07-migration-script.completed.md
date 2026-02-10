# KEYSTAENT-07: Create migration script for existing story data

**Status**: ✅ COMPLETED
**Priority**: 7
**Depends on**: KEYSTAENT-06
**Branch**: keyed-state-entries

---

## Summary

Create a one-time migration script that converts existing legacy `page_*.json` story data to keyed-entry persistence format (`{ id, text }`), with no runtime legacy compatibility paths.

## Reassessed Assumptions (2026-02-10)

Current repository state differs from this ticket's original assumptions:

- `scripts/migrate-to-keyed-entries.ts` does not exist yet.
- `stories/*/page_*.json` currently still use legacy persisted shapes:
  - `accumulatedInventory`/`accumulatedHealth` are plain string arrays.
  - `accumulatedCharacterState` is `Record<string, string[]>`.
  - `accumulatedActiveState` still uses `{ prefix, description, raw }` entries.
  - `characterStateChanges` is still legacy array shape (`Array<{ characterName, added, removed }>`).
- The original ticket claimed "No automated test file". That is too weak for this migration risk profile; this ticket should include targeted unit tests for migration behavior and idempotence.

## Files to Touch (Revised Scope)

- `src/persistence/migrate-keyed-entries.ts` — **CREATE**
- `scripts/migrate-to-keyed-entries.ts` — **CREATE**
- `test/unit/persistence/migrate-keyed-entries.test.ts` — **CREATE**

## What to Implement

### Migration Behavior

For each story directory in `stories/`:

1. Load all `page_*.json` files.
2. Build page tree from `parentPageId` links.
3. Process in BFS order from page 1 (or available roots), inheriting parent keyed context.
4. Convert persisted legacy fields:

- **Accumulated inventory/health**
  - Convert string entries to `{ id, text }`.
  - Use IDs `inv-N` / `hp-N`.
  - Reuse parent IDs for unchanged entries where possible; assign new IDs only for newly observed entries.

- **Accumulated character state**
  - Convert `Record<string, string[]>` to `Record<string, Array<{ id, text }>>`.
  - Assign `cs-N` IDs globally across all characters within a lineage.

- **Accumulated active state**
  - Convert `{ prefix, description, raw }` entries to `{ id, text }`.
  - Use `th-N`, `cn-N`, `td-N` for threats/constraints/threads.

- **Historical changes**
  - `characterStateChanges`: convert from legacy array shape to `{ added: Array<{characterName, states}>, removed: string[] }`.
  - For legacy text removals in character changes: map to IDs using parent/current keyed mapping; if unmatched, drop and warn.
  - `inventoryChanges.removed` / `healthChanges.removed`: map to IDs when possible; if unmatched, keep original value and warn (best effort).
  - Active-state addition strings in legacy `PREFIX_ID: description` style should be normalized to plain text descriptions.

5. Write updated JSON back to each changed `page_*.json`.

### Script behavior

- Process stories sequentially.
- Log progress per story and page.
- Create `.bak` backup file before first overwrite of a page file.
- Non-zero exit when a story migration fails.
- Idempotent: running twice should not change already-migrated files.

### Run Command

```bash
npx tsx scripts/migrate-to-keyed-entries.ts
```

## Out of Scope

- Runtime compatibility code for legacy persisted shapes (breaking-change policy remains in force)
- `story.json` migration (only `page_*.json`)
- Rollback automation (manual restore from `.bak` is sufficient)

## Acceptance Criteria (Revised)

### Automated tests that must pass

1. Legacy `page_*.json` data migrates to keyed-entry persisted shape for all keyed fields.
2. Child-page legacy removals resolve to parent-assigned IDs where possible.
3. Character-state legacy change arrays become `{ added, removed }` object shape.
4. Unmatched removals follow best-effort policy:
   - character removals dropped
   - inventory/health removals retained as original values
5. Script migration is idempotent on already-migrated data.
6. `.bak` files are created before first overwrite.

### Invariants that must remain true

- No loss of persisted accumulated-state text content during conversion.
- Parent-child relationships are preserved.
- Breaking-change stance is preserved: runtime code remains keyed-only; legacy handling is migration-only.

## Outcome

- **Completion date**: 2026-02-10
- **What was actually changed**:
  - Added migration implementation at `src/persistence/migrate-keyed-entries.ts` with BFS page traversal, parent-context ID reuse, legacy-to-keyed conversion, removal mapping, warning behavior, backup creation, and idempotent writes.
  - Added CLI entrypoint at `scripts/migrate-to-keyed-entries.ts`.
  - Added focused unit coverage at `test/unit/persistence/migrate-keyed-entries.test.ts` for migration conversion, parent-removal ID mapping, unmatched-removal handling, backup creation, and idempotence.
- **Deviations from original plan**:
  - Replaced manual-only verification with automated migration tests in this ticket due risk and invariant coverage needs.
  - Implemented migration logic in `src/persistence/` plus a thin script wrapper for testability instead of script-only implementation.
- **Verification results**:
  - `npm run typecheck` passed.
  - `npm run test:unit -- --coverage=false --testPathPattern=test/unit/persistence/migrate-keyed-entries.test.ts` passed (this command pattern in this repo also runs the full unit suite, which passed).
