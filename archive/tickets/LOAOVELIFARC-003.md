# LOAOVELIFARC-003: Migrate kernels-controller to session helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001, `archive/tickets/ERRDISPARCH-001.md`

## Problem

`public/js/src/12-kernels-controller.js` manually coordinates overlay visibility and progress polling in `handleGenerate()`. It is already `async`/`await` and uses `try`/`finally`, making it a clean migration candidate. The `syncGenerateButtonState()` call in `finally` should move to `onHide`.

Note: `LOAOVELIFARC-001` already migrated `content-packets`, so this ticket is now the first remaining controller-level migration in the series.

## Assumption Reassessment (2026-03-25)

1. `handleGenerate()` is already `async` with `try`/`catch`/`finally`, so this remains a low-risk migration target.
2. Kernels uses the two-node overlay layout that the session helper was designed to support: `#kernel-progress-section` wraps `#kernel-progress-content`.
3. Overlay visibility is still toggled manually inside `handleGenerate()` via `progressSection.style.display = 'flex'` / `'none'`.
4. Progress polling is still started and stopped manually via `loadingProgress.start(progressId)` / `loadingProgress.stop()`.
5. `generateBtn` is manually disabled before the request, but re-enable behavior is intentionally centralized in `syncGenerateButtonState()`. That means the session helper should disable the button on begin, then defer the final state restoration to `onHide: syncGenerateButtonState`.
6. `public/js/src/12-kernels-controller.js` still falls back to legacy `showFormError()` heuristics for page-level generation failures instead of binding an explicit page-owned error node.
7. `src/server/views/pages/kernels.ejs` does not currently render a dedicated inline error element for generation failures.
8. The current test surface already exists and is broader than the original ticket implied:
   - `test/unit/client/kernels-page/controller.test.ts` already covers generation lifecycle and currently asserts the legacy heuristic `.alert-error.form-error` path.
   - `test/unit/server/views/kernels.test.ts` currently only checks that the page contains the main form/result containers.
   - `test/unit/client/fixtures/html-fixtures.ts` defines `buildKernelsPageHtml()` and must be kept in sync with the EJS structure for controller tests.

## Architecture Check

1. Replacing the controller-local show/start/stop/hide sequence with `createLoadingOverlaySession()` is more beneficial than the current architecture because it removes repeated lifecycle protocol from page code and makes the correct cleanup path the default.
2. `syncGenerateButtonState()` wired through `onHide` is architecturally cleaner than manually forcing `generateBtn.disabled = false`, because the final button state still depends on form validity and seed presence.
3. This ticket should also finish page-level error ownership for kernels while touching the same flow. A dedicated `#kernel-generation-error` node plus `createInlineErrorController(...)` is cleaner, more robust, and more extensible than keeping `showFormError()` heuristic DOM lookup on a page with a well-defined generation section.
4. No backwards-compatibility aliases. The kernels page should directly adopt the cleaner architecture and tests should move with it.
5. Scope should stay narrow: migrate the generation lifecycle and error ownership without rewriting unrelated saved-kernel CRUD or inline-edit behavior.

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
4. Update `test/unit/client/fixtures/html-fixtures.ts` so the client characterization tests exercise the same error-node contract as the real template

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/12-kernels-controller.js` (modify)
- `src/server/views/pages/kernels.ejs` (modify)
- `test/unit/client/fixtures/html-fixtures.ts` (modify)
- `public/js/app.js` (regenerate)
- `test/unit/client/kernels-page/controller.test.ts` (modify/add)
- `test/unit/server/views/kernels.test.ts` (modify)

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

1. `test/unit/client/kernels-page/controller.test.ts` — update generation tests to assert overlay visibility, button resync via the session lifecycle, and explicit inline error behavior through the kernels-owned error node
2. `test/unit/server/views/kernels.test.ts` — update to assert the dedicated kernels inline error node exists with alert semantics
3. `test/unit/client/fixtures/html-fixtures.ts` — update the kernels fixture so client tests match the view contract they characterize

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- **Completion Date**: 2026-03-25
- **What Changed**: Migrated kernels generation from controller-local overlay/polling orchestration to `createLoadingOverlaySession(...)`, added an explicit `#kernel-generation-error` node owned by the kernels page, routed kernels errors through `createInlineErrorController(...)`, updated the kernels HTML fixture to match the real template, regenerated `public/js/app.js`, and strengthened kernels client/view tests around overlay lifecycle and explicit error ownership.
- **Deviation From Original Plan**: The reassessment showed the main client characterization tests already existed, so the work updated the existing kernels controller test file and shared HTML fixture rather than creating separate new test surfaces. The explicit inline error controller was applied as the page-owned error path instead of preserving any fallback to `showFormError()`.
- **Verification Results**: `npm run test:client`, `npm run lint`, and `npm test` all passed.
