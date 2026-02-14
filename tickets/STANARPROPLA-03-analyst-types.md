# STANARPROPLA-03: Update AnalystResult and AnalystContext for tracked promises

**Status**: PENDING
**Depends on**: STANARPROPLA-01
**Blocks**: STANARPROPLA-04, STANARPROPLA-05, STANARPROPLA-08, STANARPROPLA-11

## Summary

Update `AnalystContext` to receive `activeTrackedPromises: readonly TrackedPromise[]` as input. Update `AnalystResult` to replace the single `narrativePromises: NarrativePromise[]` field with three new fields: `promisesDetected: DetectedPromise[]`, `promisesResolved: string[]`, `promisePayoffAssessments: PromisePayoffAssessment[]`. Add the `DetectedPromise` interface.

## File list

- **Modify**: `src/llm/analyst-types.ts`
  - Update imports: add `TrackedPromise`, `PromisePayoffAssessment` from `'../models/state/index.js'`; add `PromiseType`, `Urgency` from `'../models/state/keyed-entry.js'`
  - Add `DetectedPromise` interface (description, promiseType, suggestedUrgency - no id, no age)
  - Add `activeTrackedPromises: readonly TrackedPromise[]` to `AnalystContext`
  - Replace `narrativePromises: NarrativePromise[]` on `AnalystResult` with:
    - `promisesDetected: DetectedPromise[]`
    - `promisesResolved: string[]`
    - `promisePayoffAssessments: PromisePayoffAssessment[]`

## Out of scope

- Do NOT modify analyst schema (`analyst-schema.ts`) - that's STANARPROPLA-04
- Do NOT modify analyst validation (`analyst-validation-schema.ts`) - that's STANARPROPLA-04
- Do NOT modify analyst response transformer - that's STANARPROPLA-05
- Do NOT modify analyst prompt - that's STANARPROPLA-11
- Do NOT modify page-service or page-builder
- Do NOT modify any test files yet

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` will show errors in downstream files still using `narrativePromises` - expected. The types file itself must compile.

### Invariants that must remain true

- `DetectedPromise` has exactly: `description: string`, `promiseType: PromiseType`, `suggestedUrgency: Urgency` - all `readonly`. It does NOT have `id` or `age` (the engine assigns those).
- `AnalystResult` no longer has `narrativePromises`. It has `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`.
- `AnalystContext` now includes `activeTrackedPromises` alongside existing fields (`narrative`, `structure`, `accumulatedStructureState`, `activeState`, `threadsResolved`, `threadAges`, `tone`, etc.)
- All other `AnalystResult` fields are unchanged (beat conclusion, deviation, pacing, momentum, tone, thread payoff assessments, etc.)
- `rawResponse: string` remains on `AnalystResult`
