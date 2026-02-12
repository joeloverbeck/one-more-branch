# Spec: Analyst narrativeSummary Always Populated

## Overview

Change the analyst output contract so that `narrativeSummary` is always populated (not just on deviation). This makes the field available for planner context compression in future improvements and ensures consistent analyst output.

## Goals

1. Update the analyst schema description to instruct always populating `narrativeSummary`
2. Update the analyst prompt if it mentions "empty when no deviation" for this field
3. Ensure downstream consumers are unaffected (the field is already a required string)

## Dependencies

**None** - This is a standalone behavioral change to the analyst.

## Implementation Details

### File: `src/llm/schemas/analyst-schema.ts`

**Line 39-41**, change the `narrativeSummary` description from:

```typescript
'Short summary of current narrative state for rewrite context; empty when no deviation.'
```

To:

```typescript
'Short summary of current narrative state. Always populate — used for planner context compression and rewrite context.'
```

### File: `src/llm/prompts/analyst-prompt.ts`

Review `ANALYST_SYSTEM_PROMPT` for any mention of `narrativeSummary` being empty when no deviation. The current system prompt does not explicitly mention narrativeSummary emptiness rules, but verify this.

If found, update to: "Always provide a narrativeSummary of the current narrative state, regardless of whether deviation was detected."

### What NOT to Change

- `AnalystResult` type in `src/llm/types.ts` - `narrativeSummary: string` is already a required string field; no type change needed
- Deviation handling logic - narrativeSummary is already available when deviation is detected; this change just ensures it's non-empty in all cases
- Analyst response transformer - No structural changes needed; the field is already extracted as-is
- Any other analyst schema fields - Unchanged

## Invariants

- `narrativeSummary` is always a non-empty string in analyst output
- Deviation handling still works (narrativeSummary is available when deviation is detected)
- No downstream consumers break (the field was already a required string in the schema and type)
- The analyst prompt correctly instructs always populating the field

## Test Impact

- Test mocks for `AnalystResult` that have `narrativeSummary: ''` in no-deviation cases should be updated to have a non-empty value (to match the new behavioral expectation)
- Any snapshot tests of analyst schema descriptions must be updated
- `npm run typecheck` must pass
- `npm run test` must pass

## Verification

1. Read the updated schema and confirm the description instructs always populating
2. Read the analyst prompt and confirm no contradictory "empty when no deviation" instructions exist
3. Grep test files for `narrativeSummary: ''` or `narrativeSummary: ""` and update any that represent no-deviation cases
4. Run `npm run typecheck && npm test`
