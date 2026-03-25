# ERRDISPARCH-001: Standardize page-level inline error controllers

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `public/js/src/07-error-display.js`, `tickets/LOAOVELIFARC-003.md`, `tickets/LOAOVELIFARC-004.md`, `tickets/LOAOVELIFARC-005.md`, `tickets/LOAOVELIFARC-006.md`

## Problem

Page-level inline error handling is currently split across three patterns:

1. Controllers with dedicated local helpers bound to page-specific error nodes (`09c-create-story-controller.js`, `11-content-packets.js`, `19-character-brainstormer-controller.js`)
2. Controllers that call `showFormError()` with an `alert()` fallback (`11-concepts-controller.js`, `12-kernels-controller.js`, `13-evolution-controller.js`, `14-kernel-evolution-controller.js`, `15-concept-seeds-controller.js`)
3. Global heuristic DOM insertion in `public/js/src/07-error-display.js`

That architecture is inconsistent and brittle. Controllers keep re-implementing `showError()` / `hideError()` logic, while `showFormError()` relies on broad DOM queries and special cases instead of explicit page ownership. The result is duplicated controller code, mixed error markup conventions, and a weaker contract for future page work.

## Assumption Reassessment (2026-03-25)

1. `public/js/src/07-error-display.js` currently exposes `showPlayError()`, `clearPlayError()`, and `showFormError()`, but there is no shared explicit helper for page-scoped inline error nodes. Confirmed.
2. `showFormError()` currently finds or creates an error node through heuristics (`.alert-error.form-error`, `.form-section .alert-error:not(.play-error):not(.briefing-error)`, `.story-form`, `#seed-generate-section`, `#concept-develop-section`). Confirmed.
3. Several controllers duplicate the same local pattern of `showError()` / `hideError()` around a dedicated error element instead of sharing a common helper. Confirmed in `09c-create-story-controller.js`, `11-content-packets.js`, and `19-character-brainstormer-controller.js`.
4. Several other controllers still use `showFormError()` with `alert()` fallback, which means page error behavior depends on global DOM shape rather than an explicit page contract. Confirmed in `11-concepts-controller.js`, `12-kernels-controller.js`, `13-evolution-controller.js`, `14-kernel-evolution-controller.js`, and `15-concept-seeds-controller.js`.
5. The active `LOAOVELIFARC-003` through `LOAOVELIFARC-006` tickets do not currently own this work. They are scoped to loading overlay lifecycle migration and explicitly exclude helper/template refactors. Confirmed.
6. `11-content-packets.js` still contains a defensive `alert()` fallback inside its new local `showError()` helper if the error node is missing. That fallback is useful today as a last resort, but the cleaner target architecture is explicit page-owned inline error nodes with no heuristic or alert fallback in normal flows. Confirmed.

## Architecture Check

1. A shared page-level inline error controller is cleaner than continuing to duplicate `showError()` / `hideError()` closures in each page controller.
2. An explicit helper bound to a concrete error element is cleaner than `showFormError()` heuristics because ownership becomes local, testable, and independent of incidental DOM structure.
3. This should remain separate from the loading-overlay migration series. Overlay lifecycle and inline error ownership are adjacent concerns, but they are not the same abstraction.
4. No backwards-compatibility aliases or long-term dual APIs. The end state should be one explicit page-level pattern for inline errors and the play-page-specific helper for play remains separate.

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

### 3. Migrate controllers that currently depend on `showFormError()`

For controllers currently using `showFormError()` plus fallback behavior:

- `public/js/src/11-concepts-controller.js`
- `public/js/src/12-kernels-controller.js`
- `public/js/src/13-evolution-controller.js`
- `public/js/src/14-kernel-evolution-controller.js`
- `public/js/src/15-concept-seeds-controller.js`

Add explicit page-owned inline error nodes if missing, then bind them through the shared helper. Remove controller-local fallback-to-`alert()` behavior in these page-level flows.

### 4. Narrow or remove heuristic `showFormError()` usage

After the migrated pages use explicit inline error nodes, reduce `showFormError()` to one of these end states:

1. remove it if no longer needed, or
2. keep it only for legacy pages still intentionally using heuristic insertion, with a documented narrow scope

The preferred end state is explicit ownership, not broader heuristics.

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/07-error-display.js` (modify)
- `public/js/src/09c-create-story-controller.js` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `public/js/src/11-concepts-controller.js` (modify)
- `public/js/src/12-kernels-controller.js` (modify)
- `public/js/src/13-evolution-controller.js` (modify)
- `public/js/src/14-kernel-evolution-controller.js` (modify)
- `public/js/src/15-concept-seeds-controller.js` (modify)
- `public/js/src/19-character-brainstormer-controller.js` (modify)
- relevant page templates that currently lack explicit inline error nodes (modify only where needed)
- `public/js/app.js` (regenerate)

## Out of Scope

- Play-page error rendering (`showPlayError()` / `clearPlayError()`), unless a later reassessment proves unification is clearly cleaner
- Backend route/API contract changes
- Loading overlay lifecycle refactors owned by `LOAOVELIFARC-*`
- Save/delete/pin alert flows outside page-level generation and validation unless separately ticketed
- Worldbuilding or other non-ticketed page refactors unless reassessment shows they already depend on `showFormError()` and can be migrated surgically in the same pass

## Acceptance Criteria

### Tests That Must Pass

1. Migrated pages use a shared explicit inline error helper instead of controller-local duplicated `showError()` / `hideError()` closures
2. Migrated page-level generation/validation flows no longer depend on heuristic `showFormError()` lookup behavior
3. Migrated page-level generation/validation flows do not fall back to `alert()` in normal operation
4. Pages with explicit inline error nodes clear old errors before a new successful operation path where appropriate
5. Existing suite: `npm run test:client`

### Invariants

1. Page-level inline errors are owned by explicit page nodes, not incidental DOM structure
2. The shared helper does not query for fallback targets or mutate unrelated page regions
3. Play-page error handling remains isolated unless intentionally redesigned later
4. Loading overlay session behavior remains unchanged

## Test Plan

### New/Modified Tests

1. `test/unit/client/content-packets-page/controller.test.ts` — verify the shared helper preserves current inline validation and generation error behavior without alert fallback in normal paths
2. Existing client tests for create-story, kernels, evolution, concept-seeds, and character-brainstormer controllers — update to assert explicit inline error behavior via page-owned error nodes
3. Server-view tests for any page template that gains an inline error node — verify the node exists with the expected role/visibility defaults
4. New unit tests for `public/js/src/07-error-display.js` — verify the shared inline error controller shows and clears a provided node without heuristic DOM lookup

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
