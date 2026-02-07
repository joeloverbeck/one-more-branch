# STRSTOARCSYS-002: Update Story Model

## Status
Completed

## Summary
Replace `storyArc: string | null` with `structure: StoryStructure | null` in the Story model. Update all related functions and type guards.

## Files to Touch
- `src/models/story.ts`
- `src/models/index.ts` (barrel export rename from `updateStoryArc` to `updateStoryStructure`)
- `test/unit/models/story.test.ts`

## Out of Scope
- DO NOT modify `src/models/page.ts` (that's STRSTOARCSYS-003)
- DO NOT modify persistence layer (that's STRSTOARCSYS-010)
- DO NOT modify engine layer (that's STRSTOARCSYS-008/009)
- DO NOT modify LLM/prompts layer
- DO NOT create structure generation logic

## Assumptions Reassessed (Repository Reality)
- `src/models/story-arc.ts` already exists from STRSTOARCSYS-001 and provides the `StoryStructure` type needed by this ticket.
- Existing engine/LLM/persistence code still references `storyArc`; those migrations are intentionally deferred to their own tickets and are not part of this ticket's acceptance checks.
- This ticket should verify model behavior through focused unit tests (`test/unit/models/story.test.ts`) and keep changes minimal to the model layer surface.

## Implementation Details

### Modify `Story` Interface

```typescript
// BEFORE
export interface Story {
  // ...
  storyArc: string | null;
  // ...
}

// AFTER
export interface Story {
  // ...
  structure: StoryStructure | null;  // Import from './story-arc'
  // ...
}
```

### Modify `createStory()`

Change initialization from `storyArc: null` to `structure: null`.

### Modify `isStory()` Type Guard

Replace:
```typescript
(typeof storyArc === 'string' || storyArc === null)
```

With validation for `structure` field:
- Must be `null` OR a valid `StoryStructure` object
- If object, must have `acts` array, `overallTheme` string, `generatedAt` Date (structural validation only; deep act/beat invariants are covered by STRSTOARCSYS-001 tests)

### Remove `updateStoryArc()` Function

Delete the entire function (will be replaced in STRSTOARCSYS-008).

### Add `updateStoryStructure()` Function

```typescript
export function updateStoryStructure(
  story: Story,
  structure: StoryStructure
): Story {
  return {
    ...story,
    structure,
    updatedAt: new Date(),
  };
}
```

### Add Helper Function

```typescript
export function isStoryStructure(value: unknown): value is StoryStructure {
  // Validate structure shape
}
```

## Acceptance Criteria

### Tests That Must Pass

Update `test/unit/models/story.test.ts`:

1. `createStory`
   - Creates story with `structure: null` (not `storyArc`)
   - All existing tests still pass (title, characterConcept, etc.)

2. `isStory`
   - Returns `true` for story with `structure: null`
   - Returns `true` for story with valid `StoryStructure` object
   - Returns `false` for story with invalid structure shape
   - Does NOT check for `storyArc` field

3. `updateStoryStructure`
   - Returns new story object (immutability)
   - Sets `structure` field correctly
   - Updates `updatedAt` timestamp
   - Does not modify original story object

4. `isStoryStructure`
   - Returns `true` for valid structure with acts, theme, date
   - Returns `false` for null
   - Returns `false` for object missing required fields
   - Returns `false` for object with wrong types

5. Barrel exports
   - `src/models/index.ts` exports `updateStoryStructure`
   - `src/models/index.ts` no longer exports `updateStoryArc`

### Invariants That Must Remain True
- `createStory()` always returns story with `structure: null`
- `updateStoryStructure()` returns new object (no mutation)
- `story.ts` type checks in strict mode for the updated model surface (cross-layer strict-mode fixes are deferred to dependent tickets)
- No reference to `storyArc` remains in `story.ts`
- All existing story tests pass (may need `storyArc` → `structure` rename)

## Dependencies
- STRSTOARCSYS-001 (needs StoryStructure type)

## Breaking Changes
- `Story.storyArc` field removed
- `updateStoryArc()` function removed
- Tests referencing `storyArc` in this ticket's scope are updated (`test/unit/models/story.test.ts`)
- Cross-layer migrations for `storyArc` references are handled in dependent tickets

## Estimated Scope
~50 lines of code changes + ~100 lines of test updates

## Outcome
Originally planned:
- Update only `src/models/story.ts` and associated story model tests.
- Remove `storyArc` model field and `updateStoryArc()` in favor of structure-based APIs.

Actually changed:
- Updated `src/models/story.ts` to replace `storyArc` with `structure`, add `isStoryStructure()`, and replace `updateStoryArc()` with `updateStoryStructure()`.
- Updated `src/models/index.ts` exports to expose `isStoryStructure` and `updateStoryStructure`.
- Updated and strengthened `test/unit/models/story.test.ts` for structure validation and legacy-shape rejection edge cases.
- Confirmed model barrel tests still pass via `test/unit/models/index.test.ts`.
