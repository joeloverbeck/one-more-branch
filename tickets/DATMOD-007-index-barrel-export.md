# DATMOD-007: Index Barrel Export

## Summary

Create the barrel export file that re-exports all types and utilities from the models module.

## Files to Touch

### Create
- `src/models/index.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any model implementation files
- **DO NOT** add any logic or transformations
- **DO NOT** create new types or functions
- **DO NOT** add any dependencies

## Implementation Details

### Exports to Include

From `./id.js`:
- Types: `StoryId`, `PageId`, `ChoiceIndex`
- Functions: `generateStoryId`, `generatePageId`, `isStoryId`, `isPageId`, `parseStoryId`, `parsePageId`

From `./choice.js`:
- Types: `Choice`
- Functions: `createChoice`, `isChoice`, `isChoiceExplored`

From `./state.js`:
- Types: `StateChange`, `StateChanges`, `CanonFact`, `GlobalCanon`, `AccumulatedState`
- Functions: `createEmptyAccumulatedState`, `accumulateState`, `addCanonFact`, `mergeCanonFacts`

From `./page.js`:
- Types: `Page`, `CreatePageData`
- Functions: `createPage`, `isPage`, `isPageFullyExplored`, `getUnexploredChoiceIndices`

From `./story.js`:
- Types: `Story`, `StoryTone`, `StoryMetadata`, `CreateStoryData`
- Functions: `createStory`, `isStory`, `updateStoryCanon`, `updateStoryArc`

From `./validation.js`:
- Types: `ValidationResult`
- Functions: `validateStory`, `validatePage`, `validateNoCycle`, `validateStoryIntegrity`

### File Extension Note

Use `.js` extension in imports (TypeScript ESM module resolution):
```typescript
export { ... } from './id.js';
```

## Acceptance Criteria

### Tests That Must Pass

No dedicated test file needed. Validation via:

- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] All exports are accessible: Create a simple import test in any test file:
  ```typescript
  import { StoryId, PageId, createStory, createPage, validateStory } from '@/models';
  ```
- [ ] No circular dependencies detected during build

### Invariants That Must Remain True

1. **Complete Exports**: All public types and functions from all model files are exported
2. **No Logic**: Index file contains only export statements
3. **Correct Extensions**: All imports use `.js` extension for ESM compatibility
4. **Single Entry Point**: All model imports should come from `@/models` (or `./models`)

## Dependencies

- DATMOD-001 through DATMOD-006 must all be complete

## Verification Commands

```bash
# Type check the entire project
npm run typecheck

# Build to verify ESM resolution
npm run build

# Run all model tests to verify exports work
npm run test:unit -- --testPathPattern="models"
```

## Estimated Diff Size

- ~50 lines in `src/models/index.ts`
