# STOKERSTAANDCONENR-07: Kernel Client-Side JavaScript

**Status**: PENDING
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-05, STOKERSTAANDCONENR-06
**Spec Phase**: 5b, 5c, 5d

## Summary

Create the kernel card renderer and kernels page controller. Regenerate app.js via concat script. These are the client-side JS files that power the kernels page interactivity.

## File List

### New Files
- `public/js/src/04e-kernel-renderer.js` -- Kernel card rendering functions
- `public/js/src/12-kernels-controller.js` -- Kernels page controller (init, event handlers, CRUD)

### Regenerated Files
- `public/js/app.js` -- Regenerated via `node scripts/concat-client-js.js`

### Modified Files
- `public/js/src/01-constants.js` -- Add `GENERATING_KERNELS` and `EVALUATING_KERNELS` to `STAGE_DISPLAY_NAMES` and `STAGE_PHRASE_POOLS` (if stage names need display labels)

### Test Files
- `test/unit/server/public/app.test.ts` -- May need updates if testing stage display names

## Detailed Requirements

### `public/js/src/01-constants.js` modifications

Add display names for new generation stages:
- `GENERATING_KERNELS`: Display name like "Generating Kernels"
- `EVALUATING_KERNELS`: Display name like "Evaluating Kernels"

Add to `STAGE_PHRASE_POOLS` with appropriate spinner phrases (mirror concept stage patterns).

### `public/js/src/04e-kernel-renderer.js`

Kernel card rendering functions. Reuse `getScoreColorClass()` from `04d-concept-renderer.js`.

**`renderKernelCard(evaluatedKernel, options)`**

Card layout:
- **Header**: `dramaticThesis` (truncated if needed)
- **Badges row**: `directionOfChange` badge (colored by type) + overall score badge (using `getScoreColorClass`)
- **Body**:
  - "Value at Stake: {valueAtStake}"
  - "Opposing Force: {opposingForce}"
  - "Thematic Question: {thematicQuestion}" (italic, prominent)
  - 5-dimension score grid with pip visualization or bar display
  - Strengths list (bullet points)
  - Weaknesses list (bullet points)
  - Tradeoff summary (paragraph)
- **Actions**:
  - If `options.mode === 'generated'`: "Save to Library" button
  - If `options.mode === 'saved'`: "Edit" and "Delete" buttons

**`renderKernelScoreGrid(scores)`** -- 5-dimension score visualization

**`getDirectionBadgeClass(direction)`** -- Returns CSS class for direction badge color

### `public/js/src/12-kernels-controller.js`

Kernels page controller. Mirror `11-concepts-controller.js` pattern:

1. **Initialization**: On page load (`initKernelsPage()`), load saved kernels via `GET /kernels/api/list`
2. **API key handling**: Same session storage pattern as concepts controller
3. **Generate flow**:
   - Click "Generate Kernels" -> POST to `/kernels/api/generate` with seeds + apiKey + progressId
   - Poll progress via existing progress polling service
   - On completion, render generated kernel cards in `#generated-kernels`
4. **Save**: Click "Save to Library" -> POST to `/kernels/api/save` with evaluated kernel data
5. **Edit**: Click "Edit" -> inline name editing -> PUT to `/kernels/api/:id`
6. **Delete**: Click "Delete" -> confirm -> DELETE to `/kernels/api/:id`
7. **Refresh library**: After save/edit/delete, re-fetch and re-render saved kernels section

### App.js regeneration

After creating both files, run `node scripts/concat-client-js.js` to regenerate `public/js/app.js`.

## Out of Scope

- EJS template (STOKERSTAANDCONENR-06)
- Backend routes/service (STOKERSTAANDCONENR-05)
- Concept page changes (STOKERSTAANDCONENR-10)
- New CSS files (reuse existing classes)
- Kernel-to-concept flow integration (STOKERSTAANDCONENR-10)

## Acceptance Criteria

### Tests That Must Pass
- `STAGE_DISPLAY_NAMES` includes entries for `GENERATING_KERNELS` and `EVALUATING_KERNELS`
- Client test (`npm run test:client`) passes after app.js regeneration
- `renderKernelCard` produces HTML containing dramaticThesis, valueAtStake, opposingForce, thematicQuestion
- `renderKernelCard` includes score badges and dimension grid
- `renderKernelCard` with `mode: 'generated'` includes save button
- `renderKernelCard` with `mode: 'saved'` includes edit/delete buttons
- Kernels controller initializes on correct page detection
- Generated app.js includes kernel renderer and controller code

### Invariants
- `public/js/app.js` is NEVER edited directly -- only regenerated
- Kernel renderer reuses `getScoreColorClass()` from concept renderer (no duplication)
- Controller follows same API key session storage pattern as concepts controller
- All AJAX calls use same error handling pattern as concepts controller
- File naming follows numeric prefix convention for concat order
