# LOAOVELIFARC-001: Create loading overlay session helper

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (foundation ticket)

## Problem

Page controllers duplicate a fragile multi-step protocol (show overlay, create progressId, start polling, stop polling, hide overlay, re-enable buttons) that is easy to partially apply. The `CONPACCLEAN-002` bug happened because `content-packets` started polling without reliably owning the full overlay lifecycle. A shared lifecycle helper is only worthwhile if the regression site migrates to it in the same ticket; otherwise we add infrastructure without fixing the broken boundary.

## Assumption Reassessment (2026-03-25)

1. `createLoadingProgressController()` in `public/js/src/03-loading-progress.js` owns only stage text, timers, and polling. It does NOT manage overlay visibility. Confirmed.
2. `createProgressId()` exists in `public/js/src/02-utils.js`. Confirmed.
3. Concatenation order is alphabetical by filename, so `03a-*` loads after `03-*` and before `04-*`. Confirmed via existing numbering scheme.
4. `public/js/src/11-content-packets.js` still owns the old manual lifecycle directly and is the only page explicitly tied to the reported regression in the spec. Confirmed.
5. Existing client coverage already exercises `content-packets` loading behavior in `test/unit/client/content-packets-page/controller.test.ts`, so this ticket should extend that suite and add a dedicated helper suite instead of introducing an entirely new test harness. Confirmed.

## Architecture Check

1. Layered design remains the right direction: keep `createLoadingProgressController()` as the low-level polling primitive and add a higher-level session helper above it.
2. A helper-only foundation change is not sufficient. The ticket must migrate at least the regression site (`content-packets`) so the new architecture is exercised in production code immediately.
3. No backwards-compatibility aliases. Within the touched controller, direct lifecycle orchestration should be removed rather than preserved alongside the new helper.

## What to Change

### 1. New file: `public/js/src/03a-loading-overlay-session.js`

Implement `createLoadingOverlaySession(options)` returning `{ begin, end, withProgress, isActive }`.

**Options contract:**
```javascript
{
  overlayElement: HTMLElement,       // required - node whose visibility toggles
  progressElement: HTMLElement,      // required - node passed to createLoadingProgressController
  buttonElement?: HTMLElement,       // optional - convenience for single button
  buttonElements?: HTMLElement[],    // optional - array of buttons to disable/enable
  onShow?: function,                // optional - called after overlay shown
  onHide?: function,                // optional - called after overlay hidden
}
```

**`begin(progressId)`:**
1. Stop any prior active session defensively
2. Set `overlayElement.style.display = 'flex'`
3. Start underlying progress controller with `progressId`
4. Disable all `buttonElements` (`.disabled = true`)
5. Mark session active
6. Invoke `onShow` callback

**`end()`:**
1. No-op if no session active
2. Stop underlying progress controller
3. Set `overlayElement.style.display = 'none'`
4. Re-enable all `buttonElements` (`.disabled = false`)
5. Mark session inactive
6. Invoke `onHide` callback

**`withProgress(run)`:**
1. Create `progressId` via `createProgressId()`
2. Call `begin(progressId)`
3. Invoke `await run(progressId)`
4. Call `end()` in `finally`
5. Rethrow original error

**`isActive()`:**
Return current active state boolean.

**Button resolution rules:**
- If both `buttonElement` and `buttonElements` provided, `buttonElements` wins
- If only `buttonElement` provided, treat as `[buttonElement]`
- If neither provided, no button management

### 2. Migrate `public/js/src/11-content-packets.js`

Replace the ad hoc lifecycle in `handleContentGenerate()` with the new session helper.

Scope for this migration:
1. Instantiate one loading overlay session during controller init
2. Convert `handleContentGenerate()` from `.then()`/`.catch()` to `async`/`await`
3. Route overlay visibility, progress polling, and generate button disabling through the session helper
4. Preserve current page behavior otherwise, including existing `alert()`-based error reporting because the page does not yet expose a dedicated inline error container

This migration is intentionally limited to the bug site. Broader controller rollout belongs in follow-up tickets once the helper contract has proven itself in both unit and page-level tests.

### 3. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js` after creating the new file.

## Files to Touch

- `public/js/src/03a-loading-overlay-session.js` (new)
- `public/js/src/11-content-packets.js`
- `public/js/app.js` (regenerate)

## Out of Scope

- Modifying `public/js/src/03-loading-progress.js` (no changes to low-level primitive)
- Migrating controllers beyond `public/js/src/11-content-packets.js`
- Changing spinner visuals, phrase pools, or progress polling endpoint
- Backend route changes
- EJS template changes

## Acceptance Criteria

### Tests That Must Pass

1. `begin()` sets `overlayElement.style.display` to `'flex'` and calls `loadingProgress.start(progressId)`
2. `end()` sets `overlayElement.style.display` to `'none'` and calls `loadingProgress.stop()`
3. `end()` is a safe no-op when no session is active (no error thrown)
4. Repeated `begin()` calls `end()` on prior session before starting new one (no leaked timers)
5. `withProgress(run)` hides overlay after successful `run` completion
6. `withProgress(run)` hides overlay after `run` throws an error
7. `withProgress(run)` rethrows the original error from `run`
8. `begin()` disables all elements in `buttonElements`
9. `end()` re-enables all elements in `buttonElements`
10. `withProgress(run)` re-enables buttons even when `run` throws
11. Omitting `buttonElements` does not affect overlay show/hide behavior
12. `buttonElement` (singular) is treated as `[buttonElement]` when `buttonElements` is absent
13. `buttonElements` takes precedence over `buttonElement` when both are provided
14. `onShow` callback fires after `begin()` makes overlay visible
15. `onHide` callback fires after `end()` hides overlay
16. `isActive()` returns `true` during active session, `false` otherwise
17. Works with single-node overlays where `overlayElement === progressElement`
18. `content-packets` uses the session helper instead of raw overlay toggles and direct `loadingProgress.start()/stop()` calls inside `handleContentGenerate()`
19. Existing `content-packets` behavior still holds: the generate button is disabled during generation and restored on success, API-level failure, and rejected fetch
20. Existing suite: `npm run test:client`

### Invariants

1. The session helper never directly modifies the internals of `createLoadingProgressController` and only calls `.start()` / `.stop()`
2. `createLoadingProgressController` remains unchanged and independently usable
3. `content-packets` no longer manually coordinates overlay visibility and progress polling as separate steps
4. `app.js` concatenation order places `03a-*` after `03-*` and before `04-*`

## Test Plan

### New/Modified Tests

1. `test/unit/client/loading-overlay-session/session-controller.test.ts` — dedicated unit tests for the helper contract
2. `test/unit/client/content-packets-page/controller.test.ts` — extend existing page tests to verify the migrated controller still cleans up overlay and button state correctly

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- Completed: 2026-03-25
- Actual changes:
  - Added `createLoadingOverlaySession()` in `public/js/src/03a-loading-overlay-session.js`
  - Migrated `public/js/src/11-content-packets.js` from manual overlay/progress orchestration to the shared session helper
  - Regenerated `public/js/app.js`
  - Added dedicated helper contract tests and strengthened the existing `content-packets` page tests with a progress-id lifecycle assertion
- Deviation from the original proposal:
  - The ticket was corrected before implementation to include the `content-packets` migration in the same change. Shipping only the helper would have improved architecture on paper without fixing the known regression site.
  - The broader multi-controller migration described in the reference spec remains intentionally deferred to follow-up tickets.
- Verification:
  - `npm run lint`
  - `npm run test:client -- --runInBand test/unit/client/loading-overlay-session/session-controller.test.ts test/unit/client/content-packets-page/controller.test.ts`
  - `npm test -- --runInBand`
