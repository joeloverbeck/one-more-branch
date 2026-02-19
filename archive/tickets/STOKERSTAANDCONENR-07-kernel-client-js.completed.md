# STOKERSTAANDCONENR-07: Kernel Client-Side JavaScript

**Status**: COMPLETED
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-05, STOKERSTAANDCONENR-06
**Spec Phase**: 5b, 5c, 5d

## Summary

Implement the missing client-side kernel UI layer (renderer + page controller), wire it into app initialization, and regenerate `public/js/app.js` from source files.

## Assumptions Reassessment (Corrected)

The original ticket assumptions were partially outdated. Current repository reality:

- Kernel backend/model/persistence/routes already exist and are tested:
  - `src/models/story-kernel.ts`, `src/models/saved-kernel.ts`
  - `src/persistence/kernel-repository.ts`
  - `src/server/routes/kernels.ts`
- Kernels page template already exists:
  - `src/server/views/pages/kernels.ejs`
- Kernel client JS does **not** exist yet:
  - Missing `public/js/src/04e-kernel-renderer.js`
  - Missing `public/js/src/12-kernels-controller.js`
- App bootstrapping currently initializes concepts/briefing/play/new-story only:
  - `public/js/src/09-controllers.js` needs to call `initKernelsPage()`.
- Constants currently do **not** include kernel stages in loading copy:
  - `STAGE_PHRASE_POOLS` missing `GENERATING_KERNELS` / `EVALUATING_KERNELS`
  - `STAGE_DISPLAY_NAMES` missing `GENERATING_KERNELS` / `EVALUATING_KERNELS`

## Scope (Corrected)

### In Scope
- Add kernel renderer source file: `public/js/src/04e-kernel-renderer.js`
- Add kernels page controller source file: `public/js/src/12-kernels-controller.js`
- Add kernel stage mappings in constants:
  - `public/js/src/01-constants.js`
- Wire kernels page init into global bootstrap:
  - `public/js/src/09-controllers.js`
- Regenerate bundled file:
  - `public/js/app.js` via concat script only
- Add/strengthen client and bundle tests for kernel behavior

### Out of Scope
- Backend routes/services/models/persistence (already implemented)
- EJS template structure changes unless blocked by a hard client need
- Concept page architecture rewrites
- New CSS architecture (reuse existing utility/card classes)

## Architecture Direction

Preferred implementation style:

- Follow existing module decomposition pattern used by concept client code:
  - render helpers in `04e-*`
  - page orchestration in `12-*`
- Keep renderer stateless/pure (string generation helpers + minimal DOM assumptions).
- Keep controller focused on:
  - DOM lookup
  - API orchestration
  - event delegation
  - incremental DOM updates
- Reuse shared primitives already in app architecture:
  - `getApiKey` / `setApiKey`
  - `createLoadingProgressController`
  - `createProgressId`
  - `escapeHtml`
  - `renderListItems`
  - `getScoreColorClass`

No aliasing or compatibility shims should be introduced.

## Detailed Requirements

### `public/js/src/01-constants.js`

Add to `STAGE_PHRASE_POOLS`:
- `GENERATING_KERNELS`: >= 20 phrases
- `EVALUATING_KERNELS`: >= 20 phrases

Add to `STAGE_DISPLAY_NAMES`:
- `GENERATING_KERNELS`: `'IDEATING'`
- `EVALUATING_KERNELS`: `'EVALUATING'`

### `public/js/src/04e-kernel-renderer.js`

Create kernel rendering helpers:

- `KERNEL_SCORE_FIELDS` (5 dimensions)
- `formatKernelLabel(value)`
- `getDirectionBadgeClass(direction)`
- `renderKernelScoreGrid(scores)`
- `renderKernelCard(evaluatedKernel, options)`

`renderKernelCard` should render:
- dramatic thesis title
- badges: direction + overall score
- value at stake, opposing force, thematic question
- 5-dimension score grid with pip visualization
- strengths/weaknesses lists
- tradeoff summary
- action buttons by mode:
  - `generated`: Save
  - `saved`: Edit + Delete

### `public/js/src/12-kernels-controller.js`

Create `initKernelsPage()` that:

1. Returns early unless `#kernels-page` exists
2. Restores API key into `#kernelApiKey` from session storage
3. Enables/disables generate button based on form validity
4. Generates kernels via `POST /kernels/api/generate` with seeds + `apiKey` + `progressId`
5. Uses loading progress controller while generation runs
6. Renders generated cards into `#generated-kernels`
7. Saves generated entry via `POST /kernels/api/save`
8. Loads saved kernels via `GET /kernels/api/list`
9. Supports inline edit in saved cards via `PUT /kernels/api/:id`
10. Supports delete via `DELETE /kernels/api/:id`
11. Refreshes saved kernels after save/edit/delete
12. Uses same inline error strategy (`showFormError`) as concepts controller

### `public/js/src/09-controllers.js`

Add `initKernelsPage()` to DOMContentLoaded initialization chain.

### App.js regeneration

Run `node scripts/concat-client-js.js` (or `npm run concat:js`) after source edits.

## Test Plan (Hard + Added Coverage)

### Must Pass
- `npm run test:client`
- `npm run test:unit -- test/unit/server/public/app.test.ts`

### Required New/Updated Coverage
- Kernel stages appear in bundled constants:
  - phrase pools + display names
- Bundled app initializes kernels page controller
- Kernels page behavior tests:
  - generate blocked when API key invalid/missing
  - generate blocked when all seed fields empty
  - successful generate renders kernel cards
  - generated card save flow calls save endpoint
  - saved card delete flow calls delete endpoint
  - saved card edit flow calls update endpoint

## Acceptance Criteria

- Kernels page works end-to-end client-side without page reload for CRUD operations.
- Kernel generation progress text/stages use kernel-specific stage keys.
- No duplicate score-color or list-rendering logic introduced.
- `public/js/app.js` regenerated from source (not manually edited).
- All relevant tests pass.

## Outcome

- **Completion date**: 2026-02-19
- **What changed**:
  - Added `public/js/src/04e-kernel-renderer.js` with reusable kernel-card and score-grid rendering helpers.
  - Added `public/js/src/12-kernels-controller.js` with kernel page init, generation flow, save/edit/delete actions, API key/session handling, and progress polling integration.
  - Updated `public/js/src/01-constants.js` with kernel stage phrase pools (20 each) and display names.
  - Updated `public/js/src/09-controllers.js` to initialize `initKernelsPage()` on `DOMContentLoaded`.
  - Regenerated `public/js/app.js` via concat script.
  - Added/updated tests for kernels controller behavior and kernel stage/display coverage in client/bundle tests.
- **Deviations from original plan**:
  - Instead of relying on a click-time validation test for empty seed submission, the controller now enforces seed presence primarily via disabled-state gating plus runtime guard in `handleGenerate`.
  - Added explicit kernel-stage mapping coverage in loading-progress tests to lock stage-display invariants.
- **Verification**:
  - `npm run lint` passed.
  - `npm run test:client` passed.
  - `npx jest test/unit/server/public/app.test.ts` passed.
