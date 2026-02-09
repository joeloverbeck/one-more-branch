# KEYSTAENT-01: Create KeyedEntry foundation type and delete TaggedEntry

**Status**: ✅ COMPLETED
**Priority**: 1 (no dependencies)
**Branch**: keyed-state-entries

---

## Summary

Create the `KeyedEntry` interface and all utility functions in a new `src/models/state/keyed-entry.ts` module. Delete the now-superseded `src/models/state/tagged-entry.ts`.

## Files to Touch

- `src/models/state/keyed-entry.ts` — **CREATE**
- `src/models/state/tagged-entry.ts` — **DELETE**

## What to Implement

### `src/models/state/keyed-entry.ts`

```typescript
export interface KeyedEntry {
  readonly id: string;   // e.g., "inv-1", "cs-3", "th-2"
  readonly text: string; // the descriptive content
}

export type StateIdPrefix = 'inv' | 'hp' | 'cs' | 'th' | 'cn' | 'td';
```

Utility functions:
- `extractIdNumber(id: string): number` — parse `"inv-3"` → `3`. Throw on malformed input.
- `getMaxIdNumber(entries: readonly KeyedEntry[], prefix: StateIdPrefix): number` — find highest existing ID number for a given prefix. Return `0` if none.
- `nextId(prefix: StateIdPrefix, currentMax: number): string` — generate `"inv-4"` from `('inv', 3)`.
- `assignIds(existing: readonly KeyedEntry[], newTexts: readonly string[], prefix: StateIdPrefix): readonly KeyedEntry[]` — compute currentMax from `existing`, assign sequential IDs to `newTexts`, return new array of `KeyedEntry`. Skip empty/whitespace-only strings.
- `removeByIds(entries: readonly KeyedEntry[], idsToRemove: readonly string[]): readonly KeyedEntry[]` — remove entries by ID. Log warning via `modelWarn` for each ID that doesn't match any entry.

### Delete `src/models/state/tagged-entry.ts`

Remove the entire file. All exports (`TaggedStateEntry`, `parseTaggedEntry`, `isValidCategoryPrefix`, `isValidRemovalPrefix`, `extractPrefixFromRemoval`, `VALID_CATEGORIES`, `StateCategory`) are superseded.

## Out of Scope

- Updating any importers of `tagged-entry.ts` (those are handled in KEYSTAENT-02 through KEYSTAENT-06)
- Modifying `src/models/state/index.ts` barrel exports (KEYSTAENT-02)
- Any LLM prompt, schema, engine, or persistence changes
- Migration script

## Acceptance Criteria

### Tests that must pass

Create `test/unit/models/state/keyed-entry.test.ts`:

1. `extractIdNumber("inv-3")` returns `3`
2. `extractIdNumber("cs-0")` returns `0`
3. `extractIdNumber("th-12")` returns `12`
4. `extractIdNumber("garbage")` throws
5. `getMaxIdNumber([], 'inv')` returns `0`
6. `getMaxIdNumber([{id:'inv-3',text:'x'},{id:'inv-1',text:'y'}], 'inv')` returns `3`
7. `getMaxIdNumber([{id:'th-5',text:'x'}], 'inv')` returns `0` (wrong prefix ignored)
8. `nextId('inv', 3)` returns `"inv-4"`
9. `nextId('hp', 0)` returns `"hp-1"`
10. `assignIds([], ['Sword', 'Shield'], 'inv')` returns `[{id:'inv-1',text:'Sword'},{id:'inv-2',text:'Shield'}]`
11. `assignIds([{id:'inv-3',text:'Key'}], ['Potion'], 'inv')` returns `[{id:'inv-4',text:'Potion'}]`
12. `assignIds([], ['', '  '], 'inv')` returns `[]` (empty strings skipped)
13. `removeByIds([{id:'inv-1',text:'Sword'},{id:'inv-2',text:'Shield'}], ['inv-1'])` returns `[{id:'inv-2',text:'Shield'}]`
14. `removeByIds([{id:'th-1',text:'Fire'}], ['th-99'])` returns `[{id:'th-1',text:'Fire'}]` and logs warning

### Invariants that must remain true

- `KeyedEntry.id` is always a string matching pattern `^(inv|hp|cs|th|cn|td)-\d+$`
- `assignIds` never produces duplicate IDs
- `removeByIds` is immutable — returns new array, never mutates input
- All functions are pure (no side effects except `modelWarn` logging)
- `npm run typecheck` passes (note: downstream files WILL fail type-checking until subsequent tickets land; this ticket only requires that `keyed-entry.ts` and its test compile)

## Outcome

**Completed**: 2026-02-09

**What was implemented**:
- Created `src/models/state/keyed-entry.ts` with `KeyedEntry` interface, `StateIdPrefix` type, and all utility functions (`extractIdNumber`, `getMaxIdNumber`, `nextId`, `assignIds`, `removeByIds`)
- Deleted `src/models/state/tagged-entry.ts` (superseded)
- Created `test/unit/models/state/keyed-entry.test.ts` with all specified acceptance criteria tests

**Deviations**: None. Implementation matches the ticket specification.
