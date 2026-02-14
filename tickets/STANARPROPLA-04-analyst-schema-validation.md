# STANARPROPLA-04: Update analyst JSON Schema and Zod validation for tracked promises

**Status**: PENDING
**Depends on**: STANARPROPLA-03
**Blocks**: STANARPROPLA-05

## Summary

Update the analyst's LLM structured output schema (JSON Schema) and Zod validation to match the new `promisesDetected`, `promisesResolved`, `promisePayoffAssessments` output fields. Add `SETUP_PAYOFF` to the `promiseType` enum. Remove the old `narrativePromises` property.

## File list

- **Modify**: `src/llm/schemas/analyst-schema.ts`
  - Remove the `narrativePromises` property block from the JSON Schema `properties` object
  - Add three new properties: `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`
  - Update the `required` array: replace `'narrativePromises'` with the three new field names
  - `promisesDetected.items.properties.promiseType.enum` must include `SETUP_PAYOFF`
  - `promisesResolved` is `{ type: 'array', items: { type: 'string' } }`
  - `promisePayoffAssessments.items` has `promiseId`, `description`, `satisfactionLevel` (enum: RUSHED/ADEQUATE/WELL_EARNED), `reasoning`

- **Modify**: `src/llm/schemas/analyst-validation-schema.ts`
  - Replace `NarrativePromiseSchema` with `DetectedPromiseSchema` (add `SETUP_PAYOFF` to enum)
  - Add `PromisePayoffAssessmentSchema` with `promiseId`, `description`, `satisfactionLevel`, `reasoning`
  - In `AnalystResultSchema`: replace `narrativePromises` field with `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`

## Out of scope

- Do NOT modify `analyst-response-transformer.ts` - that's STANARPROPLA-05
- Do NOT modify `analyst-types.ts` - that's STANARPROPLA-03
- Do NOT modify analyst prompt
- Do NOT modify any test files

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` on these two files must pass (assuming STANARPROPLA-03 is complete)
- Zod schemas must use `.catch()` and `.default()` for graceful degradation (matching existing pattern)

### Invariants that must remain true

- JSON Schema `promiseType` enum includes all 5 values: `CHEKHOV_GUN`, `FORESHADOWING`, `DRAMATIC_IRONY`, `UNRESOLVED_EMOTION`, `SETUP_PAYOFF`
- `promisesDetected` items have `additionalProperties: false` and required: `description`, `promiseType`, `suggestedUrgency`
- `promisePayoffAssessments` items have `additionalProperties: false` and required: `promiseId`, `description`, `satisfactionLevel`, `reasoning`
- `promisesResolved` is a simple string array (the LLM outputs `pr-N` IDs)
- All other analyst schema properties (beat conclusion, deviation, pacing, momentum, tone, thread payoff assessments) are unchanged
- Zod schemas use existing pattern: `z.enum([...]).catch('DEFAULT')` for enum fields, `z.string().default('')` for strings, `z.array(...).catch([]).default([])` for arrays
