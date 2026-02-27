# NARARCAUD-14: Genre Obligations Registry

**Wave**: 3 (Genre, Theme Tracking, Concept Delivery)
**Effort**: S
**Dependencies**: None
**Spec reference**: C1-C3 (part 1) — Genre Contract gaps

## Summary

Create a static registry mapping each `GenreFrame` to 3-5 obligatory scene descriptors. This is a pure data module with no runtime wiring — that comes in NARARCAUD-15 and NARARCAUD-16.

## Files to Create

- `src/models/genre-obligations.ts` — static registry mapping `GenreFrame` to 3-5 obligatory scene descriptors per genre (all 26 genre frames)

## Files to Touch

- `src/models/index.ts` — export new module

## Out of Scope

- Structure schema/prompt wiring (NARARCAUD-15)
- Analyst/rewrite wiring (NARARCAUD-16)

## Acceptance Criteria

- [ ] `npm run typecheck` passes
- [ ] Unit test: every `GenreFrame` value has entries in the registry
- [ ] Unit test: each genre has 3-5 obligatory scene strings
- [ ] Unit test: registry is type-safe (`Record<GenreFrame, readonly string[]>`)
- [ ] Invariant: No existing code is modified beyond `index.ts` barrel export
