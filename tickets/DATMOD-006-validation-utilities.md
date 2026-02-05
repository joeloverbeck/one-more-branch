# DATMOD-006: Validation Utilities

## Summary

Implement validation utilities for comprehensive validation of Story, Page, and story integrity including cycle detection.

## Files to Touch

### Create
- `src/models/validation.ts`

### Modify
- None (depends on DATMOD-001 through DATMOD-005)

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
   - Error: `Choice ${i} creates a cycle by pointing to ancestor page ${pageId}`

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
- [ ] Returns valid=true for story with characterConcept >= 10 chars
- [ ] Returns valid=false with 'Character concept is too short' for < 10 chars
- [ ] Returns valid=false with 'Character concept is too long' for > 5000 chars
- [ ] Returns valid=false with 'Object is not a valid Story structure' for non-Story input

**validatePage tests:**
- [ ] Returns valid=true for page with narrativeText >= 50 chars, 2-5 choices
- [ ] Returns valid=false with 'Narrative text is too short' for < 50 chars
- [ ] Returns valid=false with 'Narrative text is too long' for > 10000 chars
- [ ] Returns valid=false with 'Non-ending pages must have at least 2 choices' for non-ending with 1 choice
- [ ] Returns valid=false with 'Too many choices' for non-ending with 6 choices
- [ ] Returns valid=false with 'Ending pages must have no choices' for ending with choices
- [ ] Returns valid=false with 'Duplicate choice texts detected' for duplicate choices

**validateNoCycle tests:**
- [ ] Returns valid=true when no cycles exist
- [ ] Returns valid=false when choice points to ancestor page

**validateStoryIntegrity tests:**
- [ ] Returns valid=true for story with page 1 and valid references
- [ ] Returns valid=false with 'Story must have page 1' when pages map is empty
- [ ] Returns valid=false when parent references non-existent page
- [ ] Returns valid=false when choice references non-existent page

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
