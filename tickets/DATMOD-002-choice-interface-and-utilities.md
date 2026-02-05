# DATMOD-002: Choice Interface and Utilities

## Summary

Implement the Choice interface and utility functions for creating choices and checking exploration status.

## Files to Touch

### Create
- `src/models/choice.ts`

### Modify
- None (depends on DATMOD-001 being complete)

## Out of Scope

- **DO NOT** create page.ts, story.ts, state.ts, validation.ts, or index.ts
- **DO NOT** implement Page or Story interfaces
- **DO NOT** modify id.ts
- **DO NOT** add any new dependencies

## Implementation Details

### Interface to Create

```typescript
interface Choice {
  readonly text: string;      // Display text for the option
  nextPageId: PageId | null;  // null = unexplored, PageId = explored
}
```

### Functions to Create

1. `createChoice(text: string, nextPageId?: PageId | null)` → Creates Choice object
   - Throws if text is empty or whitespace-only
   - Trims whitespace from text
   - Defaults nextPageId to null

2. `isChoice(value: unknown)` → Type guard
   - Returns true if object has:
     - `text`: non-empty string
     - `nextPageId`: null or positive integer >= 1

3. `isChoiceExplored(choice: Choice)` → Boolean
   - Returns `choice.nextPageId !== null`

### Validation Rules

- Text cannot be empty or whitespace-only
- Text gets trimmed on creation
- nextPageId must be null or a valid PageId (>= 1)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/choice.test.ts` with:

- [ ] `createChoice('Go north')` creates choice with text='Go north', nextPageId=null
- [ ] `createChoice('Go north', 5 as PageId)` creates choice with nextPageId=5
- [ ] `createChoice('  Go north  ')` creates choice with trimmed text='Go north'
- [ ] `createChoice('')` throws Error
- [ ] `createChoice('   ')` throws Error
- [ ] `isChoice({ text: 'Go', nextPageId: null })` returns true
- [ ] `isChoice({ text: 'Go', nextPageId: 5 })` returns true
- [ ] `isChoice(null)` returns false
- [ ] `isChoice({ text: '' })` returns false
- [ ] `isChoice({ nextPageId: 1 })` returns false (missing text)
- [ ] `isChoiceExplored({ text: 'Go', nextPageId: null })` returns false
- [ ] `isChoiceExplored({ text: 'Go', nextPageId: 5 as PageId })` returns true

### Invariants That Must Remain True

1. **Non-Empty Text**: Choice text is always a non-empty, trimmed string
2. **Valid PageId Reference**: nextPageId is either null or a valid PageId (>= 1)
3. **Exploration Status**: isChoiceExplored is true iff nextPageId !== null

## Dependencies

- DATMOD-001 (id.ts must exist for PageId import)

## Estimated Diff Size

- ~50 lines in `src/models/choice.ts`
- ~50 lines in `test/unit/models/choice.test.ts`
