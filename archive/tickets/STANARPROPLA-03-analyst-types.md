# STANARPROPLA-03: Update AnalystResult and AnalystContext for tracked promises

**Status**: COMPLETED
**Depends on**: STANARPROPLA-01
**Blocks**: STANARPROPLA-04, STANARPROPLA-05, STANARPROPLA-08, STANARPROPLA-11

## Summary

Align analyst contracts with the tracked-promise architecture:
- `AnalystContext` must receive `activeTrackedPromises: readonly TrackedPromise[]`.
- `AnalystResult` must replace legacy `narrativePromises` with:
  - `promisesDetected: DetectedPromise[]`
  - `promisesResolved: string[]`
  - `promisePayoffAssessments: PromisePayoffAssessment[]`

This ticket also includes the minimum call-site/schema/transformer/test updates required to keep the repository typecheck-clean and testable after this contract change.

## Assumption Reassessment (2026-02-14)

- `DetectedPromise` already exists in `src/llm/analyst-types.ts`; this ticket should update it in place, not add a brand new type.
- `PromiseType`/`Urgency` are already exported from `src/models/state/index.ts`; importing them from `keyed-entry` is unnecessary coupling.
- The repository is already mid-migration (`TrackedPromise` exists, config removed `MAX_INHERITED_PROMISES`), and baseline `npm run typecheck` currently fails in `src/engine/page-builder.ts`.
- Leaving intentional downstream type errors is no longer acceptable for this ticket because the implementation standard requires hard verification (tests/lint/typecheck passing).

## File list

- **Modify**: `src/llm/analyst-types.ts`
  - Update imports to use `TrackedPromise`, `PromisePayoffAssessment`, `PromiseType`, `Urgency` from `'../models/state/index.js'`
  - Keep `DetectedPromise` as the promise-detection payload (description, promiseType, suggestedUrgency - no id, no age)
  - Add `activeTrackedPromises: readonly TrackedPromise[]` to `AnalystContext`
  - Replace `narrativePromises: DetectedPromise[]` on `AnalystResult` with:
    - `promisesDetected: DetectedPromise[]`
    - `promisesResolved: string[]`
    - `promisePayoffAssessments: PromisePayoffAssessment[]`
- **Modify (required companion updates for compile-safety)**:
  - `src/llm/schemas/analyst-schema.ts`
  - `src/llm/schemas/analyst-validation-schema.ts`
  - `src/llm/schemas/analyst-response-transformer.ts`
  - `src/engine/page-service.ts` (wire `activeTrackedPromises`)
  - `src/engine/page-builder.ts` and related call-sites that still reference `analystResult.narrativePromises`
  - Any directly impacted type-level consumers/mocks
- **Modify tests**:
  - Update affected tests/mocks to satisfy the new required `AnalystResult` shape.
  - Add/strengthen tests around promise normalization/contract invariants introduced by the field split.

## Out of scope

- Full planner prompt redesign and behavior tuning (tracked separately)
- Full page-serialization migration from `inheritedNarrativePromises` to `accumulatedPromises` (tracked separately)
- Any backward-compatibility shims, aliases, or dual-write paths

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` passes with zero TypeScript errors.
- Relevant unit tests that touch analyst schemas/transformer/page-building promise flow pass.
- `npm run lint` passes.

### Invariants that must remain true

- `DetectedPromise` has exactly: `description: string`, `promiseType: PromiseType`, `suggestedUrgency: Urgency` - all `readonly`. It does NOT have `id` or `age` (the engine assigns those).
- `AnalystResult` no longer has `narrativePromises`. It has `promisesDetected`, `promisesResolved`, `promisePayoffAssessments`.
- `AnalystContext` now includes `activeTrackedPromises` alongside existing fields (`narrative`, `structure`, `accumulatedStructureState`, `activeState`, `threadsResolved`, `threadAges`, `tone`, etc.)
- All other `AnalystResult` fields are unchanged (beat conclusion, deviation, pacing, momentum, tone, thread payoff assessments, etc.)
- `rawResponse: string` remains on `AnalystResult`
- No alias field named `narrativePromises` remains on `AnalystResult`.

## Outcome

- **Completion date**: 2026-02-14
- **What changed**:
  - Migrated `AnalystResult` from `narrativePromises` to `promisesDetected`, `promisesResolved`, and `promisePayoffAssessments`.
  - Added `activeTrackedPromises` to `AnalystContext` and wired it from page generation flow.
  - Updated analyst JSON schema, Zod validation, response transformer, persistence serializer types/mappers, and impacted engine call-sites.
  - Updated and strengthened tests for the new promise contract and normalization behavior.
  - Removed stale promise-cap expectation in thread/promise carry-forward behavior to align with no-hard-cap architecture.
- **Deviation from original ticket scope**:
  - Expanded scope beyond `analyst-types.ts` into schema/transformer/wiring/tests to keep the repository typecheck-clean and fully testable without compatibility aliases.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run test:unit` passed.
  - `npm run test:integration` passed.
  - `npm run lint` passed.
