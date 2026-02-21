# EVOLVE-06: Create Evolution Page Client-Side Controller

**Priority**: MEDIUM
**Depends on**: EVOLVE-04, EVOLVE-05
**Blocks**: None

## Summary

Create the client-side JavaScript controller for the evolution page. This handles kernel selection, concept filtering, parent selection, evolution API calls, progress polling, result rendering, and saving.

## Files to Create

1. **`public/js/src/12-evolution-controller.js`**

## Controller Responsibilities

### Initialization (on DOMContentLoaded, if `#evolution-page` exists)

1. Load kernels from `/kernels/api/list` and populate kernel selector
2. Restore API key from session storage (same pattern as concepts page)
3. Attach event listeners

### Kernel Selection

- On kernel selector change:
  - Show kernel summary card (same pattern as concepts page)
  - Fetch concepts from `/evolve/api/concepts-by-kernel/:kernelId`
  - Render selectable concept cards in parent selection area
  - Clear any previous selection
  - Update evolve button state

### Parent Concept Selection

- On concept card click:
  - Toggle selection state (add/remove `.concept-selected` class)
  - Enforce max 3 selections
  - Update selection counter text
  - Update evolve button state (enabled when 2-3 selected + API key present)

### Evolve Button Click

1. Collect: selected concept IDs, kernel ID, API key
2. Generate progress ID
3. Show loading overlay with progress polling (reuse `startProgressPolling` pattern from concepts controller)
4. POST to `/evolve/api/evolve` with `{ conceptIds, kernelId, apiKey, progressId }`
5. On success: hide loading, render offspring cards in results section
6. On error: hide loading, show error display

### Result Rendering

- Render offspring concept cards using same card format as concepts page results
- Each card shows: badges (genreFrame, conflictAxis, score), oneLineHook, elevatorParagraph, scores, strengths/weaknesses, verification data
- Each card has a "Save" button

### Save Button

- On save click:
  - POST to `/concepts/api/save` with:
    - `evaluatedConcept`: the offspring's evaluated concept data
    - `name`: derived from oneLineHook
    - `sourceKernelId`: the selected kernel ID
    - `verificationResult`: the offspring's verification (matched by index)
  - On success: show confirmation, disable save button ("Saved")
  - On error: show error message

### Progress Polling

Reuse the same progress polling pattern from the concepts controller:
- Poll `/generation-progress/:progressId` every 1.5s
- Update loading overlay with stage display names from `STAGE_DISPLAY_NAMES`
- Show spinner phrases from `STAGE_PHRASE_POOLS`

## Reuse Patterns

The following patterns from `11-concepts-controller.js` should be reused or extracted:
- Kernel loading and summary display
- API key session storage
- Progress polling setup
- Concept card rendering (for results)
- Save button handling
- Error display

If significant duplication would occur, consider extracting shared utilities into existing utility files (e.g., `02-utils.js`). However, avoid premature abstraction -- some duplication is acceptable for clarity.

## After Creation

Run `node scripts/concat-client-js.js` to regenerate `app.js`.

## Acceptance Criteria

- [ ] Kernel selector loads and populates from API
- [ ] Selecting kernel filters and displays available concepts
- [ ] Concept cards are selectable with visual feedback (2-3 max)
- [ ] Evolve button triggers API call with progress polling
- [ ] Loading overlay shows stage progress (EVOLVING -> EVALUATING -> VERIFYING)
- [ ] Results render offspring concept cards with full detail
- [ ] Save button calls /concepts/api/save and disables on success
- [ ] API key persisted in session storage
- [ ] app.js regenerated via concat script
- [ ] Client tests pass (`npm run test:client`)
