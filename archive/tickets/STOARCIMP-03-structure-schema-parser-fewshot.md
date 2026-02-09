# STOARCIMP-03: Update structure schema, parser, and few-shot examples for new fields

**Status**: ✅ COMPLETED

**Phase**: 1 (Data Model Enrichment)
**Spec sections**: 1.5, 1.6, 1.9
**Depends on**: STOARCIMP-01
**Blocks**: STOARCIMP-07, STOARCIMP-08

## Description

Update the structure generation pipeline to produce and parse the new fields:

1. **JSON schema** (`structure-schema.ts`): Add `premise` (required string), `pacingBudget` (required object with `targetPagesMin` and `targetPagesMax`), and beat `role` (required enum) to `STRUCTURE_GENERATION_SCHEMA`.

2. **Parser** (`structure-generator.ts`): Update `StructureGenerationResult` to include `premise`, `pacingBudget`, and beat `role`. Update `parseStructureResponse` to extract and validate these fields with fallbacks:
   - `premise` missing -> default to `overallTheme`
   - `pacingBudget` missing -> default to `{ targetPagesMin: 15, targetPagesMax: 50 }`
   - beat `role` missing -> default to `'escalation'`

3. **Few-shot examples** (`structure-prompt.ts`): Update the assistant response in the few-shot example to include `premise`, `pacingBudget`, and beat `role` fields.

## Files to touch

| File | Change |
|------|--------|
| `src/llm/schemas/structure-schema.ts` | Add `premise`, `pacingBudget`, `role` to JSON schema. Update `required` arrays. |
| `src/llm/structure-generator.ts` | Extend `StructureGenerationResult` with `premise`, `pacingBudget`, beat `role`. Update `parseStructureResponse` with extraction + fallback logic. |
| `src/llm/prompts/structure-prompt.ts` | Update few-shot assistant message to include `premise`, `pacingBudget`, and beat `role`. |
| `test/unit/llm/schemas/structure-schema.test.ts` | Add tests verifying schema includes new required fields. |
| `test/unit/llm/structure-generator.test.ts` | Add tests for parsing `premise`, `pacingBudget`, `role` -- both present and fallback cases. |
| `test/unit/llm/prompts/structure-prompt.test.ts` | Update tests to verify few-shot example includes new fields. |

## Out of scope

- Data model type definitions (`story-arc.ts`) -- STOARCIMP-01.
- `AccumulatedStructureState` changes -- STOARCIMP-02.
- Structure rewrite prompt/few-shot updates -- STOARCIMP-04.
- Structure state tracking logic -- STOARCIMP-02.
- Analyst schema/types -- STOARCIMP-05.
- Continuation prompt changes -- STOARCIMP-08.
- Dramatic function guidance text in structure prompt user message -- STOARCIMP-07.

## Acceptance criteria

### Tests that must pass

1. **Schema validation**: `STRUCTURE_GENERATION_SCHEMA` includes `premise` as required string, `pacingBudget` as required object with `targetPagesMin`/`targetPagesMax`, and beat `role` as required enum of `['setup', 'escalation', 'turning_point', 'resolution']`.
2. **Parser -- all fields present**: `parseStructureResponse` with a valid JSON response including `premise`, `pacingBudget`, and beat `role` returns all fields correctly.
3. **Parser -- `premise` missing**: Falls back to `overallTheme` value.
4. **Parser -- `pacingBudget` missing**: Falls back to `{ targetPagesMin: 15, targetPagesMax: 50 }`.
5. **Parser -- beat `role` missing**: Falls back to `'escalation'`.
6. **Parser -- invalid `role` value**: Falls back to `'escalation'`.
7. **Few-shot example**: The assistant message in `buildStructurePrompt` contains `"premise"`, `"pacingBudget"`, and `"role"` fields.
8. **All existing structure-generator and structure-schema tests pass**.
9. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **3 acts, 2-4 beats per act**: Existing validation unchanged.
- **Beat `id` generation**: If IDs are assigned during parsing, assignment logic is unchanged.
- **`rawResponse` preserved**: The raw LLM response string is still included.
- **All existing tests pass**.

## Outcome

**Completed**: 2026-02-09

**Changes made:**
- `src/llm/schemas/structure-schema.ts`: Added `premise` (required string), `pacingBudget` (required object with `targetPagesMin`/`targetPagesMax`), and beat `role` (required enum of 4 values) to `STRUCTURE_GENERATION_SCHEMA`.
- `src/llm/prompts/structure-prompt.ts`: Updated `STRUCTURE_FEW_SHOT_ASSISTANT` to include `premise`, `pacingBudget`, and beat `role` fields with appropriate example values.
- `test/unit/llm/schemas/structure-schema.test.ts`: Updated required array assertions; added 3 new tests for premise, pacingBudget, and role schema properties.
- `test/unit/llm/structure-generator.test.ts`: Added 4 new tests for parser fallback behavior (premise→overallTheme, pacingBudget→defaults, missing role→escalation, invalid role handling).
- `test/unit/llm/prompts/structure-prompt.test.ts`: Added 1 new test verifying few-shot assistant message contains all new fields.

**Deviations**: None. Parser and `StructureGenerationResult` type already had the new fields from STOARCIMP-01, so only schema + few-shot + tests needed updating.

**Verification**: 95 unit test suites pass (1401 tests), TypeScript typecheck clean, 0 regressions.
