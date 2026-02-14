# STANARPROPLA-05: Update analyst response transformer for tracked promises

**Status**: PENDING
**Depends on**: STANARPROPLA-03, STANARPROPLA-04
**Blocks**: STANARPROPLA-11

## Summary

Replace `normalizeNarrativePromises` with three new normalizer functions: `normalizeDetectedPromises` (caps at 3, filters empty descriptions), `normalizePromisesResolved` (validates `pr-N` pattern), `normalizePromisePayoffAssessments` (validates `pr-N` pattern on `promiseId`). Update the `validateAnalystResponse` return object accordingly.

## File list

- **Modify**: `src/llm/schemas/analyst-response-transformer.ts`
  - Remove `normalizeNarrativePromises` function
  - Remove import of `NarrativePromise` from `'../../models/state/index.js'`
  - Add imports: `PromisePayoffAssessment` from `'../../models/state/index.js'`, `DetectedPromise` from `'../analyst-types.js'`
  - Add `MAX_PROMISES_DETECTED = 3` constant
  - Add `PROMISE_ID_PATTERN = /^pr-\d+$/` constant
  - Add `normalizeDetectedPromises()`: filters empty descriptions, caps at 3, maps to `DetectedPromise`
  - Add `normalizePromisesResolved()`: trims, filters by `PROMISE_ID_PATTERN`
  - Add `normalizePromisePayoffAssessments()`: filters by valid `promiseId`, maps to `PromisePayoffAssessment`
  - Update `validateAnalystResponse` return: replace `narrativePromises` with `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`

## Out of scope

- Do NOT modify `analyst-schema.ts` or `analyst-validation-schema.ts` (STANARPROPLA-04)
- Do NOT modify `analyst-types.ts` (STANARPROPLA-03)
- Do NOT modify analyst prompt or analyst generation
- Do NOT modify any test files

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` on this file must pass (assuming STANARPROPLA-03 and STANARPROPLA-04 are complete)

### Invariants that must remain true

- `normalizeDetectedPromises` caps output at 3 detected promises per page (prevents LLM from flooding)
- `normalizeDetectedPromises` filters out promises with empty/whitespace-only descriptions
- `normalizePromisesResolved` only accepts strings matching `/^pr-\d+$/` (rejects malformed IDs)
- `normalizePromisePayoffAssessments` only accepts entries with valid `promiseId` matching `/^pr-\d+$/`
- All other analyst response normalization (beat conclusion, deviation, pacing, tone, thread payoff assessments) is unchanged
- The `validateAnalystResponse` function signature and overall structure remain the same
