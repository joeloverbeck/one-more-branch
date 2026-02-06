# STOENG-004: Page Service

## Status

Completed (2026-02-06)

## Summary

Implement page-level operations including generating opening pages, generating continuation pages, and get-or-generate logic for handling choice selections. This is the content generation layer used by later story-engine orchestration.

## Reassessed Assumptions (2026-02-06)

- `src/engine/page-service.ts` does not exist yet and must be created in this ticket.
- `test/unit/engine/page-service.test.ts` does not exist yet and should be added.
- The repository uses extensionless TypeScript imports (for example `../models`), so this ticket should follow that convention instead of `.js` suffixed imports shown in `specs/05-story-engine.md` examples.
- LLM generation results expose canon facts as `canonFacts` (not `newCanonFacts`), so story canon updates must use `result.canonFacts`.
- Engine integration scaffolding (`story-service`, `story-engine`, `src/engine/index.ts`) is not present in this branch and is out of scope for this ticket.
- This ticket can validate behavior thoroughly with unit tests using mocked storage + mocked LLM calls; live LLM integration tests remain in later tickets.

## Updated Scope

- Create `src/engine/page-service.ts` with `generateFirstPage`, `generateNextPage`, and `getOrGeneratePage`.
- Add `test/unit/engine/page-service.test.ts` with mocked dependencies covering happy paths plus invariant/edge-case behavior.
- Keep changes limited to the new page service module, its tests, and this ticket document.

## Files to Create/Modify

### Create
- `src/engine/page-service.ts`
- `test/unit/engine/page-service.test.ts`

### Modify
- `tickets/STOENG-004-page-service.md` (assumptions/scope/status updates)

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

- Build `OpeningContext` from story properties
- Call `generateOpeningPage` from LLM module
- Create page object with id 1 and `parentPageId = null`
- Convert `result.choices` to `Choice` objects via `createChoice`
- Update story canon via `updateStoryWithNewCanon(story, result.canonFacts)`
- Update story arc when `result.storyArc` is present
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

- Validate `choiceIndex` bounds; throw `EngineError` with code `INVALID_CHOICE` if invalid
- Get next page ID via `storage.getMaxPageId` + `generatePageId`
- Build `ContinuationContext` with full story context
- Call `generateContinuationPage` from LLM module
- Create child page with correct parent linkage and `parentAccumulatedState`
- Use `getParentAccumulatedState(parentPage)` for state accumulation
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

- Validate `choiceIndex` bounds; throw `INVALID_CHOICE` if invalid
- If `choice.nextPageId` exists, load existing page and return `wasGenerated: false`
- If a stored `nextPageId` points to a missing page, throw `PAGE_NOT_FOUND`
- If choice is unexplored, generate new page and return `wasGenerated: true`
- Persist new page via `storage.savePage`
- Update parent choice link via `storage.updateChoiceLink`
- Persist story via `storage.updateStory` only when canon/arc changes
- Maintain operation order: save page before updating choice link

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/engine/page-service.test.ts` (with mocked dependencies):

1. **generateFirstPage**
   - Creates page with id=1 and `parentPageId=null`
   - Converts LLM choices to `Choice` objects
   - Updates story with new canon facts
   - Updates story arc when present

2. **generateNextPage**
   - Throws `INVALID_CHOICE` for out-of-bounds index
   - Creates page with correct parent linkage
   - Computes accumulated state from parent
   - Uses proper page ID sequence

3. **getOrGeneratePage**
   - Returns existing page without regeneration
   - Generates new page when choice unexplored
   - Sets `wasGenerated` flag correctly
   - Saves new page to storage
   - Updates choice link on parent
   - Throws `PAGE_NOT_FOUND` for broken references
   - Throws `INVALID_CHOICE` for invalid choice index

### Invariants That Must Remain True

1. **Page 1 is root**: First page always has id=1, no parent
2. **Sequential IDs**: New pages get max existing + 1
3. **Choice linking**: After generation, parent choice points to new page
4. **Atomic order**: Page is saved before choice link is updated
5. **State accumulation**: Child pages include parent accumulated state

## Estimated Size

~200 lines of code + ~200 lines of tests

## Dependencies

- STOENG-001: Engine Types (`EngineError`)
- STOENG-002: State Manager (`getParentAccumulatedState`)
- STOENG-003: Canon Manager (`updateStoryWithNewCanon`)
- Spec 02: Data Models (`Page`, `Choice`, `createPage`, `createChoice`, `generatePageId`)
- Spec 03: Persistence (`storage.savePage`, `storage.loadPage`, etc.)
- Spec 04: LLM (`generateOpeningPage`, `generateContinuationPage`, contexts)

## Outcome

Originally planned:
- Add page-generation service behavior and tests for root generation, continuation generation, and get-or-generate linking flow.

Actually changed:
- Added `src/engine/page-service.ts` with `generateFirstPage`, `generateNextPage`, and `getOrGeneratePage` using current repository APIs (`canonFacts`, extensionless imports, `parsePageId` for page 1).
- Added `test/unit/engine/page-service.test.ts` with mocked LLM/storage coverage for all acceptance behaviors.
- Strengthened coverage with an extra invariant test that `storage.updateStory` is skipped when generation does not change canon/story arc.
- Verified with `npm run test:unit -- --testPathPattern=test/unit/engine/page-service.test.ts --coverage=false` and `npm run typecheck`.
