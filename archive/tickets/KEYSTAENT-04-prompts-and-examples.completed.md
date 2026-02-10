# KEYSTAENT-04: Update LLM prompts, quality criteria, and few-shot examples

**Status**: ✅ COMPLETED
**Priority**: 4
**Depends on**: KEYSTAENT-02, KEYSTAENT-03
**Branch**: keyed-state-entries

---

## Summary

Finalize keyed-entry prompt guidance by removing remaining legacy `PREFIX_ID: Description` instructions and updating few-shot examples to use plain-text additions and ID-based removals.

## Assumption Reassessment (Before Implementation)

The original ticket assumed several files were still un-migrated. Current code state differs:

- `src/llm/prompts/continuation-prompt.ts` already renders keyed entries as `- [id] text` for character state, inventory, and health.
- `src/llm/prompts/continuation/active-state-sections.ts` already renders threats/constraints/threads as `- [id] text`.
- Remaining legacy behavior is concentrated in:
  - `src/llm/prompts/sections/shared/state-tracking.ts`
  - `src/llm/prompts/opening-prompt.ts`
  - `src/llm/prompts/sections/opening/opening-quality-criteria.ts`
  - `src/llm/few-shot-data.ts`
- Existing tests still assert legacy prefix formats in several prompt/example test files and need updating.

Scope is narrowed to those remaining legacy prompt/example files and the tests that validate them.

## Files to Touch

- `src/llm/prompts/sections/shared/state-tracking.ts` — **MODIFY**
- `src/llm/prompts/opening-prompt.ts` — **MODIFY**
- `src/llm/prompts/sections/opening/opening-quality-criteria.ts` — **MODIFY**
- `src/llm/few-shot-data.ts` — **MODIFY**
- `test/unit/llm/prompts/sections/shared/state-tracking.test.ts` — **MODIFY**
- `test/unit/llm/prompts/opening-prompt.test.ts` — **MODIFY**
- `test/unit/llm/prompts/sections/opening/quality-criteria.test.ts` — **MODIFY**
- `test/unit/llm/examples.test.ts` — **MODIFY**

## What to Implement

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

Update `test/unit/llm/prompts/sections/shared/state-tracking.test.ts`:

1. `ACTIVE_STATE_TRACKING` does NOT contain `THREAT_IDENTIFIER:` or `PREFIX_ID:` strings
2. `ACTIVE_STATE_TRACKING` contains `th-1` and `cn-1` style ID references
3. Inventory/health guidance references ID-based removals (`inv-N`, `hp-N`)
4. `FIELD_SEPARATION` no longer references `PREFIX_ID: Description`

Update `test/unit/llm/prompts/opening-prompt.test.ts`:

5. Opening prompt does NOT contain `PREFIX_ID: description` format instructions
6. Opening prompt example JSON uses plain text for additions

Update `test/unit/llm/examples.test.ts`:

7. Few-shot examples do NOT contain `THREAT_`, `CONSTRAINT_`, or `THREAD_` prefixes in added entries
8. Few-shot removal examples use `th-N`, `cn-N`, `td-N` format IDs

Update `test/unit/llm/prompts/sections/opening/quality-criteria.test.ts`:

9. Opening quality examples use plain-text additions (no `THREAT_`/`CONSTRAINT_`/`THREAD_` prefixes)
10. Assertions expecting prefix-format examples are removed/replaced

### Invariants that must remain true

- All prompt sections build without errors when given valid `KeyedEntry[]` data
- Prompt text is clear to the LLM about the distinction: plain text for additions, IDs for removals
- Few-shot examples are internally consistent (removals reference IDs that would exist from prior additions)
- `npm run typecheck` passes for all prompt files
- No legacy prefix-format instructions remain in opening/shared prompt guidance

## Outcome

- **Completion date**: 2026-02-10
- **What actually changed**:
  - Updated remaining legacy prompt guidance in shared state-tracking, opening prompt instructions, opening quality criteria, and few-shot data.
  - Replaced legacy prefix-based examples with plain-text additions and ID-based removals (`th-N`, `cn-N`, `td-N`, `inv-N`, `hp-N`) where applicable.
  - Updated prompt/example unit tests that still enforced legacy prefix behavior.
- **Deviation from original plan**:
  - `continuation-prompt.ts` and `continuation/active-state-sections.ts` were already compliant and required no code changes.
  - Scope was narrowed to only the remaining legacy files plus directly affected tests.
- **Verification results**:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/sections/shared/state-tracking.test.ts test/unit/llm/prompts/opening-prompt.test.ts test/unit/llm/prompts/sections/opening/quality-criteria.test.ts test/unit/llm/examples.test.ts` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/prompts/continuation-prompt.test.ts test/unit/llm/prompts/continuation/active-state-sections.test.ts` passed.
