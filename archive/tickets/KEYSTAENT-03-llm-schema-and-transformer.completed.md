# KEYSTAENT-03: Update LLM schemas, validation, and response transformer

**Status**: ✅ COMPLETED
**Priority**: 3
**Depends on**: KEYSTAENT-02
**Branch**: keyed-state-entries

---

## Summary

Align writer schema metadata and tests with the keyed-entry contract in `specs/keyed-state-entries.md`. Removals are ID-based and additions are plain text. This ticket is a breaking-change cleanup with no legacy/backward-compat handling.

## Reassessed Assumptions (Current Code vs Ticket)

- `src/llm/schemas/writer-validation-schema.ts`: `characterStateChangesRemoved` is already `z.array(z.string()).optional().default([])`.
- `src/llm/schemas/writer-response-transformer.ts`: `characterStateChangesRemoved` is already transformed as a flat trimmed `string[]`.
- `src/llm/types.ts`: `WriterResult.characterStateChangesRemoved` and `ContinuationContext` keyed-entry fields are already updated.
- `src/llm/schemas/writer-schema.ts`: still contains legacy `THREAT_/CONSTRAINT_/THREAD_` and exact-text removal descriptions; `characterStateChangesRemoved.items` still uses legacy object shape.
- `test/unit/llm/types.test.ts`: still has stale tagged-entry examples (`prefix/description/raw`) and string-array accumulated state examples that no longer match `ActiveState`/`ContinuationContext`.

## Files to Touch

- `src/llm/schemas/writer-schema.ts` — **MODIFY**
- `test/unit/llm/schemas/writer-schema.test.ts` — **MODIFY**
- `test/unit/llm/types.test.ts` — **MODIFY**

## What to Implement

### `writer-schema.ts`

Update JSON schema `description` fields:
- `threatsAdded`: `"Plain text description of new threat (server assigns ID). E.g., \"Fire is spreading through the building\". Empty array if none."`
- `threatsRemoved`: `"IDs to remove, e.g., [\"th-1\"]. Use ONLY IDs shown in ACTIVE THREATS. Empty array if none."`
- `constraintsAdded`: same pattern as threats (plain text, no prefix)
- `constraintsRemoved`: `"IDs to remove, e.g., [\"cn-1\"]. Use ONLY IDs shown in ACTIVE CONSTRAINTS."`
- `threadsAdded`: same pattern (plain text)
- `threadsResolved`: `"IDs to resolve, e.g., [\"td-1\"]. Use ONLY IDs shown in OPEN NARRATIVE THREADS."`
- `inventoryRemoved`: `"IDs to remove, e.g., [\"inv-1\"]. Use ONLY IDs shown in YOUR INVENTORY."`
- `healthRemoved`: `"IDs to remove, e.g., [\"hp-2\"]. Use ONLY IDs shown in YOUR HEALTH."`
- `characterStateChangesRemoved`: Change from array of `{characterName, states}` objects to **flat array of strings** (just IDs). Update the `items` schema from `{type:'object',...}` to `{type:'string'}`. Description: `"IDs to remove, e.g., [\"cs-1\", \"cs-3\"]. Use ONLY IDs shown in NPC CURRENT STATE."`

### `writer-validation-schema.ts`

- No functional changes required in this ticket (already matches keyed-entry expectations).

### `writer-response-transformer.ts`

- No functional changes required in this ticket (already handles `characterStateChangesRemoved` as `string[]`).

### `types.ts`

- No functional changes required in this ticket (already keyed-entry based).

### `test/unit/llm/types.test.ts`

- Replace stale tagged-entry fixtures with keyed-entry fixtures (`{ id, text }`).
- Replace string-array accumulated inventory/health examples with `KeyedEntry[]`.
- Assert against `.id`/`.text` instead of legacy `.prefix`/`.raw`.

## Out of Scope

- Prompt text changes (KEYSTAENT-04)
- Few-shot example updates (KEYSTAENT-04)
- Engine layer changes (KEYSTAENT-05)
- Persistence layer changes (KEYSTAENT-06)
- Opening/continuation quality criteria text (KEYSTAENT-04)

## Acceptance Criteria

### Tests that must pass

Update `test/unit/llm/schemas/writer-response-transformer.test.ts`:

1. A valid response with `characterStateChangesRemoved: ["cs-1", "cs-3"]` parses successfully and returns `characterStateChangesRemoved: ["cs-1", "cs-3"]`
2. A valid response with `characterStateChangesRemoved: []` returns empty array
3. Whitespace-only IDs in `characterStateChangesRemoved` are filtered out
4. All other fields (narrative, choices, threatsAdded, etc.) continue to validate correctly

Update `test/unit/llm/schemas/writer-schema.test.ts`:

5. `characterStateChangesRemoved` schema field is `{type:'array', items:{type:'string'}}`, not object array

Update `test/unit/llm/types.test.ts`:

6. Type test: `WriterResult.characterStateChangesRemoved` accepts `string[]`
7. Type test: `ContinuationContext.accumulatedInventory` and `accumulatedHealth` accept `KeyedEntry[]`
8. Type test: populated `activeState` uses keyed entries (`{ id, text }`) instead of tagged entries (`{ prefix, description, raw }`)

### Invariants that must remain true

- `WriterResultSchema.parse()` still validates all required fields
- The `superRefine` checks (ending/choice counts, uniqueness) still work
- All non-targeted transformer/validation/type behavior remains unchanged
- `npm run typecheck` passes for all files in `src/llm/schemas/` and `src/llm/types.ts`

## Outcome

- **Completion date**: 2026-02-10
- **What changed**:
  - Updated `src/llm/schemas/writer-schema.ts` to keyed-entry wording for additions/removals and changed `characterStateChangesRemoved.items` to `string`.
  - Strengthened `test/unit/llm/schemas/writer-schema.test.ts` to assert keyed-id descriptions and string-array shape for `characterStateChangesRemoved`.
  - Added `characterStateChangesRemoved: ["cs-1", "cs-3"]` preservation coverage in `test/unit/llm/schemas/writer-response-transformer.test.ts`.
  - Updated stale legacy fixtures in `test/unit/llm/types.test.ts` from tagged entries / string arrays to keyed entries (`{ id, text }`).
- **Deviations from original plan**:
  - No code changes were needed in `writer-validation-schema.ts`, `writer-response-transformer.ts`, or `types.ts`; those were already compliant when reassessed.
  - Added a targeted `types.test.ts` cleanup because it still encoded pre-keyed assumptions not reflected in the original ticket wording.
- **Verification results**:
  - `npm run typecheck` passed.
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/llm/schemas/writer-schema.test.ts test/unit/llm/schemas/writer-response-transformer.test.ts test/unit/llm/types.test.ts` passed.
  - `npm run test:integration -- --runTestsByPath test/integration/llm/schema-pipeline.test.ts` passed.
