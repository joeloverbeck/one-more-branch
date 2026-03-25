# LOAOVELIFARC-006: Migrate character controllers + final cleanup grep

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001, LOAOVELIFARC-005

## Problem

Three character-related controllers still use the manual overlay protocol. After migrating them, a final grep confirms no page-level loading overlays are still toggled by raw `style.display` in generation flows, and dead helper code is removed.

Note: This ticket closes the remaining migration debt from Phase 2 of `specs/loading-overlay-lifecycle-architecture.md` for the three character controllers only. It does not claim repo-wide elimination of all raw loading toggles because some non-migrated or non-generation flows still use them intentionally.

## Assumption Reassessment (2026-03-25)

### Shared architecture state
1. `createLoadingOverlaySession()` already exists in `public/js/src/03a-loading-overlay-session.js` and is covered by `test/unit/client/loading-overlay-session/session-controller.test.ts`.
2. This ticket is therefore a controller migration + cleanup ticket, not a helper design ticket.
3. A repo-wide grep still finds raw loading toggles outside this ticket's scope:
   - `public/js/src/05i-pacing-rewrite.js` (play-page rewrite flow)
   - `public/js/src/09-controllers.js` (play page, intentionally out of scope)
   - `public/js/src/11-concepts-controller.js` (concept edit modal load, not a progress-polling generation flow)
4. The cleanup grep for this ticket must be scoped to the three migrated controllers and to direct `createLoadingProgressController()` usage in page controllers that were part of the migration series.

### Character webs controller (`16-character-webs-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 58. Confirmed.
2. Multiple long-running generation flows remain manual:
   - web generate/regenerate
   - character stage generate/regenerate
3. The controller also contains a controller-local `withProgress()` helper used for ordinary fetch/loading UX (`selectWeb`, `refreshWebs`) that does not create a `progressId`. That helper should not be replaced with the session helper because it is not a progress-polling generation lifecycle.
4. This is a large controller with multiple async operations, so migration must be surgical and should preserve the distinction between:
   - overlay-only loading for ordinary reads
   - overlay + progress polling for long-running generation routes

### Characters controller (`17-characters-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 25. Confirmed.
2. `loading.style.display = 'flex'` at line 376. Confirmed.
3. There is currently no dedicated client test file for this page, so this ticket must add coverage rather than only updating existing tests.

### Character brainstormer controller (`19-character-brainstormer-controller.js`)
1. Single-node overlay: `loading`. `createLoadingProgressController(loading)` at line 32. Confirmed.
2. Manual lifecycle remains in `handleBrainstormGenerate()` with direct button disable/enable and overlay toggles.
3. Existing client coverage already checks inline error rendering, but it does not yet assert the overlay/button lifecycle invariant.

## Architecture Check

1. Replacing manual generation lifecycles with `createLoadingOverlaySession()` is better than the current architecture because it restores one enforced contract for:
   - overlay visibility
   - progress polling
   - button disable/enable
2. Character webs should use one shared session instance for generation routes only.
3. Character webs should retain a separate small overlay-only helper for non-generation fetches. Starting progress polling for ordinary GET refresh/select work would be the wrong abstraction and would make the controller less correct, not more extensible.
4. Cleanup verification must check migration completeness for the targeted controller set rather than asserting a repo-wide grep result that is currently false for unrelated reasons.

## What to Change

### 1. Character webs controller (`16-character-webs-controller.js`)

Replace direct progress-controller usage with one `createLoadingOverlaySession()` instance. Use the session helper only for web generation and character-stage generation flows. Keep ordinary read/refresh overlay behavior separate and clean up the misleading local helper name if needed.

### 2. Characters controller (`17-characters-controller.js`)

Replace direct overlay/polling code with session helper.

### 3. Character brainstormer controller (`19-character-brainstormer-controller.js`)

Replace direct overlay/polling code with session helper.

### 4. Final cleanup grep

After all migrations, grep across `public/js/src/` for:
- `createLoadingProgressController` in migrated page controllers from this series — the three controllers in this ticket should no longer call it directly
- raw `style.display = 'flex'/'none'` in generation/evolution flows within the three migrated controllers — these should be removed

Do not fail this ticket on unrelated remaining raw toggles in:
- `09-controllers.js`
- `05i-pacing-rewrite.js`
- modal/data-load flows such as the concept edit modal in `11-concepts-controller.js`

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
6. `16-character-webs-controller.js`, `17-characters-controller.js`, and `19-character-brainstormer-controller.js` no longer call `createLoadingProgressController()` directly
7. No page-level loading overlay in those three migrated controllers is toggled by raw `style.display = 'flex'/'none'` in a generation flow
8. No unused `loadingProgress` variables remain in migrated controllers
9. Existing suite: `npm run test:client`

### Invariants

1. None of the migrated controllers call `createLoadingProgressController()` directly
2. All character CRUD, rendering, and non-generation UI unchanged
3. Character webs controller's multiple generation flows all go through the session helper
4. The play page controller (`09-controllers.js`) is unmodified
5. `createLoadingProgressController` remains available as a low-level primitive for any future intentional direct usage
6. Character webs ordinary read/refresh loading does not start progress polling unless the route actually participates in progress reporting

### Series Note

The final grep in this ticket should treat `18-worldbuilding-controller.js` separately from the migration debt because it is not part of the progress-polling/session-helper architecture targeted by this series.

## Test Plan

### New/Modified Tests

1. `test/unit/client/character-webs-page/controller.test.ts` — update for overlay visibility
2. `test/unit/client/character-brainstormer-page/controller.test.ts` — strengthen lifecycle assertions around generate failure/success paths
3. New `test/unit/client/characters-page/controller.test.ts` — add direct coverage for the decompose flow and overlay/button lifecycle

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- Completion date: 2026-03-25
- Actually changed:
  - migrated `16-character-webs-controller.js`, `17-characters-controller.js`, and `19-character-brainstormer-controller.js` to `createLoadingOverlaySession()`
  - kept character-web ordinary read/refresh overlay behavior separate from progress polling, and made it session-aware so refreshes do not hide an active generation overlay early
  - regenerated `public/js/app.js`
  - added a new client test file for the characters page and strengthened character-webs and brainstormer client coverage around overlay/button lifecycle cleanup
- Deviations from the original plan:
  - the ticket scope was corrected before implementation because the session helper already existed and the repo-wide grep expectation was false due to unrelated raw loading toggles outside this migration set
  - character-web ordinary fetch/loading remained an overlay-only helper instead of being forced through progress polling, because that is the cleaner long-term architecture
- Verification:
  - `npx jest --selectProjects client test/unit/client/character-webs-page/controller.test.ts test/unit/client/character-brainstormer-page/controller.test.ts test/unit/client/characters-page/controller.test.ts`
  - `npm run test:client`
  - `npm run lint`
  - `npm test`
