# LOAOVELIFARC-005: Migrate Phase 2 controllers (briefing, concepts, evolution, kernel-evolution, concept-seeds)

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001

## Problem

Five more controllers duplicate the manual overlay visibility + progress polling protocol. They should adopt the session helper for consistency and to prevent the bug class identified in the spec.

Note: This ticket already owns the remaining non-character controller migrations after `LOAOVELIFARC-003` and `LOAOVELIFARC-004`. No separate ticket is needed for those pages.

## Assumption Reassessment (2026-03-25)

### Briefing controller (`10-briefing-controller.js`)
1. Single-node overlay: `loading` element. `loadingProgress = createLoadingProgressController(loading)`. Confirmed at line 19.
2. Shares `loading` and `loadingProgress` with `createSceneIdeationController`. This controller is more complex — the ideation controller also uses these references. Migration must preserve the ideation controller's access or migrate it too.

### Concepts controller (`11-concepts-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 24.
2. Multiple generation flows: concept generation (line 135), evolution (line 464), and concept edit (line 550). All three toggle `loading.style.display = 'flex'`. Confirmed.

### Evolution controller (`13-evolution-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 34.
2. `loading.style.display = 'flex'` at line 272. Confirmed.

### Kernel evolution controller (`14-kernel-evolution-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 25.
2. `loading.style.display = 'flex'` at line 176. Confirmed.

### Concept seeds controller (`15-concept-seeds-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 22.
2. `loading.style.display = 'flex'` at line 216. Confirmed.

## Architecture Check

1. All five controllers follow the same pattern as Phase 1 controllers. Direct swap to session helper.
2. The briefing controller's shared `loading`/`loadingProgress` with ideation controller requires care — the session helper should replace the direct references, and the ideation controller should either receive the session object or be migrated to use it. If the ideation controller's complexity is too high, it can be deferred.
3. Concepts controller has three separate generation flows — all three should use the same session instance.

## What to Change

### 1. Briefing controller (`10-briefing-controller.js`)

Replace `createLoadingProgressController(loading)` with session helper. Note: if `createSceneIdeationController` also uses `loading` and `loadingProgress`, either pass the session object to it or keep a minimal compatibility bridge. Evaluate at implementation time.

### 2. Concepts controller (`11-concepts-controller.js`)

Create one session helper instance and use `withProgress()` in all three generation flows (generate, evolve, concept edit that shows loading).

### 3. Evolution controller (`13-evolution-controller.js`)

Replace direct overlay/polling code with session helper.

### 4. Kernel evolution controller (`14-kernel-evolution-controller.js`)

Replace direct overlay/polling code with session helper.

### 5. Concept seeds controller (`15-concept-seeds-controller.js`)

Replace direct overlay/polling code with session helper.

### 6. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/10-briefing-controller.js` (modify)
- `public/js/src/11-concepts-controller.js` (modify)
- `public/js/src/13-evolution-controller.js` (modify)
- `public/js/src/14-kernel-evolution-controller.js` (modify)
- `public/js/src/15-concept-seeds-controller.js` (modify)
- `public/js/app.js` (regenerate)

## Out of Scope

- Changes to `public/js/src/03-loading-progress.js` or `03a-loading-overlay-session.js`
- Backend route or API contract changes for any of these pages
- EJS template changes
- Refactoring non-generation code (concept CRUD, seed CRUD, saved item rendering)
- The play page controller (`09-controllers.js`) — it has a more complex multi-flow pattern and is not listed in the spec's migration plan
- Phase 2 character controllers (LOAOVELIFARC-006)

## Acceptance Criteria

### Tests That Must Pass

**Per migrated controller:**
1. Overlay becomes visible when generation/evolution starts
2. Overlay is hidden after successful completion
3. Overlay is hidden after failure
4. Generate/action button is disabled during the operation
5. Button is re-enabled after completion

**All controllers:**
6. No direct `style.display = 'flex'/'none'` for loading overlays in generation flows
7. No direct `loadingProgress.start()` / `.stop()` calls remain in migrated controllers
8. Existing suite: `npm run test:client`

### Invariants

1. None of the migrated controllers call `createLoadingProgressController()` directly
2. All non-generation UI behavior (modals, CRUD, rendering) unchanged
3. Briefing page's scene ideation flow still works (whether migrated or kept via compatibility bridge)
4. Concepts controller's three generation flows all go through the session helper

## Test Plan

### New/Modified Tests

1. `test/unit/client/evolution-page/controller.test.ts` — update for overlay visibility
2. `test/unit/client/concepts-page/form-validation.test.ts` — update if generation flow is covered
3. `test/unit/client/briefing-page/begin-adventure.test.ts` — update for overlay visibility
4. New tests for kernel-evolution and concept-seeds controllers if not already covered

### Series Note

`18-worldbuilding-controller.js` is intentionally not part of this ticket because it shows/hides a loading element but does not participate in the shared progress-polling lifecycle targeted by the loading-overlay architecture spec.

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
