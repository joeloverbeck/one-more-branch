# STANARPROPLA-08: Update serialization layer for tracked promises

**Status**: PENDING
**Depends on**: STANARPROPLA-01, STANARPROPLA-03, STANARPROPLA-06
**Blocks**: STANARPROPLA-12

## Summary

Update page serialization types and functions to handle `accumulatedPromises: TrackedPromise[]` (with id and age) instead of `inheritedNarrativePromises: NarrativePromise[]`. Update analyst result serialization to use `promisesDetected`, `promisesResolved`, `promisePayoffAssessments` instead of `narrativePromises`.

## File list

- **Modify**: `src/persistence/page-serializer-types.ts`
  - Add `TrackedPromiseFileData` interface: `id`, `description`, `promiseType`, `suggestedUrgency`, `age`
  - Add `PromisePayoffAssessmentFileData` interface: `promiseId`, `description`, `satisfactionLevel`, `reasoning`
  - In `AnalystResultFileData`: replace `narrativePromises` with `promisesDetected` (reuse existing `NarrativePromiseFileData` shape since detected promises have same fields), `promisesResolved` (`string[]`), `promisePayoffAssessments` (`PromisePayoffAssessmentFileData[]`)
  - In `PageFileData`: replace `inheritedNarrativePromises` with `accumulatedPromises` (`TrackedPromiseFileData[]`)

- **Modify**: `src/persistence/page-serializer.ts`
  - Update imports: replace `NarrativePromise` with `TrackedPromise`, add `PromisePayoffAssessment`
  - Update `serializeAnalystResult()`: replace `narrativePromises` mapping with `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`
  - Update `deserializeAnalystResult()`: replace `narrativePromises` mapping with new fields
  - Update `serializePage()`: replace `inheritedNarrativePromises` with `accumulatedPromises` (include `id` and `age`)
  - Update `deserializePage()`: replace `inheritedNarrativePromises` with `accumulatedPromises`

## Out of scope

- Do NOT modify `page-builder.ts` (STANARPROPLA-07)
- Do NOT modify `page-service.ts` (STANARPROPLA-11)
- Do NOT modify converter files in `src/persistence/converters/`
- Do NOT modify any test files except strict fallout updates required to keep test suites passing after canonical field cutover
- Do NOT add backward compatibility for old `inheritedNarrativePromises` serialization format

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` on serializer files must pass (assuming dependencies are complete)

### Invariants that must remain true

- `TrackedPromiseFileData` serializes all 5 fields: `id`, `description`, `promiseType`, `suggestedUrgency`, `age`
- `accumulatedPromises` is required in the canonical page file shape; do not add fallback logic for missing legacy fields
- Deserialization of `promisesDetected`, `promisesResolved`, `promisePayoffAssessments` on `AnalystResultFileData` all default to `[]` when missing
- All other serialization (choices, state changes, inventory, health, character state, structure state, protagonist affect, NPC agendas, thread ages, resolved thread meta) is unchanged
- `parsePageIdFromFileName()` is unchanged
- Story Bible serialization is unchanged
