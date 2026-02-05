# DATMOD-005: Story Interface and Utilities

## Status

Completed (2026-02-05)

## Summary

Implement the Story interface and utilities for creating stories and updating story metadata.

## Reassessed Assumptions (2026-02-05)

- `src/models/story.ts` and `test/unit/models/story.test.ts` did not exist and were created in this ticket.
- Existing model source files use extensionless relative imports (for example `./id`); the story model follows this style.
- Existing tests use both relative paths and `@/` alias imports; the new story tests use `@/models/*` consistently.
- The acceptance criterion "Returns false for object with invalid id" required `isStory` to validate IDs with `isStoryId` instead of checking only for a string `id`.
- `specs/02-data-models.md` defines this ticket's in-scope story model shape/utilities and does not require persistence behavior here.

## Updated Scope

- Implement `src/models/story.ts` with `Story`, `CreateStoryData`, `StoryMetadata`, `createStory`, `isStory`, `updateStoryCanon`, and `updateStoryArc`.
- Add focused tests in `test/unit/models/story.test.ts` covering all acceptance criteria and one extra edge case around trimmed non-empty `characterConcept` in `isStory`.
- Do not modify `src/models/id.ts`, `src/models/choice.ts`, `src/models/state.ts`, `src/models/page.ts`, or create `src/models/index.ts`/`src/models/validation.ts` in this ticket.
- Preserve public function signatures and documented error messages.

## Files Touched

### Create
- `src/models/story.ts`
- `test/unit/models/story.test.ts`

### Modify
- `archive/tickets/DATMOD-005-story-interface-and-utilities.md` (status/assumptions/scope/outcome updates)

## Out of Scope

- **DO NOT** create validation.ts or index.ts
- **DO NOT** modify id.ts, choice.ts, state.ts, or page.ts
- **DO NOT** add any new dependencies
- **DO NOT** implement page storage or retrieval

## Implementation Details

### Types and Interfaces Created

```typescript
type StoryTone = string;

interface Story {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;
  storyArc: string | null;
  readonly createdAt: Date;
  updatedAt: Date;
}

interface CreateStoryData {
  characterConcept: string;
  worldbuilding?: string;
  tone?: string;
}

interface StoryMetadata {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly tone: StoryTone;
  readonly createdAt: Date;
  readonly pageCount: number;
  readonly hasEnding: boolean;
}
```

### Functions Created

1. `createStory(data: CreateStoryData)` → Story
   - Generates new StoryId using `generateStoryId()`
   - Requires non-empty `characterConcept` (throws if empty/whitespace)
   - Trims all string fields
   - Defaults: `worldbuilding` → `''`, `tone` → `'fantasy adventure'`
   - Sets `globalCanon` to `[]`, `storyArc` to `null`
   - Sets `createdAt` and `updatedAt` to current Date

2. `isStory(value: unknown)` → Type guard
   - Checks: `id` (`isStoryId`), `characterConcept` (non-empty string after trimming), `worldbuilding` (string), `tone` (string), `globalCanon` (array), `storyArc` (string or null), `createdAt`/`updatedAt` (`Date`)

3. `updateStoryCanon(story: Story, newCanon: GlobalCanon)` → Story
   - Returns new Story object with updated `globalCanon`
   - Updates `updatedAt` timestamp
   - Does NOT mutate original story

4. `updateStoryArc(story: Story, arc: string)` → Story
   - Returns new Story object with trimmed `storyArc`
   - Updates `updatedAt` timestamp
   - Does NOT mutate original story

### Error Messages

- `'Character concept is required'` (for empty/whitespace `characterConcept`)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/story.test.ts` with:

**createStory tests:**
- [x] Creates story with only required characterConcept
- [x] Generated id is valid StoryId (using isStoryId)
- [x] Defaults worldbuilding to ''
- [x] Defaults tone to 'fantasy adventure'
- [x] Sets globalCanon to []
- [x] Sets storyArc to null
- [x] Creates story with all fields provided
- [x] Trims whitespace from characterConcept, worldbuilding, tone
- [x] Throws 'Character concept is required' for empty string
- [x] Throws 'Character concept is required' for whitespace-only string
- [x] Sets createdAt and updatedAt to current time (within test bounds)
- [x] createdAt equals updatedAt initially

**isStory tests:**
- [x] Returns true for valid Story object
- [x] Returns false for null
- [x] Returns false for empty object
- [x] Returns false for object with invalid id

**updateStoryCanon tests:**
- [x] Updates globalCanon to new value
- [x] Updates updatedAt timestamp
- [x] Does NOT mutate original story (verify original unchanged)

**updateStoryArc tests:**
- [x] Updates storyArc to trimmed value
- [x] Updates updatedAt timestamp
- [x] Does NOT mutate original story

### Invariants That Must Remain True

1. **Unique Story IDs**: Every Story has a valid UUID v4 as id
2. **Non-Empty Concept**: characterConcept is always non-empty after trimming
3. **Immutable Updates**: updateStoryCanon and updateStoryArc return new objects
4. **Timestamp Tracking**: updatedAt is updated on any modification

## Dependencies

- DATMOD-001 (StoryId, generateStoryId from id.ts)
- DATMOD-003 (GlobalCanon from state.ts)

## Estimated Diff Size

- ~90 lines in `src/models/story.ts`
- ~100 lines in `test/unit/models/story.test.ts`

## Outcome

Originally planned:
- Add `src/models/story.ts` and `test/unit/models/story.test.ts` implementing the Story interfaces/utilities and listed acceptance tests.

Actually changed:
- Added `src/models/story.ts` with `Story`, `CreateStoryData`, `StoryMetadata`, `createStory`, `isStory`, `updateStoryCanon`, and `updateStoryArc`.
- Added `test/unit/models/story.test.ts` covering the required acceptance scenarios.
- Added one extra edge-case test to ensure `isStory` rejects whitespace-only `characterConcept`, reinforcing the non-empty concept invariant.
- Corrected ticket assumptions to require `isStoryId` validation in `isStory` so the ticket matches its own acceptance criteria and `specs/02-data-models.md` invariants.
- No public API changes or out-of-scope model file changes were made.
