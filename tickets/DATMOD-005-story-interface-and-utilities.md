# DATMOD-005: Story Interface and Utilities

## Summary

Implement the Story interface and utilities for creating stories and updating story metadata.

## Files to Touch

### Create
- `src/models/story.ts`

### Modify
- None (depends on DATMOD-001, DATMOD-003)

## Out of Scope

- **DO NOT** create validation.ts or index.ts
- **DO NOT** modify id.ts, choice.ts, state.ts, or page.ts
- **DO NOT** add any new dependencies
- **DO NOT** implement page storage or retrieval

## Implementation Details

### Types and Interfaces to Create

```typescript
type StoryTone = string;

interface Story {
  readonly id: StoryId;
  readonly characterConcept: string;
  readonly worldbuilding: string;
  readonly tone: StoryTone;
  globalCanon: GlobalCanon;       // Mutable (can be updated)
  storyArc: string | null;        // Mutable (can be set later)
  readonly createdAt: Date;
  updatedAt: Date;                // Mutable (updates on changes)
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

### Functions to Create

1. `createStory(data: CreateStoryData)` → Story
   - Generates new StoryId using generateStoryId()
   - Requires non-empty characterConcept (throws if empty/whitespace)
   - Trims all string fields
   - Defaults: worldbuilding → '', tone → 'fantasy adventure'
   - Sets globalCanon to [], storyArc to null
   - Sets createdAt and updatedAt to current Date

2. `isStory(value: unknown)` → Type guard
   - Checks: id (string), characterConcept (non-empty string), worldbuilding (string), tone (string), globalCanon (array)

3. `updateStoryCanon(story: Story, newCanon: GlobalCanon)` → Story
   - Returns new Story object with updated globalCanon
   - Updates updatedAt timestamp
   - Does NOT mutate original story

4. `updateStoryArc(story: Story, arc: string)` → Story
   - Returns new Story object with trimmed storyArc
   - Updates updatedAt timestamp
   - Does NOT mutate original story

### Error Messages

- `'Character concept is required'` (for empty/whitespace characterConcept)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/story.test.ts` with:

**createStory tests:**
- [ ] Creates story with only required characterConcept
- [ ] Generated id is valid StoryId (using isStoryId)
- [ ] Defaults worldbuilding to ''
- [ ] Defaults tone to 'fantasy adventure'
- [ ] Sets globalCanon to []
- [ ] Sets storyArc to null
- [ ] Creates story with all fields provided
- [ ] Trims whitespace from characterConcept, worldbuilding, tone
- [ ] Throws 'Character concept is required' for empty string
- [ ] Throws 'Character concept is required' for whitespace-only string
- [ ] Sets createdAt and updatedAt to current time (within test bounds)
- [ ] createdAt equals updatedAt initially

**isStory tests:**
- [ ] Returns true for valid Story object
- [ ] Returns false for null
- [ ] Returns false for empty object
- [ ] Returns false for object with invalid id

**updateStoryCanon tests:**
- [ ] Updates globalCanon to new value
- [ ] Updates updatedAt timestamp
- [ ] Does NOT mutate original story (verify original unchanged)

**updateStoryArc tests:**
- [ ] Updates storyArc to trimmed value
- [ ] Updates updatedAt timestamp
- [ ] Does NOT mutate original story

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
