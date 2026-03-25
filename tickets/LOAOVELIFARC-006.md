# LOAOVELIFARC-006: Migrate character controllers + final cleanup grep

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001, LOAOVELIFARC-005

## Problem

Three character-related controllers still use the manual overlay protocol. After migrating them, a final grep confirms no page-level loading overlays are still toggled by raw `style.display` in generation flows, and dead helper code is removed.

Note: This is the ticket that closes the remaining session-helper migration debt identified in `specs/loading-overlay-lifecycle-architecture.md`. No additional ticket is needed unless the play page or a non-spec controller is later pulled into scope.

## Assumption Reassessment (2026-03-25)

### Character webs controller (`16-character-webs-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 58. Confirmed.
2. Multiple generation flows: at least three `loading.style.display = 'flex'` at lines 844, 986, 1070. Confirmed.
3. This is a large controller with multiple async operations — migration must be surgical.

### Characters controller (`17-characters-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 25. Confirmed.
2. `loading.style.display = 'flex'` at line 376. Confirmed.

### Character brainstormer controller (`19-character-brainstormer-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 32. Confirmed.

## Architecture Check

1. Same pattern swap as all other controllers.
2. Character webs controller has multiple flows — all should use one session instance.
3. Final cleanup grep ensures completeness.

## What to Change

### 1. Character webs controller (`16-character-webs-controller.js`)

Replace `createLoadingProgressController(loading)` with session helper. Wrap all generation flows (web generation, character generation, brainstorm) in `withProgress()` or `begin()`/`end()`.

### 2. Characters controller (`17-characters-controller.js`)

Replace direct overlay/polling code with session helper.

### 3. Character brainstormer controller (`19-character-brainstormer-controller.js`)

Replace direct overlay/polling code with session helper.

### 4. Final cleanup grep

After all migrations, grep across `public/js/src/` for:
- `createLoadingProgressController` — should only appear in `03-loading-progress.js` (definition) and `09-controllers.js` (play page, intentionally not migrated)
- `style.display = 'flex'` in generation/evolution flows — should only remain in non-loading contexts (modals, result sections) and the play page controller

Remove any dead local helper code, duplicate comments, or unused variables left behind by migrations.

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/16-character-webs-controller.js` (modify)
- `public/js/src/17-characters-controller.js` (modify)
- `public/js/src/19-character-brainstormer-controller.js` (modify)
- `public/js/app.js` (regenerate)

## Out of Scope

- Changes to `public/js/src/03-loading-progress.js` or `03a-loading-overlay-session.js`
- Backend route or API contract changes
- EJS template changes
- Migrating the play page controller (`09-controllers.js`) — it has a complex multi-flow structure and is not in scope per the spec
- Migrating the worldbuilding controller (`18-worldbuilding-controller.js`) — it is not listed in the spec's migration plan
- Refactoring non-generation code (character CRUD, web rendering, brainstorm rendering)

## Acceptance Criteria

### Tests That Must Pass

**Per migrated controller:**
1. Overlay becomes visible when generation starts
2. Overlay is hidden after successful completion
3. Overlay is hidden after failure
4. Action button is disabled during the operation
5. Button is re-enabled after completion

**Cleanup verification:**
6. `grep -r 'createLoadingProgressController' public/js/src/` returns only `03-loading-progress.js` (definition) and `09-controllers.js` (play page)
7. No page-level loading overlay in any migrated controller is toggled by raw `style.display = 'flex'/'none'` in a generation/evolution flow
8. No unused `loadingProgress` variables remain in migrated controllers
9. Existing suite: `npm run test:client`

### Invariants

1. None of the migrated controllers call `createLoadingProgressController()` directly
2. All character CRUD, rendering, and non-generation UI unchanged
3. Character webs controller's multiple generation flows all go through the session helper
4. The play page controller (`09-controllers.js`) is unmodified
5. `createLoadingProgressController` remains available as a low-level primitive for any future intentional direct usage

### Series Note

The final grep in this ticket should treat `18-worldbuilding-controller.js` separately from the migration debt because it is not part of the progress-polling/session-helper architecture targeted by this series.

## Test Plan

### New/Modified Tests

1. `test/unit/client/character-webs-page/controller.test.ts` — update for overlay visibility
2. New or updated tests for characters and character-brainstormer controllers if coverage exists

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
