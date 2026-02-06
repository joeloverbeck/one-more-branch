# STOENG-007: Barrel Export and Module Integration

## Summary

Create the barrel export file (`src/engine/index.ts`) that re-exports all public API from the engine module. This makes the module consumable by the UI layer (Spec 06).

## Files to Create/Modify

### Create
- `src/engine/index.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any existing engine files
- **DO NOT** add new functionality - exports only

## Implementation Details

Create `src/engine/index.ts` with the following structure:

```typescript
// Main engine class and singleton
export { StoryEngine, storyEngine } from './story-engine.js';

// Story service functions
export {
  startNewStory,
  loadStory,
  getPage,
  getStartingPage,
  listAllStories,
  deleteStory,
  getStoryStats,
} from './story-service.js';

// Page service functions
export {
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
} from './page-service.js';

// State manager functions
export {
  computeAccumulatedState,
  getParentAccumulatedState,
  mergeStateChanges,
  formatStateForDisplay,
  getRecentChanges,
} from './state-manager.js';

// Canon manager functions
export {
  updateStoryWithNewCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
} from './canon-manager.js';

// Types and errors
export {
  StartStoryResult,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  MakeChoiceOptions,
  EngineError,
  EngineErrorCode,
} from './types.js';
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/index.test.ts`:

1. **All exports are accessible**
   - StoryEngine class can be imported
   - storyEngine singleton can be imported
   - All service functions can be imported
   - All types can be imported
   - EngineError class can be imported

2. **Export completeness**
   - Every public function from each module is exported
   - No internal/private utilities are exported

3. **Type exports work**
   - Types can be used for type annotations
   - EngineErrorCode union type is accessible

### Invariants That Must Remain True

1. **Complete re-exports**: All public API exposed through index.ts
2. **No new code**: Only import/export statements
3. **Proper extensions**: Use `.js` extensions for ESM compatibility
4. **Clean public API**: Only export what consumers need

## Estimated Size

~50 lines of code + ~40 lines of tests

## Dependencies

- STOENG-001: Engine Types
- STOENG-002: State Manager
- STOENG-003: Canon Manager
- STOENG-004: Page Service
- STOENG-005: Story Service
- STOENG-006: Story Engine Class

## Notes

This ticket must be implemented **last** after all other engine modules are complete.
