# STANARPROPLA-06: Replace inheritedNarrativePromises with accumulatedPromises on Page

**Status**: PENDING
**Depends on**: STANARPROPLA-01
**Blocks**: STANARPROPLA-07, STANARPROPLA-08, STANARPROPLA-09

## Summary

Update the `Page` interface, `CreatePageData` interface, and `createPage()` function to replace `inheritedNarrativePromises: readonly NarrativePromise[]` with `accumulatedPromises: readonly TrackedPromise[]`.

## File list

- **Modify**: `src/models/page.ts`
  - Update import: replace `NarrativePromise` with `TrackedPromise` from `'./state/keyed-entry'`
  - In `Page` interface: replace `inheritedNarrativePromises: readonly NarrativePromise[]` with `accumulatedPromises: readonly TrackedPromise[]`
  - In `CreatePageData` interface: replace `inheritedNarrativePromises?: readonly NarrativePromise[]` with `accumulatedPromises?: readonly TrackedPromise[]`
  - In `createPage()`: replace `inheritedNarrativePromises: data.inheritedNarrativePromises ?? []` with `accumulatedPromises: data.accumulatedPromises ?? []`

## Out of scope

- Do NOT modify `page-builder.ts` - that's STANARPROPLA-07
- Do NOT modify `page-serializer.ts` or `page-serializer-types.ts` - that's STANARPROPLA-08
- Do NOT modify any test files
- Do NOT modify the `isPage()` type guard (it doesn't check `inheritedNarrativePromises` currently)
- Do NOT modify `isPageFullyExplored()` or `getUnexploredChoiceIndices()`

## Acceptance criteria

### Specific tests that must pass

- `npm run typecheck` will show errors in files that still reference `inheritedNarrativePromises` (page-builder, page-serializer, continuation-context-builder, etc.) - expected.

### Invariants that must remain true

- `Page.accumulatedPromises` is `readonly TrackedPromise[]` (not optional, defaults to `[]` via `createPage`)
- `CreatePageData.accumulatedPromises` is optional (`?: readonly TrackedPromise[]`)
- `createPage()` defaults `accumulatedPromises` to `[]` when not provided
- All other `Page` fields are unchanged
- All validation logic in `createPage()` is unchanged (ending/choice constraints, parent constraints)
- `isPage()` type guard is unchanged
