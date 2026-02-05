# DATMOD-002: Choice Interface and Utilities

## Status

Completed (2026-02-05)

## Summary

Implement the Choice interface and utility functions for creating choices and checking exploration status.

## Reassessed Assumptions (2026-02-05)

- `src/models/id.ts` and `test/unit/models/id.test.ts` already exist and DATMOD-001 is completed in `archive/tickets/`.
- `src/models/choice.ts` does not exist yet and must be created in this ticket.
- `test/unit/models/choice.test.ts` does not exist yet and must be created in this ticket.
- This repository currently uses relative imports in model tests (`../../../src/...`), so new tests should follow existing test style.
- `PageId` validity should use the existing `isPageId` utility (`number`, integer, `>= 1`), not a looser numeric check.

## Updated Scope

- Implement only `src/models/choice.ts` (Choice interface, `createChoice`, `isChoice`, `isChoiceExplored`).
- Add focused unit tests in `test/unit/models/choice.test.ts` for all acceptance criteria and key edge cases around invalid `nextPageId` values.
- Keep public API exactly as listed in this ticket; do not introduce additional model modules.
- Keep behavior aligned with `specs/02-data-models.md` and existing `id.ts` helpers.

## Files to Touch

### Create
- `src/models/choice.ts`
- `test/unit/models/choice.test.ts`

### Modify
- `archive/tickets/DATMOD-002-choice-interface-and-utilities.md` (assumptions/scope/status/outcome updates)

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
- [x] `createChoice('Go north')` creates choice with text='Go north', nextPageId=null
- [x] `createChoice('Go north', 5 as PageId)` creates choice with nextPageId=5
- [x] `createChoice('  Go north  ')` creates choice with trimmed text='Go north'
- [x] `createChoice('')` throws Error
- [x] `createChoice('   ')` throws Error
- [x] `isChoice({ text: 'Go', nextPageId: null })` returns true
- [x] `isChoice({ text: 'Go', nextPageId: 5 })` returns true
- [x] `isChoice(null)` returns false
- [x] `isChoice({ text: '' })` returns false
- [x] `isChoice({ nextPageId: 1 })` returns false (missing text)
- [x] `isChoiceExplored({ text: 'Go', nextPageId: null })` returns false
- [x] `isChoiceExplored({ text: 'Go', nextPageId: 5 as PageId })` returns true

### Invariants That Must Remain True

1. **Non-Empty Text**: Choice text is always a non-empty, trimmed string
2. **Valid PageId Reference**: nextPageId is either null or a valid PageId (>= 1)
3. **Exploration Status**: isChoiceExplored is true iff nextPageId !== null

## Dependencies

- DATMOD-001 (id.ts must exist for PageId import)

## Estimated Diff Size

- ~50 lines in `src/models/choice.ts`
- ~50 lines in `test/unit/models/choice.test.ts`

## Outcome

Originally planned:
- Implement `Choice` plus `createChoice`, `isChoice`, and `isChoiceExplored`.
- Add unit tests covering the listed acceptance scenarios.

Actually changed:
- Added `src/models/choice.ts` with the `Choice` interface and the three utilities in scope.
- `createChoice` now enforces trimmed non-empty text and validates `nextPageId` with `isPageId`.
- Added `test/unit/models/choice.test.ts` covering every listed acceptance test.
- Added extra invariant tests for invalid `nextPageId` values (`0`, negative, non-integer) and whitespace-only `text` in `isChoice`.
