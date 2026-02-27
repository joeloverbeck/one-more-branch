# NARARCAUD-14: Genre Obligations Registry

**Status**: COMPLETED
**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: S
**Dependencies**: None
**Spec reference**: C1-C3 (part 1) — Genre Contract gaps

## Summary

Create a static registry mapping each `GenreFrame` to 3-5 obligatory scene descriptors. This is a pure data module with no runtime wiring — that comes in NARARCAUD-15 and NARARCAUD-16.

## Reassessed Assumptions (2026-02-27)

- `GenreFrame` currently lives in `src/models/concept-generator.ts` as a union derived from `GENRE_FRAMES` and contains exactly 26 values.
- `genreFrame` is currently present on concept data but not load-bearing in structure/analyst runtime logic.
- The ticket must include test-file changes in scope (new tests plus barrel export verification), not only production files.
- “Registry is type-safe” should be enforced primarily at compile time in the new module declaration (`satisfies Record<GenreFrame, readonly string[]>`) and secondarily by unit tests for completeness/shape.

## Scope Corrections

- Add a dedicated unit test file for the new registry under `test/unit/models/`.
- Keep runtime architecture unchanged in this ticket (no prompt/schema/engine wiring).
- Allow minimal updates to existing model barrel-export tests to verify the new export.

## Architecture Rationale

- This change is beneficial versus current architecture because it upgrades `genreFrame` from decorative metadata to an explicit domain contract source.
- A central typed registry is cleaner and more extensible than scattering hard-coded genre obligations across prompts or engine logic.
- No backward-compatibility shims or alias layers are introduced; downstream integrations should consume this registry directly in future tickets.

## Files to Create

- `src/models/genre-obligations.ts` — static registry mapping `GenreFrame` to 3-5 obligatory scene descriptors per genre (all 26 genre frames)

## Files to Touch

- `src/models/index.ts` — export new module
- `test/unit/models/genre-obligations.test.ts` — coverage for completeness and obligation-count invariants
- `test/unit/models/index.test.ts` — verify barrel export surface for new registry

## Out of Scope

- Structure schema/prompt wiring (NARARCAUD-15)
- Analyst/rewrite wiring (NARARCAUD-16)

## Acceptance Criteria

- [x] `npm run typecheck` passes
- [x] Unit test: every `GenreFrame` value has entries in the registry
- [x] Unit test: each genre has 3-5 obligatory scene strings
- [x] Compile-time invariant: registry declaration is type-safe (`satisfies Record<GenreFrame, readonly string[]>`)
- [x] Invariant: No runtime behavior changes outside adding the static registry and barrel export
- [x] Relevant unit tests pass

## Outcome

- **Completion date**: 2026-02-27
- **What changed**:
  - Added `src/models/genre-obligations.ts` with `GENRE_OBLIGATIONS` covering all 26 `GenreFrame` values and enforcing compile-time shape via `satisfies Record<GenreFrame, readonly string[]>`.
  - Exported the registry from `src/models/index.ts`.
  - Added `test/unit/models/genre-obligations.test.ts` for completeness and 3-5 obligations-per-genre invariants.
  - Updated `test/unit/models/index.test.ts` to verify barrel export coverage.
- **Deviation vs original plan**:
  - Original ticket listed only `index.ts` as a touched file; implementation correctly included dedicated test files to satisfy verifiable invariants.
  - Architecture stayed intentionally data-only in this ticket; no prompt/schema/runtime wiring was introduced.
- **Verification**:
  - `npm run test:unit -- test/unit/models/genre-obligations.test.ts test/unit/models/index.test.ts` (passes)
  - `npm run typecheck` (passes)
  - `npm run lint` (passes)
  - `npm test` (passes; 237 suites, 2798 tests)
