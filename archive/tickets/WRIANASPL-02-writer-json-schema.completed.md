**Status**: ✅ COMPLETED

# WRIANASPL-02: Create Writer JSON Schema for OpenRouter

## Summary

Create the JSON schema that OpenRouter uses for the writer LLM call's `response_format`. This is identical to the existing `STORY_GENERATION_SCHEMA` in `openrouter-schema.ts` but with the 6 analyst fields removed.

## Files to Touch

- `src/llm/schemas/writer-schema.ts` — **New file**: `WRITER_GENERATION_SCHEMA` constant

## Out of Scope

- Do NOT modify `openrouter-schema.ts` or `STORY_GENERATION_SCHEMA`
- Do NOT create any Zod validation (that is WRIANASPL-03)
- Do NOT create any response transformer (that is WRIANASPL-04)
- Do NOT update `schemas/index.ts` exports (that is WRIANASPL-10)
- Do NOT create tests for this file — the schema is a constant data structure; it will be validated indirectly through the response transformer tests in WRIANASPL-04

## Implementation Details

Create `src/llm/schemas/writer-schema.ts` exporting `WRITER_GENERATION_SCHEMA: JsonSchema`.

Copy `STORY_GENERATION_SCHEMA` from `openrouter-schema.ts` and **remove** these 6 properties and their entries in `required`:

- `beatConcluded`
- `beatResolution`
- `deviationDetected`
- `deviationReason`
- `invalidatedBeatIds`
- `narrativeSummary`

All other fields remain identical including: `narrative`, `choices`, `stateChangesAdded`, `stateChangesRemoved`, `newCanonFacts`, `newCharacterCanonFacts`, `inventoryAdded`, `inventoryRemoved`, `healthAdded`, `healthRemoved`, `characterStateChangesAdded`, `characterStateChangesRemoved`, `protagonistAffect`, `isEnding`.

The schema name should be `'writer_generation'` (not `'story_generation'`).

Import `JsonSchema` from `../types.js`.

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — No type errors
- `npm run build` — Compiles successfully

### Invariants that must remain true

- `STORY_GENERATION_SCHEMA` in `openrouter-schema.ts` is unchanged
- The writer schema has exactly 14 required fields (the original 20 minus the 6 analyst fields)
- `additionalProperties: false` and `strict: true` are preserved

## Outcome

- **Completed**: 2026-02-08
- **File created**: `src/llm/schemas/writer-schema.ts` exporting `WRITER_GENERATION_SCHEMA`
- **Verification**: `npm run typecheck` and `npm run build` both pass; `openrouter-schema.ts` unchanged; 14 required fields confirmed; `strict: true` and `additionalProperties: false` preserved
- **Deviations**: None
