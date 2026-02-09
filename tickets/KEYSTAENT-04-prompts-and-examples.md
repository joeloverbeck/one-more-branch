# KEYSTAENT-04: Update LLM prompts, quality criteria, and few-shot examples

**Status**: PENDING
**Priority**: 4
**Depends on**: KEYSTAENT-02, KEYSTAENT-03
**Branch**: keyed-state-entries

---

## Summary

Update all prompt text to display keyed entries in `[id] text` format, remove `PREFIX_ID: Description` format instructions, and update few-shot examples to use plain-text additions and ID-based removals.

## Files to Touch

- `src/llm/prompts/continuation-prompt.ts` — **MODIFY**
- `src/llm/prompts/continuation/active-state-sections.ts` — **MODIFY**
- `src/llm/prompts/sections/shared/state-tracking.ts` — **MODIFY**
- `src/llm/prompts/opening-prompt.ts` — **MODIFY**
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts` — **MODIFY**
- `src/llm/few-shot-data.ts` — **MODIFY**

## What to Implement

### `continuation-prompt.ts`

Lines 70-78 (character state section):
- Change `- ${state}` → `- [${state.id}] ${state.text}` (the `states` are now `KeyedEntry[]`)

Lines 87-93 (inventory section):
- Change `- ${item}` → `- [${item.id}] ${item.text}` (items are now `KeyedEntry[]`)

Lines 95-104 (health section):
- Change `- ${entry}` → `- [${entry.id}] ${entry.text}` (entries are now `KeyedEntry[]`)

### `active-state-sections.ts`

- `buildThreatsSection`: `- ${t.raw}` → `- [${t.id}] ${t.text}`
- `buildConstraintsSection`: `- ${c.raw}` → `- [${c.id}] ${c.text}`
- `buildThreadsSection`: `- ${t.raw}` → `- [${t.id}] ${t.text}`

### `state-tracking.ts`

`ACTIVE_STATE_TRACKING`:
- Remove all `THREAT_IDENTIFIER: Description` format instructions
- Replace with:
  - "To ADD a threat, provide a plain text description (the server assigns an ID automatically)"
  - "To REMOVE a threat, use its ID exactly as shown in ACTIVE THREATS (e.g., `th-1`)"
  - Same pattern for constraints (`cn-N`) and threads (`td-N`)
- Update the example JSON: additions become plain text (no prefix), removals become IDs

`INVENTORY_MANAGEMENT`:
- Add: "To remove an item, use its ID exactly as shown in YOUR INVENTORY (e.g., `inv-1`)"

`HEALTH_MANAGEMENT`:
- Add: "To remove a condition, use its ID exactly as shown in YOUR HEALTH (e.g., `hp-2`)"

`FIELD_SEPARATION`:
- Remove `PREFIX_ID: Description format` reference for active state
- Update to reference ID-based removal

### `opening-prompt.ts`

- Remove `Use the PREFIX_ID: description format for all added entries` instruction
- Update example JSON: additions become plain text (e.g., `"Must deliver the package by nightfall"` not `"CONSTRAINT_DEADLINE: Must deliver the package by nightfall"`)
- Update line 85: remove `PREFIX_ID: description format` reference
- Update line 77 (threatsAdded instruction): "Establish any starting THREATS using threatsAdded (plain text descriptions)"
- Update line 78 (constraintsAdded instruction): similar
- Update line 79 (threadsAdded instruction): similar

### `opening-quality-criteria.ts`

`OPENING_ACTIVE_STATE_QUALITY`:
- Update examples: remove `THREAT_GUARDS:` prefix → just `"Two guards watch the town gate"`
- Same for constraints and threads
- Remove "BAD INITIAL ENTRIES" section about prefix format

### `few-shot-data.ts`

Update all three examples:

**OPENING_EXAMPLE_RESPONSE**:
- `threatsAdded`: `"THREAT_GRIMWALD_SUSPICION: Professor Grimwald is watching you closely"` → `"Professor Grimwald is watching you closely"`
- `constraintsAdded`: `"CONSTRAINT_CLASS_IN_SESSION: You are in the middle of a lecture"` → `"You are in the middle of a lecture"`
- `threadsAdded`: remove `THREAD_` prefixes from descriptions

**CONTINUATION_EXAMPLE_RESPONSE**:
- `threatsAdded`: remove `THREAT_FACULTY_APPROACHING:` prefix
- `constraintsAdded`: remove `CONSTRAINT_RESTRICTED_AREA:` prefix
- `constraintsRemoved`: `"CONSTRAINT_CLASS_IN_SESSION"` → `"cn-1"` (ID referencing the constraint from opening)
- `threadsAdded`: remove `THREAD_STATUE_MECHANISM:` prefix

**ENDING_EXAMPLE_RESPONSE**:
- `threatsRemoved`: `["THREAT_GRIMWALD_SUSPICION", "THREAT_FACULTY_APPROACHING"]` → `["th-1", "th-2"]`
- `constraintsRemoved`: `["CONSTRAINT_RESTRICTED_AREA"]` → `["cn-2"]`
- `threadsResolved`: `["THREAD_FORBIDDEN_LIBRARY", "THREAD_JOURNAL_ORIGIN"]` → `["td-1", "td-2"]`

## Out of Scope

- `src/llm/prompts/sections/continuation/continuity-rules.ts` — no structural changes needed (just mentions "NPC CURRENT STATE")
- Schema/validation changes (KEYSTAENT-03)
- Engine or persistence changes (KEYSTAENT-05, KEYSTAENT-06)
- Migration script (KEYSTAENT-07)

## Acceptance Criteria

### Tests that must pass

Update `test/unit/llm/prompts/continuation-prompt.test.ts`:

1. Character state section renders `[cs-1] Gave protagonist a map` format (not plain string)
2. Inventory section renders `[inv-1] Rusty iron key` format
3. Health section renders `[hp-1] Bruised arm` format
4. Empty state sections still render correctly (empty or default text)

Update `test/unit/llm/prompts/continuation/active-state-sections.test.ts`:

5. `buildThreatsSection` renders `[th-1] Fire everywhere` format
6. `buildConstraintsSection` renders `[cn-1] Hands are bound` format
7. `buildThreadsSection` renders `[td-1] Missing child mystery` format

Update `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`:

8. `ACTIVE_STATE_TRACKING` does NOT contain `THREAT_IDENTIFIER:` or `PREFIX_ID:` strings
9. `ACTIVE_STATE_TRACKING` contains `th-1` and `cn-1` style ID references

Update `test/unit/llm/prompts/opening-prompt.test.ts`:

10. Opening prompt does NOT contain `PREFIX_ID: description` format instructions
11. Opening prompt example JSON uses plain text for additions

Update `test/unit/llm/examples.test.ts`:

12. Few-shot examples do NOT contain `THREAT_`, `CONSTRAINT_`, or `THREAD_` prefixes in added entries
13. Few-shot removal examples use `th-N`, `cn-N`, `td-N` format IDs

### Invariants that must remain true

- All prompt sections build without errors when given valid `KeyedEntry[]` data
- Prompt text is clear to the LLM about the distinction: plain text for additions, IDs for removals
- Few-shot examples are internally consistent (removals reference IDs that would exist from prior additions)
- `npm run typecheck` passes for all prompt files
