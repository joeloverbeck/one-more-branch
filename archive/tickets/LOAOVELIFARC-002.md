# LOAOVELIFARC-002: Standardize content-packets inline generation errors

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001

## Problem

`public/js/src/11-content-packets.js` was the controller that triggered the `CONPACCLEAN-002` bug class. `LOAOVELIFARC-001` already migrated it to `async`/`await` and adopted the session helper, so the remaining debt is narrower: generation errors still use `alert()` instead of the inline error pattern used by newer pages.

## Assumption Reassessment (2026-03-25)

1. `handleContentGenerate()` is already `async`/`await` and already routes generation lifecycle through `createLoadingOverlaySession()`. Confirmed.
2. Overlay element is `progressEl` (`content-generation-progress`), and it serves as both overlay and progress text container (single-node layout). Confirmed, consistent with [specs/loading-overlay-lifecycle-architecture.md](/home/joeloverbeck/projects/one-more-branch/specs/loading-overlay-lifecycle-architecture.md).
3. Button management is already handled by the loading overlay session helper via `buttonElement`. Confirmed.
4. Error display still uses `alert()` for generation and validation errors. Confirmed.
5. There is currently no dedicated inline error container or `showError()` / `hideError()` helper in the content-packets page. Confirmed.
6. Because the page currently lacks an inline error node, replacing generation-path `alert()` calls requires a small template change in `src/server/views/pages/content-packets.ejs` and matching test fixture updates. Corrected.
7. `LOAOVELIFARC-001` already delivered the overlay/progress lifecycle migration, so this ticket must not re-specify that work. Corrected scope.

## Architecture Check

1. The remaining beneficial change is inline error display, not more lifecycle refactoring. Re-specifying already-delivered session-helper work would create ticket drift.
2. Replacing `alert()` with inline error display follows the pattern already used by Kernels, Evolution, and Create Story controllers.
3. Defensive JSON parsing is still beneficial because it prevents a secondary parse failure from masking the actual generation failure.
4. No backwards-compatibility shims.

## What to Change

### 1. Replace `alert()` with inline error display

Add a visible error element in the page template and use a `showError(msg)` / `hideError()` pattern for the generation error path. The validation `alert()` calls (empty API key, empty exemplars) should also be replaced with inline error display.

### 2. Adopt defensive JSON parsing

Use the `try { data = await response.json(); } catch (_) { data = null; }` pattern already standard in other controllers.

### 3. Preserve the already-delivered session-helper lifecycle

Do not reintroduce direct overlay/progress manipulation. The controller should continue using the session helper from `LOAOVELIFARC-001`.

### 4. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/11-content-packets.js` (modify)
- `src/server/views/pages/content-packets.ejs` (modify to add inline generation error container)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)
- `public/js/app.js` (regenerate)

## Out of Scope

- Changes to the content-packets backend routes or API contracts
- Changes to `public/js/src/03-loading-progress.js`
- Changes to `public/js/src/03a-loading-overlay-session.js`
- Migrating any other controller
- Any additional overlay/progress lifecycle refactor in `content-packets` beyond preserving the existing session-helper usage
- Refactoring non-generation functions (`handleSaveGenerated`, `handlePinPacket`, `handleDeletePacket`)
- Replacing `alert()` usage outside the generation flow

## Acceptance Criteria

### Tests That Must Pass

1. No `alert()` calls remain in the generation flow
2. Validation and generation errors display inline in the page
3. Defensive JSON parsing handles non-JSON error responses
4. The controller continues using the session helper for overlay visibility, polling, and button cleanup
5. The page template exposes an inline error node for the generation flow
6. Existing suite: `npm run test:client`

### Invariants

1. The content-packets controller continues to avoid direct `createLoadingProgressController()` usage
2. The content-packets controller continues to avoid direct `progressEl.style.display` management for the generation lifecycle
3. Non-generation functions (`handleSaveGenerated`, `handlePinPacket`, `handleDeletePacket`) remain unchanged
4. Rendered packet content and save/pin/delete behavior unchanged
5. Loading overlay markup remains single-node for the session helper contract

## Test Plan

### New/Modified Tests

1. `test/unit/client/content-packets-page/controller.test.ts` — update existing tests for inline error rendering and defensive JSON parsing while preserving current lifecycle assertions
2. `src/server/views/pages/content-packets.ejs` server-view coverage should continue to render without requiring controller-specific server test changes, because the inline error node is a static template addition

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- **Completion date**: 2026-03-25
- **What changed**:
  - Added a dedicated inline generation error container to `content-packets.ejs`
  - Replaced generation-flow `alert()` usage in `public/js/src/11-content-packets.js` with `showError()` / `hideError()`
  - Added defensive JSON parsing for the generation request so non-JSON failures surface a stable inline error
  - Regenerated `public/js/app.js`
  - Strengthened client/server-view tests for inline validation, API failures, fetch failures, non-JSON responses, and template coverage
- **Deviation from original plan**:
  - The ticket originally understated the required file scope. Implementing inline errors cleanly required a template change and server-view test update in addition to the controller and generated bundle.
  - No broader loading-overlay refactor was needed or justified because `LOAOVELIFARC-001` had already delivered the session-helper architecture.
- **Verification results**:
  - `npm run test:unit -- test/unit/client/content-packets-page/controller.test.ts test/unit/server/views/content-packets.test.ts --coverage=false`
  - `npm run test:client`
  - `npm run lint`
  - `npm test`
