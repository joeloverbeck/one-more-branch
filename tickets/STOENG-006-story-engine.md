# STOENG-006: Story Engine Class

## Summary

Implement the main StoryEngine class that serves as the public API for all story operations. This is the facade that orchestrates all lower-level services and provides a unified interface for the UI layer.

## Files to Create/Modify

### Create
- `src/engine/story-engine.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement individual services (separate tickets)
- **DO NOT** add HTTP/Express handling (Spec 06)

## Implementation Details

Create `src/engine/story-engine.ts` with the following:

### StoryEngine Class

```typescript
export class StoryEngine {
  init(): void
  async startStory(options: StartStoryOptions): Promise<StartStoryResult>
  async makeChoice(options: MakeChoiceOptions): Promise<MakeChoiceResult>
  async loadStory(storyId: StoryId): Promise<Story | null>
  async getPage(storyId: StoryId, pageId: PageId): Promise<Page | null>
  async getStartingPage(storyId: StoryId): Promise<Page | null>
  async restartStory(storyId: StoryId): Promise<Page>
  async listStories(): Promise<StoryMetadata[]>
  async deleteStory(storyId: StoryId): Promise<void>
  async getStoryStats(storyId: StoryId): Promise<StoryStats>
  async storyExists(storyId: StoryId): Promise<boolean>
  async getFullStory(storyId: StoryId): Promise<FullStory | null>
}
```

### init()

- Call `storage.init()` to ensure storage directory exists

### startStory(options)

- Delegate to `startNewStory` from story-service
- Return StartStoryResult

### makeChoice(options)

- Load story, throw STORY_NOT_FOUND if missing
- Load current page, throw PAGE_NOT_FOUND if missing
- Validate choice index bounds, throw INVALID_CHOICE
- Check page is not an ending, throw INVALID_CHOICE
- Call `getOrGeneratePage` from page-service
- Return MakeChoiceResult

### restartStory(storyId)

- Get starting page, throw PAGE_NOT_FOUND if missing
- Return page 1 (no state changes needed - immutable)

### getFullStory(storyId)

- Load story, return null if not found
- Load all pages via `storage.loadAllPages`
- Return { story, pages }

### Singleton Export

```typescript
export const storyEngine = new StoryEngine();
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/story-engine.test.ts` (with mocked dependencies):

1. **init()**
   - Calls storage.init()

2. **makeChoice() validation**
   - Throws STORY_NOT_FOUND for missing story
   - Throws PAGE_NOT_FOUND for missing page
   - Throws INVALID_CHOICE for out-of-bounds index
   - Throws INVALID_CHOICE on ending page

3. **makeChoice() delegation**
   - Calls getOrGeneratePage with correct params
   - Returns MakeChoiceResult

4. **restartStory()**
   - Returns page 1
   - Throws PAGE_NOT_FOUND for non-existent story

5. **getFullStory()**
   - Returns story and all pages
   - Returns null for non-existent story

### Integration Tests (require API key)

Create `test/integration/engine/story-engine.test.ts`:

1. **Create and play story**
   - startStory returns valid story and page
   - makeChoice generates new page
   - Second makeChoice on same choice returns existing page

2. **Branch isolation**
   - Different choices create different pages
   - Both branches share same parent

3. **Persistence across instances**
   - Story loadable after engine recreation
   - Pages maintain content across loads

### Invariants That Must Remain True

1. **Stateless engine**: All state in persistence, engine is just orchestrator
2. **API key never stored**: Passed per-operation only
3. **Error consistency**: All errors use EngineError with typed codes
4. **Singleton pattern**: Single storyEngine instance exported
5. **Ending enforcement**: Cannot make choices on ending pages

## Estimated Size

~200 lines of code + ~180 lines of tests

## Dependencies

- STOENG-001: Engine Types (all types and errors)
- STOENG-004: Page Service (getOrGeneratePage)
- STOENG-005: Story Service (all story operations)
- Spec 02: Data Models (Story, Page, StoryId, PageId, StoryMetadata)
- Spec 03: Persistence (storage singleton)
