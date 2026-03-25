# LOAOVELIFARC-001: Create loading overlay session helper

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (foundation ticket)

## Problem

Page controllers duplicate a fragile multi-step protocol (show overlay, create progressId, start polling, stop polling, hide overlay, re-enable buttons) that is easy to partially apply. The CONPACCLEAN-002 bug happened because one controller started polling without showing its overlay. A shared lifecycle helper makes the correct sequence the only sequence.

## Assumption Reassessment (2026-03-25)

1. `createLoadingProgressController()` in `public/js/src/03-loading-progress.js` owns only stage text, timers, and polling. It does NOT manage overlay visibility. Confirmed.
2. `createProgressId()` exists in `public/js/src/02-utils.js`. Confirmed.
3. Concatenation order is alphabetical by filename — `03a-*` will sort after `03-*` and before `04-*`. Confirmed via existing numbering scheme.

## Architecture Check

1. Layered design: low-level progress controller unchanged, new session controller composes it. No coupling leak.
2. No backwards-compatibility aliases. Controllers will migrate to the new API; the old direct usage is intentionally not preserved.

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

### 2. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js` after creating the new file.

## Files to Touch

- `public/js/src/03a-loading-overlay-session.js` (new)
- `public/js/app.js` (regenerate)

## Out of Scope

- Modifying `public/js/src/03-loading-progress.js` (no changes to low-level primitive)
- Migrating any page controllers (subsequent tickets)
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
18. Existing suite: `npm run test:client`

### Invariants

1. The session helper never directly modifies the internals of `createLoadingProgressController` — it only calls `.start()` and `.stop()`
2. `createLoadingProgressController` remains unchanged and independently usable
3. `app.js` concatenation order places `03a-*` after `03-*` and before `04-*`

## Test Plan

### New/Modified Tests

1. `test/unit/client/loading-overlay-session/session-controller.test.ts` — dedicated unit tests for all 18 acceptance criteria above

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
