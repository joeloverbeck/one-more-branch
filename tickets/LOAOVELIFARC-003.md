# LOAOVELIFARC-003: Migrate kernels-controller to session helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001, `archive/tickets/ERRDISPARCH-001.md`

## Problem

`public/js/src/12-kernels-controller.js` manually coordinates overlay visibility and progress polling in `handleGenerate()`. It is already `async`/`await` and uses `try`/`finally`, making it a clean migration candidate. The `syncGenerateButtonState()` call in `finally` should move to `onHide`.

Note: `LOAOVELIFARC-001` already migrated `content-packets`, so this ticket is now the first remaining controller-level migration in the series.

## Assumption Reassessment (2026-03-25)

1. `handleGenerate()` is already `async` with `try`/`catch`/`finally`. Confirmed at lines 208-275.
2. Two-node overlay: `progressSection` (overlay container) and `progressContent` (progress text node). Confirmed at lines 15-16.
3. Manual visibility: `progressSection.style.display = 'flex'` at line 227, `progressSection.style.display = 'none'` at line 272. Confirmed.
4. Manual polling: `loadingProgress.start(progressId)` at line 229, `loadingProgress.stop()` at line 271. Confirmed.
5. `generateBtn` is manually disabled at line 226 but re-enabled via `syncGenerateButtonState()` at line 273. Confirmed.
6. `syncGenerateButtonState()` is called in `finally` after overlay is hidden — this should become `onHide`. Confirmed.
7. `12-kernels-controller.js` still reports page-level failures through legacy `showFormError()` instead of a page-owned explicit error node. Confirmed.
8. `src/server/views/pages/kernels.ejs` does not currently expose a dedicated inline error element for generation failures. Confirmed.

## Architecture Check

1. Straightforward swap: replace manual overlay/polling code with session helper.
2. `syncGenerateButtonState()` wired to `onHide` keeps cleanup declarative and co-located with session setup.
3. This ticket should also finish the page-level error ownership for kernels while touching the same flow. Adding a dedicated `#kernel-generation-error` node and binding it explicitly is cleaner than keeping `showFormError()` on a page that already has a well-defined generation section.
4. No backwards-compatibility aliases.

## What to Change

### 1. Replace direct `createLoadingProgressController` with session helper

```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressSection,
  progressElement: progressContent,
  buttonElement: generateBtn,
  onHide: syncGenerateButtonState,
});
```

### 2. Simplify `handleGenerate()`

Replace:
```javascript
generateBtn.disabled = true;
progressSection.style.display = 'flex';
var progressId = createProgressId();
loadingProgress.start(progressId);
// ... try/catch ...
// finally:
loadingProgress.stop();
progressSection.style.display = 'none';
syncGenerateButtonState();
```

With:
```javascript
try {
  await session.withProgress(async function (progressId) {
    // ... fetch and render logic ...
  });
} catch (error) {
  showError(error instanceof Error ? error.message : 'Failed to generate kernels');
}
```

### 3. Remove now-unused `loadingProgress` variable

The `createLoadingProgressController(progressContent)` call at line 31 is no longer needed.

### 4. Replace legacy heuristic form errors for kernels

While migrating `handleGenerate()`, remove the kernels page's dependency on `showFormError()`:

1. Add a page-owned inline error node to `src/server/views/pages/kernels.ejs`
2. Bind that node through `createInlineErrorController(...)`
3. Route generation validation/failure messages through the explicit page node instead of heuristic DOM lookup

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/12-kernels-controller.js` (modify)
- `src/server/views/pages/kernels.ejs` (modify)
- `public/js/app.js` (regenerate)
- relevant client/server-view tests for kernels error-node behavior (modify/add)

## Out of Scope

- Changes to kernels backend routes or API contracts
- Changes to `public/js/src/03-loading-progress.js`
- Changes to `public/js/src/03a-loading-overlay-session.js`
- Migrating any other controller
- Refactoring non-generation functions (`handleSaveGenerated`, `handleDelete`, `handleEditSave`, inline edit form logic)

## Acceptance Criteria

### Tests That Must Pass

1. Overlay (`progressSection`) becomes visible when generation starts
2. Overlay is hidden after successful generation
3. Overlay is hidden after generation failure
4. Generate button is disabled during generation
5. Generate button state is synced (via `syncGenerateButtonState`) after overlay hides
6. No direct `style.display` manipulation for loading overlay remains in `handleGenerate()`
7. No direct `loadingProgress.start()` / `.stop()` calls remain in the controller
8. Kernels generation errors no longer depend on `showFormError()` heuristics
9. Existing suite: `npm run test:client`

### Invariants

1. The kernels controller no longer calls `createLoadingProgressController()` directly
2. Generated kernel rendering and saved kernel CRUD behavior unchanged
3. `syncGenerateButtonState()` still fires after every generation attempt (success or failure)
4. Two-node overlay layout (progressSection wrapping progressContent) still works correctly
5. Page-level kernels generation errors are owned by an explicit kernels page node, not heuristic DOM lookup

## Test Plan

### New/Modified Tests

1. `test/unit/client/kernels-page/controller.test.ts` — update generation tests to assert overlay visibility and explicit inline error behavior
2. `test/unit/server/views/kernels.test.ts` — update to assert the dedicated kernels inline error node exists with alert semantics

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
