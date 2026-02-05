# DATMOD-001: ID Types and Utilities

## Status

Completed (2026-02-05)

## Summary

Implement branded ID types and utility functions for generating, validating, and parsing Story and Page identifiers.

## Reassessed Assumptions (2026-02-05)

- `src/models/id.ts` does not exist yet.
- `src/models/` currently only has `.gitkeep`; creating `id.ts` is required.
- Unit tests currently contain only `test/unit/foundation.test.ts`; `test/unit/models/id.test.ts` must be created.
- `uuid` is already present in `package.json`; no dependency changes are required.
- Spec reference: `specs/02-data-models.md` defines `StoryId`, `PageId`, `ChoiceIndex`, and the six ID utility functions in scope for this ticket.

## Updated Scope

- Implement only `src/models/id.ts` with branded ID types and ID utility functions.
- Add focused tests in `test/unit/models/id.test.ts` for acceptance criteria and parse/guard consistency.
- Do not create additional model modules in this ticket.
- Preserve API compatibility with the function signatures listed in this ticket.

## Files to Touch

### Create
- `src/models/id.ts`
- `test/unit/models/id.test.ts`

### Modify
- `archive/tickets/DATMOD-001-id-types-and-utilities.md` (assumptions/scope/status/outcome updates)

## Out of Scope

- **DO NOT** create any other model files (choice.ts, state.ts, page.ts, story.ts, validation.ts, index.ts)
- **DO NOT** implement Choice, Page, or Story interfaces
- **DO NOT** add dependencies beyond `uuid` package
- **DO NOT** create test files for other modules

## Implementation Details

### Types to Create

1. **StoryId**: Branded string type for UUID v4 story identifiers
2. **PageId**: Branded number type for incremental page numbers (1, 2, 3, ...)
3. **ChoiceIndex**: Branded number type for choice indices (0, 1, 2, ...)

### Functions to Create

1. `generateStoryId()` → Returns new UUID v4 as StoryId
2. `generatePageId(existingPageCount: number)` → Returns next PageId
3. `isStoryId(value: unknown)` → Type guard for StoryId (UUID v4 regex)
4. `isPageId(value: unknown)` → Type guard for PageId (positive integer)
5. `parseStoryId(value: string)` → Throws if invalid, returns StoryId
6. `parsePageId(value: number)` → Throws if invalid, returns PageId

### UUID v4 Regex Pattern

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/id.test.ts` with:

- [x] `generateStoryId` returns valid UUID v4
- [x] `generateStoryId` produces unique IDs (100 iterations, all unique)
- [x] `generatePageId(0)` returns 1
- [x] `generatePageId(5)` returns 6
- [x] `isStoryId` returns true for valid UUID v4: `'550e8400-e29b-41d4-a716-446655440000'`
- [x] `isStoryId` returns false for `'not-a-uuid'`, `''`, `123`
- [x] `isPageId` returns true for 1, 100
- [x] `isPageId` returns false for 0, -1, 1.5, `'1'`
- [x] `parseStoryId` returns valid StoryId for valid UUID
- [x] `parseStoryId` throws for invalid input
- [x] `parsePageId(5)` returns 5
- [x] `parsePageId(0)` throws
- [x] `parsePageId(-1)` throws

### Invariants That Must Remain True

1. **Unique Story IDs**: Every generated StoryId is a valid UUID v4
2. **Unique Page IDs**: PageId within a story is a positive integer >= 1
3. **Type Safety**: Branded types prevent accidental mixing of ID types
4. **Parse/Guard Consistency**: `parseX` throws exactly when `isX` returns false
5. **PageId Generation Contract**: `generatePageId(existingPageCount)` returns `existingPageCount + 1`

## Dependencies

- `uuid` package (already in package.json from spec-01)

## Estimated Diff Size

- ~80 lines in `src/models/id.ts`
- ~80 lines in `test/unit/models/id.test.ts`

## Outcome

Originally planned:
- Add `src/models/id.ts` and `test/unit/models/id.test.ts` for ID types/utilities and required acceptance tests.

Actually changed:
- Added `src/models/id.ts` with `StoryId`, `PageId`, `ChoiceIndex`, plus `generateStoryId`, `generatePageId`, `isStoryId`, `isPageId`, `parseStoryId`, and `parsePageId`.
- Added `test/unit/models/id.test.ts` covering all listed acceptance checks.
- Added extra invariant-focused tests for parse/guard consistency (including uppercase UUID compatibility due to case-insensitive validation).
- No additional model modules or dependencies were introduced.
