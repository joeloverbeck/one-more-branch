# STANARPROPLA-05: Update analyst response transformer for tracked promises

**Status**: COMPLETED
**Depends on**: STANARPROPLA-03, STANARPROPLA-04
**Blocks**: STANARPROPLA-11

## Summary

Current baseline already migrated to tracked-promise fields (`promisesDetected`, `promisesResolved`, `promisePayoffAssessments`), but normalization is still partially legacy in naming/validation.

Update transformer normalization to enforce canonical promise IDs (`pr-N`) for:
- `promisesResolved[]`
- `promisePayoffAssessments[].promiseId`

Also align normalizer naming with tracked-promise terminology:
- `normalizeNarrativePromises` -> `normalizeDetectedPromises`
- `normalizeResolvedPromiseIds` -> `normalizePromisesResolved`

`validateAnalystResponse` output shape remains unchanged (already on tracked-promise fields).

## Reassessed assumptions (corrected)

- The ticket originally assumed field-level migration from `narrativePromises` was still pending. This is no longer true in code and tests.
- The transformer already returns tracked-promise fields and already caps/filter detected promises; only ID canonicalization is missing.
- Existing tests already cover detected-promise cap/filter behavior, but they do not enforce strict `pr-N` validation for resolved IDs/payoff assessments.
- Test updates are required for correctness; prior "Do NOT modify any test files" assumption is removed.

## File list

- **Modify**: `src/llm/schemas/analyst-response-transformer.ts`
  - Rename `normalizeNarrativePromises` to `normalizeDetectedPromises` (behavior unchanged)
  - Rename `normalizeResolvedPromiseIds` to `normalizePromisesResolved`
  - Add canonical promise ID validation for resolved IDs and payoff assessments (`pr-N`)
  - Keep existing tracked-promise return fields in `validateAnalystResponse`
- **Modify**: `test/unit/llm/schemas/analyst-response-transformer-promises.test.ts`
  - Add/adjust tests to assert malformed promise IDs are dropped from `promisesResolved`
  - Add/adjust tests to assert malformed `promisePayoffAssessments[].promiseId` entries are dropped

## Out of scope

- Do NOT modify `analyst-schema.ts` or `analyst-validation-schema.ts` (STANARPROPLA-04)
- Do NOT modify `analyst-types.ts` (STANARPROPLA-03)
- Do NOT modify analyst prompt or analyst generation
- Do NOT change thread payoff normalization behavior

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` must pass
- `npm run test:unit -- test/unit/llm/schemas/analyst-response-transformer-promises.test.ts` must pass

### Invariants that must remain true

- `normalizeDetectedPromises` caps output at 3 detected promises per page (prevents LLM from flooding)
- `normalizeDetectedPromises` filters out promises with empty/whitespace-only descriptions
- `normalizePromisesResolved` only accepts strings matching `/^pr-\d+$/` (rejects malformed IDs)
- `normalizePromisePayoffAssessments` only accepts entries with valid `promiseId` matching `/^pr-\d+$/`
- All other analyst response normalization (beat conclusion, deviation, pacing, tone, thread payoff assessments) is unchanged
- The `validateAnalystResponse` function signature and overall structure remain the same

## Outcome

- Completion date: 2026-02-14
- What changed:
  - Updated `src/llm/schemas/analyst-response-transformer.ts` to:
    - Rename legacy-normalizer function names to tracked-promise terminology.
    - Enforce canonical promise ID filtering for `promisesResolved` and `promisePayoffAssessments`.
    - Reuse shared canonical ID validation (`isCanonicalIdForPrefix` + `STATE_ID_PREFIXES.promises`) for consistency with existing state-ID validation architecture.
  - Updated `test/unit/llm/schemas/analyst-response-transformer-promises.test.ts` to assert non-canonical IDs are rejected.
- Deviations from original plan:
  - Original ticket expected field migration work (`narrativePromises` -> tracked fields), but migration was already complete before implementation.
  - Test edits were required and performed, replacing the original "no test changes" assumption.
- Verification results:
  - `npm run test:unit -- test/unit/llm/schemas/analyst-response-transformer-promises.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
