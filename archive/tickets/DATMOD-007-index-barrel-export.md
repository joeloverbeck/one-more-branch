# DATMOD-007: Index Barrel Export

## Status

- [x] In progress
- [x] Completed

## Summary

Create a models barrel export file at `src/models/index.ts` that re-exports the existing public model types and utilities from DATMOD-001 through DATMOD-006.

## Assumption Reassessment

### Confirmed

- DATMOD-001 through DATMOD-006 are implemented: `src/models/{id,choice,state,page,story,validation}.ts` all exist.
- The only missing artifact from Spec 02 for this ticket is `src/models/index.ts`.

### Corrected

- The original ticket required `.js` import specifiers in source re-exports. This repository currently uses extensionless TypeScript imports in `src/models/*.ts` with `module: Node16`, and existing code/tests are consistent with that style.
- The original ticket implied migration to a single entry point for all model imports. Current codebase imports many model modules directly; this ticket does not include broad import-path refactors.

## Scope

### In Scope

- Add `src/models/index.ts` with export-only statements for the existing public members.
- Add/adjust tests to verify the barrel exports are wired correctly.

### Out of Scope

- Any logic changes in model implementations.
- Refactoring existing imports throughout the codebase to force barrel usage.
- New types, new functions, or dependency changes.

## Implementation Details

### Exports to Include

From `./id`:
- Types: `StoryId`, `PageId`, `ChoiceIndex`
- Functions: `generateStoryId`, `generatePageId`, `isStoryId`, `isPageId`, `parseStoryId`, `parsePageId`

From `./choice`:
- Types: `Choice`
- Functions: `createChoice`, `isChoice`, `isChoiceExplored`

From `./state`:
- Types: `StateChange`, `StateChanges`, `CanonFact`, `GlobalCanon`, `AccumulatedState`
- Functions: `createEmptyAccumulatedState`, `accumulateState`, `addCanonFact`, `mergeCanonFacts`

From `./page`:
- Types: `Page`, `CreatePageData`
- Functions: `createPage`, `isPage`, `isPageFullyExplored`, `getUnexploredChoiceIndices`

From `./story`:
- Types: `Story`, `StoryTone`, `StoryMetadata`, `CreateStoryData`
- Functions: `createStory`, `isStory`, `updateStoryCanon`, `updateStoryArc`

From `./validation`:
- Types: `ValidationResult`
- Functions: `validateStory`, `validatePage`, `validateNoCycle`, `validateStoryIntegrity`

## Acceptance Criteria

### Tests That Must Pass

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run test:unit -- --testPathPattern=test/unit/models/index.test.ts`

### Invariants That Must Remain True

1. `src/models/index.ts` contains export statements only.
2. All current model public members listed above are re-exported.
3. Existing module-level imports and APIs remain backward-compatible.

## Verification Commands

```bash
npm run typecheck
npm run build
npm run test:unit -- --testPathPattern=test/unit/models/index.test.ts
```

## Estimated Diff Size

- `src/models/index.ts`: ~50 lines
- `test/unit/models/index.test.ts`: ~20-40 lines

## Outcome

Completed on February 5, 2026.

What changed:
- Added `src/models/index.ts` with export-only re-exports for all existing model public members.
- Added `test/unit/models/index.test.ts` to validate barrel wiring and barrel-based model creation/validation paths.

What differed from the original plan:
- Used extensionless re-export paths (e.g., `./id`) to match existing repository conventions and avoid introducing mixed import style.
- Did not refactor existing direct model imports to barrel imports, since that is a broader change and out of this ticket’s corrected scope.
