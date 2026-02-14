# STANARPROPLA-06: Verify Page promise model cutover and harden tests

**Status**: COMPLETED
**Depends on**: STANARPROPLA-01
**Blocks**: STANARPROPLA-07, STANARPROPLA-08, STANARPROPLA-09

## Reassessed assumptions

- The original rename work is already present in `src/models/page.ts`:
  - `Page.accumulatedPromises: readonly TrackedPromise[]`
  - `CreatePageData.accumulatedPromises?: readonly TrackedPromise[]`
  - `createPage()` default `accumulatedPromises: data.accumulatedPromises ?? []`
- There are no remaining code/test references to `inheritedNarrativePromises`.
- The previous acceptance note expecting intermediate `typecheck` errors is stale and incorrect for current repository state.

## Summary

Ticket scope is corrected from "implement rename" to "verify model contract and strengthen tests around `accumulatedPromises` invariants." This keeps the architecture aligned with the stateful tracked-promise design (no aliasing, no backward-compat fields).

## File list

- **Modify**: `test/unit/models/page.test.ts`
  - Add coverage that `createPage()` defaults `accumulatedPromises` to `[]` when omitted.
  - Add coverage that `createPage()` preserves provided `accumulatedPromises` entries.

## Out of scope

- Do NOT modify promise accumulation logic in `src/engine/page-builder.ts` (covered by STANARPROPLA-07).
- Do NOT modify serialization contracts in `src/persistence/page-serializer*.ts` (covered by STANARPROPLA-08).
- Do NOT introduce compatibility aliases such as `inheritedNarrativePromises`.
- Do NOT modify `isPage()` guard behavior in this ticket.

## Acceptance criteria

### Specific tests/checks that must pass

- `npm run typecheck` passes with zero errors.
- `npm run test:unit -- test/unit/models/page.test.ts --coverage=false` passes.

### Invariants that must remain true

- `Page.accumulatedPromises` remains required and typed as `readonly TrackedPromise[]`.
- `CreatePageData.accumulatedPromises` remains optional and typed as `readonly TrackedPromise[]`.
- `createPage()` still defaults `accumulatedPromises` to `[]` when not provided.
- Existing `createPage()` validation rules (ending/choice constraints and parent constraints) remain unchanged.
- `isPage()`, `isPageFullyExplored()`, and `getUnexploredChoiceIndices()` behavior remains unchanged.

## Outcome

- Completion date: 2026-02-14
- Actual changes:
  - Reassessed and corrected ticket assumptions/scope to reflect that the Page promise-field cutover was already implemented in code.
  - Added explicit unit coverage for `createPage()` promise invariants:
    - defaults `accumulatedPromises` to `[]` when omitted
    - preserves provided `accumulatedPromises`
- Deviation from original plan:
  - Original plan expected model rename implementation and intermediate type errors.
  - Actual work was verification + test hardening, because rename/cutover was already complete.
- Verification:
  - `npm run typecheck` passed
  - `npm run test:unit -- test/unit/models/page.test.ts --coverage=false` passed (project unit suites passed)
  - `npm run lint` passed
