# LOAOVELIFARC-004: Migrate spine-page and create-story controllers to session helper

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001

## Problem

`public/js/src/09b-spine-page-controller.js` and `public/js/src/09c-create-story-controller.js` both manually coordinate overlay visibility and progress polling. Both are already `async`/`await` with `try`/`finally`, making them clean migration candidates. Bundled as one ticket because both are small, structurally similar, and in the same Phase 1 group.

Note: `LOAOVELIFARC-001` already migrated `content-packets`, so this ticket covers the remaining Phase 1-style two-node overlay controllers.

## Assumption Reassessment (2026-03-25)

### Spine page controller (`09b`)
1. Two-node overlay: `progressSection` + `progressContent`. Confirmed at lines 9-10.
2. Manual visibility: `progressSection.style.display = 'flex'` at line 149, `= 'none'` at line 198. Confirmed.
3. Manual polling: `loadingProgress.start(progressId)` at line 156, `.stop()` at line 197. Confirmed.
4. Button: `generateBtn.disabled = true` at line 148, re-enabled via `updateGenerateButton()` at line 199. Confirmed.
5. Already `async` with `try`/`catch`/`finally`. Confirmed.

### Create story controller (`09c`)
1. Two-node overlay: `progressSection` + `progressContent`. Confirmed at lines 14-15.
2. Manual visibility: `progressSection.style.display = 'flex'` at line 91, `= 'none'` at line 123. Confirmed.
3. Manual polling: `loadingProgress.start(progressId)` at line 94, `.stop()` at line 122. Confirmed.
4. Button: `createBtn.disabled = true` at line 90, re-enabled via `updateCreateButton()` at line 120. Confirmed.
5. Already `async` with `try`/`catch`/`finally`. Confirmed.

## Architecture Check

1. Both controllers follow the exact same pattern: show overlay, start polling, try fetch, finally stop + hide. Direct swap to `withProgress()`.
2. Button re-enablement callbacks (`updateGenerateButton`, `updateCreateButton`) wired to `onHide`.
3. No backwards-compatibility aliases.

## What to Change

### 1. Spine page controller — adopt session helper

Replace `createLoadingProgressController(progressContent)` with:
```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressSection,
  progressElement: progressContent,
  buttonElement: generateBtn,
  onHide: updateGenerateButton,
});
```

Replace manual overlay/polling code in `fetchSpineOptions()` with `session.withProgress()`.

### 2. Create story controller — adopt session helper

Replace `createLoadingProgressController(progressContent)` with:
```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressSection,
  progressElement: progressContent,
  buttonElement: createBtn,
  onHide: updateCreateButton,
});
```

Replace manual overlay/polling code in `createStory()` with `session.withProgress()`.

### 3. Remove now-unused `loadingProgress` variables

Both controllers' direct `createLoadingProgressController()` calls become unnecessary.

### 4. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/09b-spine-page-controller.js` (modify)
- `public/js/src/09c-create-story-controller.js` (modify)
- `public/js/app.js` (regenerate)

## Out of Scope

- Changes to spine or create-story backend routes/API contracts
- Changes to `public/js/src/03-loading-progress.js` or `03a-loading-overlay-session.js`
- Migrating any other controller
- EJS template changes
- Refactoring non-generation code (spine save/delete, spine summary panel, form validation)

## Acceptance Criteria

### Tests That Must Pass

**Spine page:**
1. Overlay becomes visible when spine generation starts
2. Overlay is hidden after successful generation
3. Overlay is hidden after generation failure
4. Generate button is disabled during generation
5. Generate button state is re-synced after generation completes

**Create story page:**
6. Overlay becomes visible when story creation starts
7. Overlay is hidden after successful creation
8. Overlay is hidden after creation failure
9. Create button is disabled during creation
10. Create button state is re-synced after creation completes

**Both:**
11. No direct `style.display` manipulation for loading overlays remains in generation flows
12. No direct `loadingProgress.start()` / `.stop()` calls remain
13. Existing suite: `npm run test:client`

### Invariants

1. Neither controller calls `createLoadingProgressController()` directly
2. Spine save/delete and spine summary display unchanged
3. Create story form validation and navigation to briefing page unchanged
4. Two-node overlay layout (section wrapping content) works correctly in both

## Test Plan

### New/Modified Tests

1. `test/unit/client/spines-page/controller.test.ts` — update generation tests for overlay visibility assertions
2. Client tests for create-story page (create if needed, or verify via existing test coverage)

### Series Note

This ticket remains part of the active overlay-lifecycle migration plan. No new ticket is needed for these controllers.

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`
