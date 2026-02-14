# STANARPROPLA-01: Replace NarrativePromise model with TrackedPromise foundation

**Status**: COMPLETED
**Depends on**: None
**Blocks**: STANARPROPLA-03, STANARPROPLA-04, STANARPROPLA-05, STANARPROPLA-06, STANARPROPLA-07, STANARPROPLA-08

## Reassessed assumptions (2026-02-14)

- Current code still uses transitory `NarrativePromise` with string-union `PromiseType` and no server-assigned promise IDs.
- The prior ticket scope assumed temporary backward compatibility (`NarrativePromise` kept/exported) and allowed downstream type errors. This conflicts with target architecture.
- Architecture requirement for this implementation pass: **no backward compatibility, no aliasing**. Old types should be removed, and all impacted consumers updated immediately.
- Tests must be updated in this ticket where invariants changed; deferring tests creates unstable intermediate state.

## Updated scope

Implement a clean migration to a canonical tracked-promise type model:

1. In `src/models/state/keyed-entry.ts`
- Replace `PromiseType` string union with enum containing:
  - `CHEKHOV_GUN`
  - `FORESHADOWING`
  - `DRAMATIC_IRONY`
  - `UNRESOLVED_EMOTION`
  - `SETUP_PAYOFF`
- Add `PROMISE_TYPE_VALUES` and `isPromiseType()` guard.
- Replace `NarrativePromise` with `TrackedPromise`:
  - `id: string`
  - `description: string`
  - `promiseType: PromiseType`
  - `suggestedUrgency: Urgency`
  - `age: number`
- Add `PromisePayoffAssessment`:
  - `promiseId: string`
  - `description: string`
  - `satisfactionLevel: SatisfactionLevel`
  - `reasoning: string`
- Extend `StateIdPrefix` with `'pr'`.

2. In `src/models/state/index.ts` and `src/models/index.ts`
- Export `PromiseType` as value export (enum).
- Export `PROMISE_TYPE_VALUES`, `isPromiseType`, `TrackedPromise`, `PromisePayoffAssessment`.
- Remove `NarrativePromise` export.

3. Propagate compilation-safe updates to direct consumers touched by this type replacement
- Replace `NarrativePromise` imports/usages with `TrackedPromise`.
- Replace string-literal assumptions with enum-compatible usage.
- Do not introduce temporary alias layers.

4. Tests
- Update failing tests to match canonical types.
- Add or strengthen tests for these invariants:
  - `isPromiseType()` accepts enum values and rejects invalid strings.
  - Promise ID prefix `'pr'` is accepted by state ID utilities/validation where relevant.

## Out of scope

- Prompt-content rewrites and planner behavior changes beyond strict compile/test fixes for renamed types.
- Broad refactors unrelated to this migration.

## Acceptance criteria

- `NarrativePromise` type no longer exists in source exports.
- `PromiseType` is an enum and is the single canonical promise taxonomy type.
- `TrackedPromise` and `PromisePayoffAssessment` are canonical and used by migrated direct consumers.
- `StateIdPrefix` includes `'pr'`.
- Relevant unit tests updated/added for new invariants.
- `npm run typecheck`, targeted relevant tests, and `npm run lint` pass.

## Outcome

- **Completion date**: 2026-02-14
- **What changed**:
  - Replaced `PromiseType` union with enum, added `SETUP_PAYOFF`, `PROMISE_TYPE_VALUES`, `isPromiseType`, `TrackedPromise`, and `PromisePayoffAssessment` in `src/models/state/keyed-entry.ts`.
  - Added `'pr'` to `StateIdPrefix` and updated `STATE_ID_PREFIXES` with `promises: 'pr-'`.
  - Removed `NarrativePromise` exports and migrated direct consumers to `TrackedPromise` / `DetectedPromise` typing.
  - Updated inheritance logic to assign `pr-*` IDs to new tracked promises and increment inherited promise age each page.
  - Updated serialization types/mapping for tracked promises with `id` and `age`.
  - Updated writer ID repair typing to explicitly exclude non-writer promise prefixes.
  - Added/updated invariant tests for promise type validation and `pr-*` prefix recognition.
- **Deviations from original plan**:
  - The initial ticket proposal deferred downstream changes and allowed backward compatibility. This implementation intentionally removed compatibility aliases and fixed all direct compile/test fallout in the same pass.
- **Verification**:
  - `npm run typecheck` passed.
  - `npm run test:unit` passed.
  - `npm run lint` passed.
