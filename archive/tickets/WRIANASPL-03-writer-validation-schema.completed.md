# WRIANASPL-03: Create Writer Zod Validation Schema

**Status**: ✅ COMPLETED

## Summary

Create the Zod validation schema for writer responses. This mirrors `GenerationResultSchema` in `validation-schema.ts` but without the 6 analyst fields. Retains the `superRefine` for choice count validation.

## Files to Touch

- `src/llm/schemas/writer-validation-schema.ts` — **New file**: `WriterResultSchema` Zod schema

## Out of Scope

- Do NOT modify `validation-schema.ts` or `GenerationResultSchema`
- Do NOT create the response transformer (that is WRIANASPL-04)
- Do NOT update `schemas/index.ts` exports (that is WRIANASPL-10)

## Implementation Details

Create `src/llm/schemas/writer-validation-schema.ts` exporting `WriterResultSchema`.

Copy the structure of `GenerationResultSchema` from `validation-schema.ts` and **remove** these fields:

- `beatConcluded`
- `beatResolution`
- `deviationDetected`
- `deviationReason`
- `invalidatedBeatIds`
- `narrativeSummary`

**Keep** all of these:
- `narrative` (string, min 50, max 15000)
- `choices` (array of strings, min 3 / max 300 per choice)
- `currentLocation` (string, optional, default '')
- `threatsAdded/Removed` (array of strings, optional, default [])
- `constraintsAdded/Removed` (array of strings, optional, default [])
- `threadsAdded/Resolved` (array of strings, optional, default [])
- `newCanonFacts` (array of strings)
- `newCharacterCanonFacts` (array schema with `transformCharacterCanonFactsToRecord`)
- `inventoryAdded/Removed` (array of strings, optional, default [])
- `healthAdded/Removed` (array of strings, optional, default [])
- `characterStateChangesAdded/Removed` (array of objects)
- `protagonistAffect` (ProtagonistAffectSchema, optional, with default)
- `isEnding` (boolean)

**Keep** the `superRefine` for choice count validation (isEnding vs choices.length).

Reuse the helper schemas from `validation-schema.ts` by importing them. If they are not currently exported, either: (a) duplicate them in the new file, or (b) extract them to a shared internal file. Prefer duplication for now to keep the ticket small and avoid modifying `validation-schema.ts`.

## Acceptance Criteria

### Tests that must pass

- `npm run typecheck` — No type errors
- `npm run build` — Compiles successfully

### Invariants that must remain true

- `GenerationResultSchema` in `validation-schema.ts` is unchanged
- `WriterResultSchema` passes validation for any valid writer response
- `WriterResultSchema` rejects inputs with fewer than 2 choices when `isEnding: false`
- `WriterResultSchema` rejects inputs with choices when `isEnding: true`

## Outcome

- **Completed**: 2026-02-08
- **What was changed**: Created `src/llm/schemas/writer-validation-schema.ts` with `WriterResultSchema` and `ValidatedWriterResult` type export
- **Approach**: Duplicated helper schemas (`CharacterCanonFactsArraySchema`, `CharacterStateChangesArraySchema`, `EmotionIntensitySchema`, `SecondaryEmotionSchema`, `ProtagonistAffectSchema`, `defaultProtagonistAffect`) to avoid modifying `validation-schema.ts`
- **Deviations**: None
- **Verification**: `npm run typecheck` and `npm run build` both pass; `GenerationResultSchema` unchanged
