# LOAOVELIFARC-002: Migrate content-packets controller to session helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001

## Problem

`public/js/src/11-content-packets.js` is the controller that triggered the CONPACCLEAN-002 bug class. It uses `.then()`/`.catch()` chains (the only controller still doing so), manually toggles overlay visibility, and uses `alert()` for error display. This ticket converts it to `async`/`await`, adopts the session helper, and replaces `alert()` with inline error display.

## Assumption Reassessment (2026-03-25)

1. `handleContentGenerate()` uses `.then()`/`.catch()` chains, not `async`/`await`. Confirmed at lines 132-160.
2. Overlay element is `progressEl` (`content-generation-progress`), and it serves as both overlay and progress text container (single-node layout). Confirmed.
3. Button management: `generateBtn` is manually disabled/re-enabled. Confirmed at lines 127, 141, 158.
4. Error display uses `alert()` for all generation errors. Confirmed at lines 99, 105, 144, 159.
5. `createLoadingProgressController(progressEl)` is called at line 12. Confirmed.

## Architecture Check

1. Converting `.then()` to `async`/`await` is required because `withProgress()` relies on `await` to know when async work completes.
2. Replacing `alert()` with inline error display follows the pattern already used by Kernels, Evolution, and Create Story controllers.
3. No backwards-compatibility shims.

## What to Change

### 1. Convert `handleContentGenerate()` to async/await

Replace the `.then()`/`.catch()` chain with `async function handleContentGenerate()` using `try`/`finally`.

### 2. Adopt session helper

Replace direct `createLoadingProgressController()` usage with `createLoadingOverlaySession()`:
```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressEl,
  progressElement: progressEl,
  buttonElement: generateBtn,
});
```

Wrap the fetch call in `session.withProgress(async function (progressId) { ... })`.

### 3. Replace `alert()` with inline error display

Add a visible error element (or locate existing one) and use a `showError(msg)` / `hideError()` pattern for the generation error path. The validation `alert()` calls (empty API key, empty exemplars) should also be replaced with inline error display.

### 4. Adopt defensive JSON parsing

Use the `try { data = await response.json(); } catch (_) { data = null; }` pattern already standard in other controllers.

### 5. Remove direct overlay/progress manipulation

Remove:
- `if (progressEl) progressEl.style.display = 'flex';`
- `if (loadingProgress) loadingProgress.start(progressId);`
- `if (loadingProgress) loadingProgress.stop();`
- `if (progressEl) progressEl.style.display = 'none';`
- `if (generateBtn) generateBtn.disabled = true;` / `= false;` inside the generation flow

These are now handled by the session helper.

### 6. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/11-content-packets.js` (modify)
- `public/js/app.js` (regenerate)

## Out of Scope

- Changes to the content-packets backend routes or API contracts
- Changes to `public/js/src/03-loading-progress.js`
- Changes to `public/js/src/03a-loading-overlay-session.js` (already created by LOAOVELIFARC-001)
- Migrating any other controller
- EJS template changes (unless an error display element is needed — in that case, only the content-packets template)
- Refactoring non-generation functions (`handleSaveGenerated`, `handlePinPacket`, `handleDeletePacket`)

## Acceptance Criteria

### Tests That Must Pass

1. Overlay becomes visible when generation starts
2. Overlay is hidden after successful generation
3. Overlay is hidden after generation failure (fetch rejection)
4. Overlay is hidden after generation failure (server error response)
5. Generate button is disabled during generation
6. Generate button is re-enabled after success
7. Generate button is re-enabled after failure
8. No `alert()` calls remain in the generation flow
9. Error messages display inline (not via `alert()`)
10. `handleContentGenerate()` is now an `async` function
11. Defensive JSON parsing handles non-JSON error responses
12. Existing suite: `npm run test:client`

### Invariants

1. The content-packets controller no longer calls `createLoadingProgressController()` directly
2. The content-packets controller no longer sets `progressEl.style.display` directly for the generation lifecycle
3. Non-generation functions (`handleSaveGenerated`, `handlePinPacket`, `handleDeletePacket`) remain unchanged
4. Rendered packet content and save/pin/delete behavior unchanged

## Test Plan

### New/Modified Tests

1. `test/unit/client/content-packets-page/controller.test.ts` — update existing tests for async/await flow, add overlay visibility assertions, add error display assertions

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
