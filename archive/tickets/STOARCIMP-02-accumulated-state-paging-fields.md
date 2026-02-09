# STOARCIMP-02: Add pagesInCurrentBeat and pacingNudge to AccumulatedStructureState

**Status**: COMPLETED

**Phase**: 1 (Data Model Enrichment)
**Spec sections**: 1.4, 2.8
**Depends on**: STOARCIMP-01
**Blocks**: STOARCIMP-04, STOARCIMP-05, STOARCIMP-06, STOARCIMP-07, STOARCIMP-08

## Description

Extend `AccumulatedStructureState` with two new fields:

1. **`pagesInCurrentBeat: number`** -- starts at 0, increments each page that does NOT conclude the beat, resets to 0 when a beat concludes.
2. **`pacingNudge: string | null`** -- set to the analyst's `pacingIssueReason` when `recommendedAction === 'nudge'`, otherwise `null`. Fire-once: consumed by one continuation prompt then cleared.

Update `createEmptyAccumulatedStructureState` to initialize both fields.

## Files to touch

| File | Change |
|------|--------|
| `src/models/story-arc.ts` | Add `pagesInCurrentBeat: number` and `pacingNudge: string \| null` to `AccumulatedStructureState`. Update `createEmptyAccumulatedStructureState` to set `pagesInCurrentBeat: 0` and `pacingNudge: null`. |
| `src/engine/structure-state.ts` | Update `createInitialStructureState` to include `pagesInCurrentBeat: 0, pacingNudge: null`. Update `advanceStructureState` to reset `pagesInCurrentBeat: 0` and clear `pacingNudge: null`. Update `applyStructureProgression`: when `beatConcluded` is false, return state with `pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1` (preserve existing `pacingNudge`). |
| `test/unit/models/story-arc.test.ts` | Add tests for new default values in `createEmptyAccumulatedStructureState`. |
| `test/unit/engine/structure-state.test.ts` | Add tests: `pagesInCurrentBeat` starts at 0, increments on non-concluded page, resets on beat conclusion. `pacingNudge` initializes as null, resets on beat advance. |

## Out of scope

- `BeatRole`, `premise`, `pacingBudget` type definitions -- STOARCIMP-01.
- JSON schema or parser changes -- STOARCIMP-03.
- Analyst type extensions (`pacingIssueDetected`, etc.) -- STOARCIMP-05.
- Actually setting `pacingNudge` from analyst results -- STOARCIMP-06.
- Prompt changes consuming `pacingNudge` -- STOARCIMP-08.
- `CompletedBeat.role` -- STOARCIMP-04.

## Acceptance criteria

### Tests that must pass

1. **`createEmptyAccumulatedStructureState` returns `pagesInCurrentBeat: 0` and `pacingNudge: null`**.
2. **`createInitialStructureState` returns state with `pagesInCurrentBeat: 0` and `pacingNudge: null`**.
3. **`applyStructureProgression` with `beatConcluded: false`**: returned state has `pagesInCurrentBeat === parentState.pagesInCurrentBeat + 1`.
4. **`applyStructureProgression` with `beatConcluded: true`**: returned state has `pagesInCurrentBeat === 0`.
5. **`advanceStructureState` resets `pagesInCurrentBeat` to 0 and `pacingNudge` to null**.
6. **Counter is per-branch**: calling `applyStructureProgression` on the same parent with different `beatConcluded` values yields independent results (immutability test -- original state unmodified).
7. **All existing structure-state tests still pass**.
8. **TypeScript build (`npm run typecheck`) passes**.

### Invariants that must remain true

- **Branch isolation**: `pagesInCurrentBeat` and `pacingNudge` are inherited from parent state, not global. Sibling branches get independent copies.
- **Page immutability**: No page model changes.
- **Immutable state**: `applyStructureProgression` and `advanceStructureState` return new objects, never mutate input.
- **All existing tests pass**.

## Outcome

- **Completion date**: 2026-02-09
- **What changed**:
  - `src/models/story-arc.ts`: Added `pagesInCurrentBeat: number` and `pacingNudge: string | null` to `AccumulatedStructureState`. Updated `createEmptyAccumulatedStructureState`.
  - `src/engine/structure-state.ts`: Updated `createInitialStructureState`, `advanceStructureState`, and `applyStructureProgression` to handle both new fields (initialize, reset, increment).
  - `src/persistence/page-serializer-types.ts`: Added optional fields for backwards-compatible deserialization.
  - `src/persistence/converters/structure-state-converter.ts`: Updated serialization/deserialization with `?? 0` / `?? null` defaults.
  - 18 test files updated to include new fields in inline `AccumulatedStructureState` objects. Identity checks (`toBe`) replaced with equality checks (`toEqual`) where `applyStructureProgression` now returns new objects.
  - 7 new acceptance criteria tests added to `structure-state.test.ts`.
- **Deviations**: Persistence layer (serializer types and converter) was updated for backwards compatibility, beyond the original "files to touch" list. This was necessary to prevent deserialization failures.
- **Verification**: All 115 test suites pass (1562 tests). TypeScript typecheck clean.
