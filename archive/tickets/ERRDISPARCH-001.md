# ERRDISPARCH-001: Standardize page-level inline error controllers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `public/js/src/07-error-display.js`, `specs/loading-overlay-lifecycle-architecture.md`

## Problem

Page-level inline error handling is currently split across three patterns:

1. Controllers with dedicated local helpers bound to page-specific error nodes (`09c-create-story-controller.js`, `11-content-packets.js`, `19-character-brainstormer-controller.js`)
2. Controllers that call `showFormError()` against a legacy heuristic DOM contract (`11-concepts-controller.js`, `12-kernels-controller.js`, `13-evolution-controller.js`, `14-kernel-evolution-controller.js`, `15-concept-seeds-controller.js`)
3. Global heuristic DOM insertion in `public/js/src/07-error-display.js`

That architecture is inconsistent and brittle. Controllers keep re-implementing `showError()` / `hideError()` logic, while `showFormError()` relies on broad DOM queries and special cases instead of explicit page ownership. The result is duplicated controller code, mixed error markup conventions, and a weaker contract for future page work.

## Assumption Reassessment (2026-03-25)

1. `public/js/src/07-error-display.js` currently exposes `showPlayError()`, `clearPlayError()`, and `showFormError()`, but there is no shared explicit helper for page-scoped inline error nodes. Confirmed.
2. `showFormError()` currently finds or creates an error node through heuristics (`.alert-error.form-error`, `.form-section .alert-error:not(.play-error):not(.briefing-error)`, `.story-form`, `#seed-generate-section`, `#concept-develop-section`). Confirmed.
3. Several controllers duplicate the same local pattern of `showError()` / `hideError()` around a dedicated error element instead of sharing a common helper. Confirmed in `09c-create-story-controller.js`, `11-content-packets.js`, and `19-character-brainstormer-controller.js`.
4. Several other controllers still use `showFormError()`, which means page error behavior depends on global DOM shape rather than an explicit page contract. Confirmed in `11-concepts-controller.js`, `12-kernels-controller.js`, `13-evolution-controller.js`, `14-kernel-evolution-controller.js`, and `15-concept-seeds-controller.js`.
5. Those `showFormError()` pages do not currently expose page-owned inline error nodes in their templates, so migrating them would require coordinated template changes plus broader controller and view test expansion. Confirmed in `src/server/views/pages/concepts.ejs`, `kernels.ejs`, `evolution.ejs`, `kernel-evolution.ejs`, and `concept-seeds.ejs`.
6. By contrast, `09c-create-story-controller.js`, `11-content-packets.js`, and `19-character-brainstormer-controller.js` already own dedicated inline error elements in their page templates. Confirmed.
7. `src/server/views/pages/create-story.ejs` exposes `#create-story-error`, but it currently lacks the alert semantics already present on the content-packets and character-brainstormer pages. Confirmed.
8. `specs/loading-overlay-lifecycle-architecture.md` references error-display standardization as adjacent cleanup, but it does not own this refactor and does not justify expanding this ticket into a full multi-page template migration. Confirmed.

## Architecture Check

1. A shared page-level inline error controller is cleaner than continuing to duplicate `showError()` / `hideError()` closures in controllers that already own explicit inline error nodes.
2. An explicit helper bound to a concrete error element is cleaner than `showFormError()` heuristics because ownership becomes local, testable, and independent of incidental DOM structure.
3. This should remain separate from the loading-overlay migration series. Overlay lifecycle and inline error ownership are adjacent concerns, but they are not the same abstraction.
4. The cleanest architecture for this ticket is a narrow first wave: standardize the explicit-node pages now, and leave the legacy `showFormError()` pages for a dedicated follow-up that can migrate templates and tests intentionally.
5. No backwards-compatibility aliases inside the new helper. The end state for this ticket is one explicit page-level pattern for explicit-node pages, while `showFormError()` remains only for the still-legacy pages not migrated here.

## What to Change

### 1. Add an explicit shared helper for page-level inline errors

In `public/js/src/07-error-display.js`, add a shared helper with an explicit contract, for example:

```javascript
function createInlineErrorController(errorElement) {
  return {
    show: function show(message) {},
    clear: function clear() {},
  };
}
```

Rules:

1. `errorElement` is required and must be the page-owned inline error node.
2. `show(message)` sets text content and shows the node.
3. `clear()` empties text content and hides the node.
4. No DOM-query heuristics inside this helper.
5. No alias names.

### 2. Migrate controllers that already have dedicated error nodes

Replace local duplicated `showError()` / `hideError()` logic with the shared helper in:

- `public/js/src/09c-create-story-controller.js`
- `public/js/src/11-content-packets.js`
- `public/js/src/19-character-brainstormer-controller.js`

This is the lowest-risk first wave because these pages already own explicit inline error elements.

### 3. Normalize explicit-node markup where needed

Bring the explicit error nodes used by migrated pages up to the same contract:

- `role="alert"`
- `aria-live="polite"` where missing
- hidden by default

`create-story.ejs` currently needs this normalization.

### 4. Do not expand this ticket into a legacy-page migration

Do not migrate the legacy `showFormError()` pages in this ticket:

- `public/js/src/11-concepts-controller.js`
- `public/js/src/12-kernels-controller.js`
- `public/js/src/13-evolution-controller.js`
- `public/js/src/14-kernel-evolution-controller.js`
- `public/js/src/15-concept-seeds-controller.js`

Reason:

1. They still depend on template-level heuristic insertion points.
2. Migrating them cleanly requires additional page markup work and broader client/server-view coverage.
3. That is better handled as a dedicated follow-up ticket instead of being bundled into this bugfix/refinement pass.

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/07-error-display.js` (modify)
- `public/js/src/09c-create-story-controller.js` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `public/js/src/19-character-brainstormer-controller.js` (modify)
- `src/server/views/pages/create-story.ejs` (modify)
- `public/js/app.js` (regenerate)
- relevant client/server-view tests for the migrated pages and shared helper (modify/add)

## Out of Scope

- Play-page error rendering (`showPlayError()` / `clearPlayError()`), unless a later reassessment proves unification is clearly cleaner
- Backend route/API contract changes
- Loading overlay lifecycle refactors owned by `LOAOVELIFARC-*`
- Save/delete/pin alert flows outside page-level generation and validation unless separately ticketed
- Migrating legacy `showFormError()` pages to explicit page-owned error nodes
- Removing `showFormError()` entirely

## Acceptance Criteria

### Tests That Must Pass

1. Migrated pages use a shared explicit inline error helper instead of controller-local duplicated `showError()` / `hideError()` closures
2. The migrated controllers are `09c-create-story-controller.js`, `11-content-packets.js`, and `19-character-brainstormer-controller.js`
3. Migrated page-level generation/validation flows do not fall back to `alert()` in normal operation
4. Pages with explicit inline error nodes clear old errors before a new successful operation path where appropriate
5. Existing suite: `npm run test:client`

### Invariants

1. Migrated page-level inline errors are owned by explicit page nodes, not incidental DOM structure
2. The shared helper does not query for fallback targets or mutate unrelated page regions
3. `showFormError()` behavior for non-migrated legacy pages remains unchanged in this ticket
4. Play-page error handling remains isolated unless intentionally redesigned later
5. Loading overlay session behavior remains unchanged

## Test Plan

### New/Modified Tests

1. `test/unit/client/content-packets-page/controller.test.ts` — verify the shared helper preserves current inline validation and generation error behavior without alert fallback in normal paths
2. New client tests for create-story and character-brainstormer controllers — verify explicit inline error behavior via page-owned error nodes
3. Server-view or fixture-backed tests for `create-story` markup — verify the explicit error node exposes the expected alert semantics
4. New unit tests for `public/js/src/07-error-display.js` — verify the shared inline error controller shows and clears a provided node without heuristic DOM lookup

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- Completion date: 2026-03-25
- What actually changed:
  - Added `createInlineErrorController(errorElement)` to `public/js/src/07-error-display.js`
  - Migrated the explicit-node pages only: `09c-create-story-controller.js`, `11-content-packets.js`, and `19-character-brainstormer-controller.js`
  - Normalized `create-story.ejs` so its inline error node is a proper alert element with `role="alert"` and `aria-live="polite"`
  - Added focused tests for the shared helper, create-story controller behavior, character-brainstormer controller behavior, and create-story server-view markup
- Deviations from the original plan:
  - Did not migrate the legacy `showFormError()` pages in this pass
  - Did not narrow or remove `showFormError()` yet because those pages still rely on a separate heuristic template contract and need a dedicated follow-up migration
- Verification results:
  - `npm run test:client` passed
  - `npm run lint` passed
  - `npm test` passed
