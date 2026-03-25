# CONPACCLEAN-002: Fix missing spinner modal on content-packets page

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

When clicking "Generate Content Packets" on `/content-packets`, the loading overlay with spinner never appears. The pipeline runs correctly but the user sees no visual feedback. Other pages that use the loading-progress controller explicitly show and hide their overlay around the async lifecycle; this page currently starts polling without making its overlay visible.

### Root Cause

`public/js/src/11-content-packets.js` calls `loadingProgress.start(progressId)` which begins progress polling, but never sets `progressEl.style.display = 'flex'` to make the overlay visible. The loading-progress controller manages stage/status text and polling only; it does not own overlay visibility. Compare with `public/js/src/12-kernels-controller.js`, which explicitly sets the overlay display to `'flex'` before starting and `'none'` after stopping.

The EJS template (`src/server/views/pages/content-packets.ejs`) already renders the overlay with `style="display: none;"` and the expected loading markup. The overlay exists but is never shown.

## Assumption Reassessment (2026-03-25)

1. `src/server/views/pages/content-packets.ejs` renders the overlay with `id="content-generation-progress"` and the expected `.loading-stage`, `.loading-spinner`, and `.loading-status` children. Confirmed.
2. `public/js/src/11-content-packets.js` correctly resolves `progressEl` and instantiates `createLoadingProgressController(progressEl)`. Confirmed.
3. `public/js/src/03-loading-progress.js` manages text updates, timers, and polling only; it never changes `loadingElement.style.display`. Confirmed.
4. `public/js/src/11-content-packets.js` disables the button and hides prior results before generation, but never shows the overlay before calling `loadingProgress.start(progressId)`. Confirmed. This is the bug.
5. Existing client coverage already lives in `test/unit/client/content-packets-page/controller.test.ts`; a new test file is not required unless the existing spec becomes too noisy.
6. The page currently uses promise chaining, not `async`/`await`. The ticket should follow the existing controller style unless there is a compelling architectural reason to change it.

## Architecture Check

1. The proposed fix is beneficial relative to the current architecture because it restores the existing contract already used elsewhere: page controllers own overlay visibility, while `createLoadingProgressController()` owns progress text and polling.
2. The cleaner long-term architecture would be to give loading overlays a single page-level lifecycle helper so visibility and polling start/stop cannot drift apart. That is a broader refactor touching multiple pages and is out of scope for this ticket.
3. For this ticket, the robust change is to make the content-packets controller honor the existing contract consistently on start, success, and error.
4. No backwards-compatibility or aliasing accommodations are needed.

## What to Change

### 1. Show overlay before generation in `public/js/src/11-content-packets.js`

In `handleContentGenerate()`, after hiding previous results and before `loadingProgress.start(progressId)`:

```javascript
if (progressEl) progressEl.style.display = 'flex';
```

### 2. Hide overlay on all completion paths

Hide the overlay after `loadingProgress.stop()` when:

1. the fetch resolves successfully and `data.success` is `true`
2. the fetch resolves successfully but `data.success` is `false`
3. the fetch rejects

### 3. Regenerate app.js

Run `node scripts/concat-client-js.js`

## Files to Touch

- `public/js/src/11-content-packets.js` (modify)
- `public/js/app.js` (regenerate)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)

## Out of Scope

- Refactoring the loading progress controller
- Introducing a cross-page loading overlay lifecycle abstraction
- Changing spinner styling
- Other pages' spinner behavior

## Acceptance Criteria

### Tests That Must Pass

1. Overlay element's `display` is set to `'flex'` when generation starts.
2. Overlay element's `display` is set to `'none'` when generation completes successfully.
3. Overlay element's `display` is set to `'none'` when generation completes with an API-level failure response.
4. Overlay element's `display` is set to `'none'` when generation fails with a rejected fetch/error.
5. Existing suite: `npm run test:client`

### Invariants

1. Overlay is always hidden after generation completes, whether the request succeeds, fails at the API level, or rejects.
2. Overlay is visible during the generation request lifecycle.

## Test Plan

### New/Modified Tests

1. Modify `test/unit/client/content-packets-page/controller.test.ts` to assert that `handleContentGenerate` toggles `progressEl.style.display` correctly on start, API-level failure, rejected fetch, and success paths. Reuse the existing JSDOM harness for this page.

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. Manual: visit `/content-packets`, fill form, click Generate, and verify the spinner appears and disappears.

## Outcome

- Completion date: 2026-03-25
- Actual changes:
  - Updated `public/js/src/11-content-packets.js` so the content-packets overlay is shown before generation starts and hidden on success, API-level failure, and rejected-fetch failure.
  - Regenerated `public/js/app.js`.
  - Extended `test/unit/client/content-packets-page/controller.test.ts` instead of creating a new test file, because the repository already had a page-specific JSDOM harness for this controller.
- Deviations from original plan:
  - The ticket originally proposed a new standalone spinner test. The cleaner change was to strengthen the existing content-packets controller spec in place.
  - The reassessment clarified that `createLoadingProgressController()` does not own visibility; the page controller does.
- Verification results:
  - `npm run lint` passed.
  - `npm run typecheck` passed.
  - `npm run test:client` passed.
  - `npm test` passed.
