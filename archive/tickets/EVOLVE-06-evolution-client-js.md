# EVOLVE-06: Create Evolution Page Client-Side Controller

**Status**: COMPLETED
**Priority**: MEDIUM
**Depends on**: EVOLVE-04, EVOLVE-05
**Blocks**: None

## Summary

Create the client-side JavaScript controller for the evolution page. This handles kernel selection, concept filtering, parent selection, evolution API calls, progress polling, result rendering, and saving.

## Assumption Reassessment (2026-02-21)

Corrected assumptions against current codebase:
- `public/js/src/12-kernels-controller.js` already exists, so the new controller must be `public/js/src/13-evolution-controller.js`.
- Progress polling is centralized in `public/js/src/03-loading-progress.js` via `createLoadingProgressController(...)`; there is no standalone `startProgressPolling` helper.
- Stage phrase/display metadata is generated into `public/js/src/00-stage-metadata.js` (not authored directly in `01-constants.js`).
- Existing selection styling uses `.spine-card-selected`; `.concept-selected` is not defined in CSS.
- `npm run concat:js` is the canonical regeneration command because it runs stage metadata sync before concatenation.

## Files to Create

1. **`public/js/src/13-evolution-controller.js`**

## Files to Modify

1. **`public/js/src/09-controllers.js`** (invoke evolution page init on DOM load)
2. **`test/unit/client/fixtures/html-fixtures.ts`** (add evolution page fixture)
3. **`test/unit/client/evolution-page/controller.test.ts`** (new characterization/behavior tests)

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
  - Toggle selection state (add/remove `.spine-card-selected` class)
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

Reuse `createLoadingProgressController`:
- Poll `/generation-progress/:progressId` every `PROGRESS_POLL_INTERVAL_MS`
- Update loading overlay with stage display names from `STAGE_DISPLAY_NAMES`
- Show spinner phrases from `STAGE_PHRASE_POOLS`

## Reuse Patterns

The following patterns from `11-concepts-controller.js` and shared helpers should be reused:
- Kernel loading and summary display
- API key session storage
- Progress polling setup (`createLoadingProgressController`)
- Concept card rendering (for results)
- Save button handling
- Error display

If significant duplication would occur, consider extracting shared utilities into existing utility files (e.g., `02-utils.js`). However, avoid premature abstraction -- some duplication is acceptable for clarity.

## After Creation

Run `npm run concat:js` to regenerate `app.js` safely.

## Acceptance Criteria

- [x] Kernel selector loads and populates from API
- [x] Selecting kernel filters and displays available concepts
- [x] Concept cards are selectable with visual feedback (2-3 max)
- [x] Evolve button triggers API call with progress polling
- [x] Loading overlay shows stage progress (EVOLVING -> EVALUATING -> VERIFYING)
- [x] Results render offspring concept cards with full detail
- [x] Save button calls /concepts/api/save and disables on success
- [x] API key persisted in session storage
- [x] app.js regenerated via `npm run concat:js`
- [x] Client tests pass (`npm run test:client`)
- [x] Evolution client tests added for kernel selection, parent selection constraints, evolve request, and save behavior

## Outcome

- **Completion date**: 2026-02-21
- **What actually changed**:
  - Implemented the evolution page controller as `public/js/src/13-evolution-controller.js`.
  - Wired controller startup into `public/js/src/09-controllers.js`.
  - Extracted shared kernel UI/data helpers into `public/js/src/02-utils.js` and reused them in both concepts/evolution controllers for cleaner architecture.
  - Added evolution page HTML test fixture in `test/unit/client/fixtures/html-fixtures.ts`.
  - Added focused client coverage in `test/unit/client/evolution-page/controller.test.ts`.
  - Regenerated concatenated client bundle via `npm run concat:js`.
- **Deviations from original plan**:
  - Used `13-evolution-controller.js` (not `12-evolution-controller.js`) because `12-kernels-controller.js` already exists.
  - Reused existing `.spine-card-selected` styling instead of introducing `.concept-selected`.
  - Reused `createLoadingProgressController` rather than a bespoke progress polling helper.
- **Verification results**:
  - `npm run test:client` passed.
  - `npm run lint` passed.
