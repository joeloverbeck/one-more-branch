# KEYSTAENT-03: Update LLM schemas, validation, and response transformer

**Status**: PENDING
**Priority**: 3
**Depends on**: KEYSTAENT-02
**Branch**: keyed-state-entries

---

## Summary

Update the writer JSON schema descriptions, Zod validation schema, response transformer, and `WriterResult` / `ContinuationContext` types to reflect the keyed-entry system. The LLM now sends plain text for additions (server assigns IDs) and IDs for removals.

## Files to Touch

- `src/llm/schemas/writer-schema.ts` — **MODIFY**
- `src/llm/schemas/writer-validation-schema.ts` — **MODIFY**
- `src/llm/schemas/writer-response-transformer.ts` — **MODIFY**
- `src/llm/types.ts` — **MODIFY**

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

- Line 87: `characterStateChangesRemoved: CharacterStateChangesArraySchema` → `z.array(z.string()).optional().default([])`
- Everything else stays the same (threatsRemoved etc. are already `z.array(z.string())`)

### `writer-response-transformer.ts`

- Lines 179-184: Replace the `characterStateChangesRemoved` processing block:
  ```typescript
  // OLD: mapped {characterName, states} objects
  // NEW: flat array of ID strings
  const characterStateChangesRemoved = validated.characterStateChangesRemoved
    .map((id: string) => id.trim())
    .filter((id: string) => id);
  ```
- Update the return type assignment accordingly

### `types.ts`

- `WriterResult.characterStateChangesRemoved`: change from `Array<{ characterName: string; states: string[] }>` to `string[]`
- `ContinuationContext.accumulatedInventory`: change from `readonly string[]` to `readonly KeyedEntry[]`
- `ContinuationContext.accumulatedHealth`: change from `readonly string[]` to `readonly KeyedEntry[]`
- `ContinuationContext.accumulatedCharacterState`: change from `Readonly<Record<string, readonly string[]>>` to `Readonly<Record<string, readonly KeyedEntry[]>>`
- Add import for `KeyedEntry` from `../models/state/index.js`

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
7. Type test: `ContinuationContext.accumulatedInventory` accepts `KeyedEntry[]`

### Invariants that must remain true

- `WriterResultSchema.parse()` still validates all required fields
- The `superRefine` checks (ending/choice counts, uniqueness) still work
- All non-character-state-removed fields keep their existing validation behavior
- `npm run typecheck` passes for all files in `src/llm/schemas/` and `src/llm/types.ts`
