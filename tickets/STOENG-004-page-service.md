# STOENG-004: Page Service

## Summary

Implement page-level operations including generating opening pages, generating continuation pages, and the get-or-generate logic for handling choice selections. This is the core content generation layer.

## Files to Create/Modify

### Create
- `src/engine/page-service.ts`

### Modify
- None

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** create `src/engine/index.ts` (separate ticket)
- **DO NOT** implement story-level operations (separate ticket)
- **DO NOT** implement the main engine class (separate ticket)

## Implementation Details

Create `src/engine/page-service.ts` with the following exports:

### generateFirstPage

```typescript
export async function generateFirstPage(
  story: Story,
  apiKey: string
): Promise<{ page: Page; updatedStory: Story }>
```

- Build OpeningContext from story properties
- Call `generateOpeningPage` from LLM module
- Create Page object with id=1, parentPageId=null
- Convert result.choices to Choice objects via `createChoice`
- Update story with canon facts and story arc if present
- Return both page and potentially updated story

### generateNextPage

```typescript
export async function generateNextPage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string
): Promise<{ page: Page; updatedStory: Story }>
```

- Validate choiceIndex bounds, throw EngineError if invalid
- Get next page ID via `storage.getMaxPageId` + `generatePageId`
- Build ContinuationContext with full story context
- Call `generateContinuationPage` from LLM module
- Create Page with proper parent linkage
- Use `getParentAccumulatedState` for state accumulation
- Return page and story updated with new canon

### getOrGeneratePage

```typescript
export async function getOrGeneratePage(
  story: Story,
  parentPage: Page,
  choiceIndex: number,
  apiKey: string
): Promise<{ page: Page; story: Story; wasGenerated: boolean }>
```

- Check if `choice.nextPageId` already exists
- If exists: load existing page, return with `wasGenerated: false`
- If missing page reference points to non-existent: throw PAGE_NOT_FOUND
- If not explored: generate new page, save it, update choice link
- Save page via `storage.savePage`
- Update parent's choice via `storage.updateChoiceLink`
- Update story if canon changed via `storage.updateStory`
- Return with `wasGenerated: true`

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/page-service.test.ts` (with mocked dependencies):

1. **generateFirstPage**
   - Creates page with id=1 and parentPageId=null
   - Converts LLM choices to Choice objects
   - Updates story with new canon facts
   - Updates story with story arc when present

2. **generateNextPage**
   - Throws INVALID_CHOICE for out-of-bounds index
   - Creates page with correct parent linkage
   - Computes accumulated state from parent
   - Uses proper page ID sequence

3. **getOrGeneratePage**
   - Returns existing page without regeneration
   - Generates new page when choice unexplored
   - Sets wasGenerated flag correctly
   - Saves new page to storage
   - Updates choice link on parent
   - Throws PAGE_NOT_FOUND for broken references

### Integration Tests (require API key)

Create `test/integration/engine/page-service.test.ts`:

1. **First page generation**
   - Actually generates content via LLM
   - Returns valid narrative text
   - Returns 2-5 choices (or 0 for ending)

2. **Continuation generation**
   - Uses previous narrative in context
   - Maintains story consistency

### Invariants That Must Remain True

1. **Page 1 is root**: First page always has id=1, no parent
2. **Sequential IDs**: New pages get max existing + 1
3. **Choice linking**: After generation, parent choice points to new page
4. **Atomic operations**: Page saved before choice link updated
5. **State accumulation**: Child pages include parent's accumulated state

## Estimated Size

~200 lines of code + ~200 lines of tests

## Dependencies

- STOENG-001: Engine Types (EngineError)
- STOENG-002: State Manager (getParentAccumulatedState)
- STOENG-003: Canon Manager (updateStoryWithNewCanon)
- Spec 02: Data Models (Page, Choice, createPage, createChoice, generatePageId)
- Spec 03: Persistence (storage.savePage, storage.loadPage, etc.)
- Spec 04: LLM (generateOpeningPage, generateContinuationPage, contexts)
