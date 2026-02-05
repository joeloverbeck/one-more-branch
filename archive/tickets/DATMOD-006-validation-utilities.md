# DATMOD-006: Validation Utilities

## Status

Completed (2026-02-05)

## Summary

Implement validation utilities for comprehensive validation of Story, Page, and story integrity including cycle detection.

## Reassessed Assumptions (2026-02-05)

- `src/models/validation.ts` and `test/unit/models/validation.test.ts` did not exist and were created in this ticket.
- Existing model files use extensionless relative imports (for example `./story`), and tests use `@/models/*` aliases.
- `createPage` enforces core page-shape invariants and throws for invalid structures, so some `validatePage` negative tests must pass plain objects (typed as `unknown`) instead of calling `createPage`.
- The `Files to Touch` section was missing `test/unit/models/validation.test.ts` even though the acceptance criteria require creating it.
- `specs/02-data-models.md` confirms this ticket owns only validation utilities and tests; barrel exports remain DATMOD-007.

## Updated Scope

- Create `src/models/validation.ts` implementing `ValidationResult`, `validateStory`, `validatePage`, `validateNoCycle`, and `validateStoryIntegrity` with pure return-based validation (no throws).
- Create `test/unit/models/validation.test.ts` covering all listed acceptance criteria.
- For invalid shape scenarios, test `validatePage` using `unknown` object literals so validation behavior is exercised independently from `createPage` fail-fast guards.
- Keep existing model APIs unchanged and avoid modifying out-of-scope model files.

## Files to Touch

### Create
- `src/models/validation.ts`
- `test/unit/models/validation.test.ts`

### Modify
- `archive/tickets/DATMOD-006-validation-utilities.md` (assumptions/scope/status/outcome update)

## Out of Scope

- **DO NOT** create index.ts (that's DATMOD-007)
- **DO NOT** modify any existing model files
- **DO NOT** add any new dependencies
- **DO NOT** implement persistence or file operations

## Implementation Details

### Interface to Create

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}
```

### Functions to Create

1. `validateStory(story: unknown)` → ValidationResult
   - First checks if isStory(story) returns true
   - If not a valid Story structure, return early with error
   - Validates:
     - characterConcept.length >= 10 (error: 'Character concept is too short (minimum 10 characters)')
     - characterConcept.length <= 5000 (error: 'Character concept is too long (maximum 5000 characters)')

2. `validatePage(page: unknown)` → ValidationResult
   - First checks if isPage(page) returns true
   - If not a valid Page structure, return early with error
   - Validates:
     - narrativeText.length >= 50 (error: 'Narrative text is too short (minimum 50 characters)')
     - narrativeText.length <= 10000 (error: 'Narrative text is too long (maximum 10000 characters)')
     - If !isEnding: choices.length >= 2 (error: 'Non-ending pages must have at least 2 choices')
     - If !isEnding: choices.length <= 5 (error: 'Too many choices (maximum 5)')
     - If isEnding: choices.length === 0 (error: 'Ending pages must have no choices')
     - No duplicate choice texts (case-insensitive) (error: 'Duplicate choice texts detected')

3. `validateNoCycle(page: Page, getPage: (id: PageId) => Page | undefined)` → ValidationResult
   - Builds set of ancestor PageIds by traversing parent chain
   - Checks if any choice.nextPageId is in the ancestor set
   - Error: `Choice ${i} creates a cycle by pointing to ancestor page ${choice.nextPageId}`

4. `validateStoryIntegrity(story: Story, pages: Map<PageId, Page>)` → ValidationResult
   - Validates:
     - Story must have page 1 (error: 'Story must have page 1')
     - If page 1 is ending and pages.size > 1: error 'Page 1 cannot be an ending if there are more pages'
     - All parent references point to existing pages
     - All choice nextPageId references point to existing pages

### Return Pattern

All functions return `{ valid: boolean, errors: string[] }`:
- valid = true when errors.length === 0
- valid = false when errors.length > 0
- Never throw exceptions (pure validation)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/models/validation.test.ts` with:

**validateStory tests:**
- [x] Returns valid=true for story with characterConcept >= 10 chars
- [x] Returns valid=false with 'Character concept is too short' for < 10 chars
- [x] Returns valid=false with 'Character concept is too long' for > 5000 chars
- [x] Returns valid=false with 'Object is not a valid Story structure' for non-Story input

**validatePage tests:**
- [x] Returns valid=true for page with narrativeText >= 50 chars, 2-5 choices
- [x] Returns valid=false with 'Narrative text is too short' for < 50 chars
- [x] Returns valid=false with 'Narrative text is too long' for > 10000 chars
- [x] Returns valid=false with 'Non-ending pages must have at least 2 choices' for non-ending with 1 choice
- [x] Returns valid=false with 'Too many choices' for non-ending with 6 choices
- [x] Returns valid=false with 'Ending pages must have no choices' for ending with choices
- [x] Returns valid=false with 'Duplicate choice texts detected' for duplicate choices

**validateNoCycle tests:**
- [x] Returns valid=true when no cycles exist
- [x] Returns valid=false when choice points to ancestor page

**validateStoryIntegrity tests:**
- [x] Returns valid=true for story with page 1 and valid references
- [x] Returns valid=false with 'Story must have page 1' when pages map is empty
- [x] Returns valid=false when parent references non-existent page
- [x] Returns valid=false when choice references non-existent page

### Invariants That Must Remain True

1. **Pure Validation**: Functions never throw, always return ValidationResult
2. **Complete Errors**: All detected errors are included in errors array
3. **Valid = No Errors**: valid === (errors.length === 0)
4. **Acyclic Graph**: validateNoCycle ensures no page links create cycles

## Dependencies

- DATMOD-001 (PageId from id.ts)
- DATMOD-002 (isChoice from choice.ts)
- DATMOD-004 (Page, isPage from page.ts)
- DATMOD-005 (Story, isStory from story.ts)

## Estimated Diff Size

- ~120 lines in `src/models/validation.ts`
- ~120 lines in `test/unit/models/validation.test.ts`

## Outcome

Originally planned:
- Add validation utilities and matching unit tests without changing existing model files.

Actually changed:
- Added `src/models/validation.ts` with `ValidationResult`, `validateStory`, `validatePage`, `validateNoCycle`, and `validateStoryIntegrity`.
- Added `test/unit/models/validation.test.ts` covering every listed acceptance test case.
- Added/confirmed an edge-case coverage detail where invalid `Page` structures are tested via `unknown` object literals to isolate validation behavior from `createPage` fail-fast exceptions.
- Corrected ticket assumptions/scope and fixed the `validateNoCycle` documented error interpolation to match actual behavior.
- No public API changes and no out-of-scope model file modifications were made.
