# WRIANASPL-05: Create Analyst JSON Schema, Zod Validation, and Response Transformer

## Summary

Create the complete analyst schema layer: JSON schema for OpenRouter, Zod validation, and response transformer. The analyst schema is small (6 fields) so all three files are bundled in one ticket.

## Files to Touch

- `src/llm/schemas/analyst-schema.ts` — **New file**: `ANALYST_SCHEMA` constant (JSON schema)
- `src/llm/schemas/analyst-validation-schema.ts` — **New file**: `AnalystResultSchema` Zod schema
- `src/llm/schemas/analyst-response-transformer.ts` — **New file**: `validateAnalystResponse()` function
- `test/unit/llm/schemas/analyst-response-transformer.test.ts` — **New file**: Unit tests

## Out of Scope

- Do NOT modify any existing schema files
- Do NOT update `schemas/index.ts` exports (that is WRIANASPL-10)
- Do NOT create any generation strategy or prompt files

## Implementation Details

### `analyst-schema.ts`

Export `ANALYST_SCHEMA: JsonSchema` with exactly these 6 properties:

| Field | Type | Description |
|-------|------|-------------|
| `beatConcluded` | boolean | Whether the active beat objective was achieved |
| `beatResolution` | string | How the beat was resolved (required when beatConcluded is true) |
| `deviationDetected` | boolean | Whether narrative deviates from planned beats |
| `deviationReason` | string | Explanation for deviation; empty when none |
| `invalidatedBeatIds` | array of strings | Beat IDs invalidated by deviation (format: X.Y) |
| `narrativeSummary` | string | Summary for rewrite context; empty when no deviation |

All 6 fields are required. `additionalProperties: false`, `strict: true`. Schema name: `'analyst_evaluation'`.

### `analyst-validation-schema.ts`

Export `AnalystResultSchema` as a Zod object:

```typescript
export const AnalystResultSchema = z.object({
  beatConcluded: z.boolean().default(false),
  beatResolution: z.string().default(''),
  deviationDetected: z.boolean().default(false),
  deviationReason: z.string().default(''),
  invalidatedBeatIds: z.array(z.string()).optional().default([]),
  narrativeSummary: z.string().default(''),
});
```

No `superRefine` needed — the analyst schema is simple.

### `analyst-response-transformer.ts`

Export `validateAnalystResponse(rawJson: unknown, rawResponse: string): AnalystResult`:

1. Parse raw JSON (handle string input via `JSON.parse` if needed)
2. Validate via `AnalystResultSchema`
3. Trim all string fields
4. Filter `invalidatedBeatIds` to match `X.Y` pattern: `/^\d+\.\d+$/`
5. Return `AnalystResult` (include `rawResponse`)

## Acceptance Criteria

### Tests that must pass

- `test/unit/llm/schemas/analyst-response-transformer.test.ts`:
  - Parses valid analyst response correctly
  - Trims whitespace from all string fields
  - Filters `invalidatedBeatIds` to only valid X.Y format (rejects "bad", "1", "abc", keeps "1.2", "3.4")
  - Handles all-default case (no deviation, no beat concluded)
  - Returns `rawResponse` in the result
  - Handles missing optional fields with defaults
  - Returns `beatConcluded: true` with valid `beatResolution`
  - Returns `deviationDetected: true` with valid deviation fields

### Invariants that must remain true

- All existing schema files unchanged
- All existing tests pass: `npm run test:unit`
- `npm run typecheck` passes
