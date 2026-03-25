# LOAOVELIFARC-005: Migrate Phase 2 controllers (briefing, concepts, evolution, kernel-evolution, concept-seeds)

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001, `archive/tickets/ERRDISPARCH-001.md`

## Problem

Four page controllers plus the shared briefing ideation helper still duplicate the manual overlay visibility + progress polling protocol. They should adopt the session helper for consistency and to prevent the bug class identified in the spec.

Note: This ticket already owns the remaining non-character controller migrations after `LOAOVELIFARC-003` and `LOAOVELIFARC-004`. No separate ticket is needed for those pages.

## Assumption Reassessment (2026-03-25)

### Briefing controller (`10-briefing-controller.js`)
1. Single-node overlay: `loading` element. `loadingProgress = createLoadingProgressController(loading)`. Confirmed at line 19.
2. Shares loading lifecycle ownership with `createSceneIdeationController`, but `10-briefing-controller.js` currently handles the overlay toggles while `13-scene-ideation-controller.js` only performs the fetch. The current split is fragile because briefing owns the progress controller and the ideation helper relies on callers to coordinate visibility/polling around its requests.
3. Clean architecture for briefing is not a compatibility bridge. The shared ideation fetch path should accept a loading-session-owned `progressId` from briefing, and briefing should own the full loading lifecycle through one session instance.

### Concepts controller (`11-concepts-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 24.
2. Two progress-backed flows use the full manual protocol: concept development (line 135) and concept hardening (line 464). Confirmed.
3. The concept edit fetch (line 550) shows/hides the same overlay but does not create a `progressId` or start `loadingProgress`. It is not part of the progress-polling architecture targeted by this ticket and should not be forced into the session helper without a broader UX decision.
4. Still reports page-level errors through legacy `showFormError()`. Confirmed.
5. `src/server/views/pages/concepts.ejs` does not currently expose a dedicated inline error node for page-level generation failures. Confirmed.

### Evolution controller (`13-evolution-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 34.
2. `loading.style.display = 'flex'` at line 272. Confirmed.
3. Still reports page-level errors through legacy `showFormError()`. Confirmed.
4. `src/server/views/pages/evolution.ejs` does not currently expose a dedicated inline error node. Confirmed.

### Kernel evolution controller (`14-kernel-evolution-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 25.
2. `loading.style.display = 'flex'` at line 176. Confirmed.
3. Still reports page-level errors through legacy `showFormError()`. Confirmed.
4. `src/server/views/pages/kernel-evolution.ejs` does not currently expose a dedicated inline error node. Confirmed.

### Concept seeds controller (`15-concept-seeds-controller.js`)
1. Single-node overlay: `loading`. Confirmed at line 22.
2. `loading.style.display = 'flex'` at line 216. Confirmed.
3. Still reports page-level errors through legacy `showFormError()`. Confirmed.
4. `src/server/views/pages/concept-seeds.ejs` does not currently expose a dedicated inline error node. Confirmed.

## Architecture Check

1. The actual progress-backed migration targets in this ticket are briefing begin-adventure, briefing scene ideation, concepts develop, concepts harden, evolution evolve, kernel-evolution evolve, and concept-seeds generate.
2. The briefing controller's shared lifecycle with `13-scene-ideation-controller.js` should not be handled with a compatibility bridge. The robust architecture is one loading session owned by briefing, with the ideation fetch accepting a caller-provided `progressId`.
3. Concepts controller should use one session instance for its two progress-backed flows only. The concept edit modal fetch is a separate concern and should remain outside this ticket unless the page later gets a distinct non-progress loading pattern.
4. For `concepts`, `evolution`, `kernel-evolution`, and `concept-seeds`, the cleaner long-term architecture is to finish the inline error migration in the same pass: add explicit page-owned error nodes and bind them through `createInlineErrorController(...)` instead of leaving those pages on `showFormError()` heuristics.
5. Existing test coverage is uneven. Briefing and evolution already have dedicated client tests. Concepts has only validation/renderer tests, and kernel-evolution/concept-seeds currently have no dedicated client controller tests or server-view tests. The ticket must own adding the missing coverage instead of assuming it already exists.

## What to Change

### 1. Briefing controller (`10-briefing-controller.js`)

Replace `createLoadingProgressController(loading)` with the session helper. Update the briefing/scene-ideation boundary so briefing owns the loading session and passes `progressId` into ideation fetches. Do not keep a compatibility bridge around raw `loading` / `loadingProgress`.

### 2. Concepts controller (`11-concepts-controller.js`)

Create one session helper instance and use `withProgress()` in the two progress-backed flows: develop concept and harden concept. Leave the concept edit fetch out of scope for this ticket.

### 3. Evolution controller (`13-evolution-controller.js`)

Replace direct overlay/polling code with session helper.

### 4. Kernel evolution controller (`14-kernel-evolution-controller.js`)

Replace direct overlay/polling code with session helper.

### 5. Concept seeds controller (`15-concept-seeds-controller.js`)

Replace direct overlay/polling code with session helper.

### 6. Finish explicit inline error ownership for legacy Phase 2 pages

For the non-briefing Phase 2 pages that still use `showFormError()`:

1. Add explicit page-owned inline error nodes to:
   - `src/server/views/pages/concepts.ejs`
   - `src/server/views/pages/evolution.ejs`
   - `src/server/views/pages/kernel-evolution.ejs`
   - `src/server/views/pages/concept-seeds.ejs`
2. Bind those nodes through `createInlineErrorController(...)`
3. Remove page-level generation/evolution reliance on `showFormError()` in:
   - `public/js/src/11-concepts-controller.js`
   - `public/js/src/13-evolution-controller.js`
   - `public/js/src/14-kernel-evolution-controller.js`
   - `public/js/src/15-concept-seeds-controller.js`

### 7. Add missing controller/view coverage where none currently exists

Add dedicated tests for kernel-evolution and concept-seeds client controllers and server views. Strengthen concepts coverage beyond form validation so generation/hardening and inline error ownership are asserted explicitly.

### 8. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/10-briefing-controller.js` (modify)
- `public/js/src/13-scene-ideation-controller.js` (modify)
- `public/js/src/11-concepts-controller.js` (modify)
- `public/js/src/13-evolution-controller.js` (modify)
- `public/js/src/14-kernel-evolution-controller.js` (modify)
- `public/js/src/15-concept-seeds-controller.js` (modify)
- `src/server/views/pages/concepts.ejs` (modify)
- `src/server/views/pages/evolution.ejs` (modify)
- `src/server/views/pages/kernel-evolution.ejs` (modify)
- `src/server/views/pages/concept-seeds.ejs` (modify)
- `public/js/app.js` (regenerate)
- relevant client/server-view tests for explicit inline error nodes on migrated pages (modify/add)
- new client/server-view tests for `kernel-evolution` and `concept-seeds` (add)

## Out of Scope

- Changes to `public/js/src/03-loading-progress.js` or `03a-loading-overlay-session.js`
- Backend route or API contract changes for any of these pages
- Refactoring non-generation code (concept CRUD, seed CRUD, saved item rendering)
- Refactoring the concept edit modal fetch into a distinct non-progress loading pattern
- The play page controller (`09-controllers.js`) — it has a more complex multi-flow pattern and is not listed in the spec's migration plan
- Phase 2 character controllers (LOAOVELIFARC-006)

## Acceptance Criteria

### Tests That Must Pass

**Per migrated controller:**
1. Overlay becomes visible when the progress-backed operation starts
2. Overlay is hidden after successful completion
3. Overlay is hidden after failure
4. Generate/action button is disabled during the operation
5. Button is re-enabled after completion

**All controllers:**
6. No direct `style.display = 'flex'/'none'` for loading overlays in generation flows
7. No direct `loadingProgress.start()` / `.stop()` calls remain in migrated controllers
8. Concepts, evolution, kernel-evolution, and concept-seeds no longer depend on `showFormError()` heuristics for page-level generation/evolution errors
9. Existing suite: `npm run test:client`

### Invariants

1. None of the migrated controllers call `createLoadingProgressController()` directly
2. All non-generation UI behavior (modals, CRUD, rendering) unchanged
3. Briefing page's scene ideation flow still works (whether migrated or kept via compatibility bridge)
4. Concepts controller's develop and harden flows go through the session helper
5. Migrated page-level errors are owned by explicit page nodes, not incidental DOM structure

## Test Plan

### New/Modified Tests

1. `test/unit/client/evolution-page/controller.test.ts` — update for overlay visibility and explicit inline error behavior
2. `test/unit/client/concepts-page/form-validation.test.ts` plus a dedicated concepts controller test — cover session-backed develop/harden flows and the explicit inline error node for generation failures
3. `test/unit/client/briefing-page/begin-adventure.test.ts` — update for overlay visibility
4. New `kernel-evolution` controller tests — cover overlay lifecycle, button disable/enable, and explicit inline error behavior
5. New `concept-seeds` controller tests — cover overlay lifecycle, button disable/enable, and explicit inline error behavior
6. Relevant server-view tests for concepts, evolution, kernel-evolution, and concept-seeds — assert dedicated inline error nodes exist with alert semantics

### Series Note

`18-worldbuilding-controller.js` is intentionally not part of this ticket because it shows/hides a loading element but does not participate in the shared progress-polling lifecycle targeted by the loading-overlay architecture spec.

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- Completion date: 2026-03-25
- Actual changes:
  - Migrated briefing begin-adventure, briefing scene ideation, concepts develop/harden, evolution evolve, kernel-evolution evolve, and concept-seeds generate to `createLoadingOverlaySession(...)`
  - Simplified the briefing boundary by removing raw loading/progress dependencies from `13-scene-ideation-controller.js`; briefing now owns the loading session and passes `progressId` into ideation fetches
  - Added explicit page-owned inline error nodes and `createInlineErrorController(...)` bindings for concepts, evolution, kernel-evolution, and concept-seeds
  - Added missing client controller coverage for concepts, kernel-evolution, and concept-seeds, plus new/updated server-view coverage for the dedicated inline error nodes
  - Regenerated `public/js/app.js`
- Deviations from original plan:
  - Did not migrate the concepts edit-modal fetch into the session helper because it is not a progress-backed flow and would have mixed a separate non-progress loading concern into this architecture pass
  - Expanded the implementation slightly to include `13-scene-ideation-controller.js` so briefing no longer depends on a split/compatibility loading contract
- Verification results:
  - `npm run test:client` passed
  - `npm run lint` passed
  - `npm run typecheck` passed
  - `npm test -- --runInBand` passed
