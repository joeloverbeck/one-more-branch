# STOKERSTAANDCONENR-06: Kernel UI Page (EJS Template)

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-05
**Spec Phase**: 5a

## Summary

Create the kernels page EJS template. This is the server-rendered page that hosts the kernel generation form and results display. Mirror the concepts page template structure.

## File List

### New Files
- `src/server/views/pages/kernels.ejs` -- Kernels page template

### Modified Files
- None

### Test Files
- Covered by route tests in STOKERSTAANDCONENR-05 (GET `/kernels` renders this template)

## Detailed Requirements

### `src/server/views/pages/kernels.ejs`

Mirror `src/server/views/pages/concepts.ejs` layout and structure:

1. **Page header**: Title "Story Kernels" with description explaining what a kernel is ("The irreducible dramatic proposition -- a value at stake, an opposing force, and a direction of change")

2. **API key section**: Same pattern as concepts page -- input field for OpenRouter API key, stored in session storage client-side

3. **Seed input form** with 3 text areas (all optional):
   - `thematicInterests` -- placeholder: "What themes fascinate you? e.g., power, corruption, the cost of ambition"
   - `emotionalCore` -- placeholder: "What emotional experience do you want? e.g., dread that builds slowly, betrayal from someone trusted"
   - `sparkLine` -- placeholder: "A raw idea or inspiration. e.g., A leader who must sacrifice the people they protect"

4. **Generate button**: "Generate Kernels" button with loading state, disabled until API key is entered

5. **Progress spinner section**: Same pattern as concepts page, container for stage-based progress display

6. **Generated kernels section**: Container (`#generated-kernels`) for kernel cards rendered by client JS after generation

7. **Saved kernels library section**: Container (`#saved-kernels`) for saved kernel cards, populated on page load

8. Page must include `<script>` reference consistent with the app.js pattern (loaded via the concat build)

## Out of Scope

- Client-side JavaScript rendering logic (STOKERSTAANDCONENR-07)
- Concept page changes (STOKERSTAANDCONENR-10)
- Home page navigation link (STOKERSTAANDCONENR-08)
- Styling beyond what's needed for functional layout (reuse existing CSS classes)

## Acceptance Criteria

### Tests That Must Pass
- Template renders without errors when passed `{ title, kernels: [] }`
- Template contains form elements for `thematicInterests`, `emotionalCore`, `sparkLine`
- Template contains API key input section
- Template contains `#generated-kernels` container
- Template contains `#saved-kernels` container
- Template contains generate button

### Invariants
- Template mirrors concepts.ejs structure (header, form, results, library)
- Only 3 seed fields (not 5 like concepts) -- no genreVibes or moodKeywords
- API key input follows same session storage pattern as concepts
- No inline JavaScript logic (all behavior in client JS files)
- Uses existing CSS classes and layout patterns from concepts page
