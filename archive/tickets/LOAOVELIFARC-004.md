# LOAOVELIFARC-004: Adopt loading overlay session helper in spine-page and create-story controllers

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: LOAOVELIFARC-001

## Problem

`public/js/src/09b-spine-page-controller.js` and `public/js/src/09c-create-story-controller.js` still manually coordinate overlay visibility and progress polling inside their request lifecycles. That duplicates the exact lifecycle already captured by `createLoadingOverlaySession()` and leaves these controllers on an older pattern than the rest of the migration plan.

Bundling them remains justified because both are small, structurally similar, and share the same two-node overlay shape (`progressSection` wrapper + `progressContent` inner node).

## Assumption Reassessment (2026-03-25)

### Repo-wide architecture state
1. `public/js/src/03a-loading-overlay-session.js` already exists and is covered by `test/unit/client/loading-overlay-session/session-controller.test.ts`. This ticket is controller adoption, not helper introduction.
2. The long-term architecture in `specs/loading-overlay-lifecycle-architecture.md` still supports this migration. No spec-level design change is required for this ticket.
3. `public/js/app.js` is generated from `public/js/src/*.js`, so source edits must be made in `public/js/src/` and then bundled via `npm run concat:js`.

### Spine page controller (`09b`)
1. Two-node overlay: `progressSection` + `progressContent`. Confirmed.
2. Manual visibility: `progressSection.style.display = 'flex'` and `= 'none'` still happen inside `fetchSpineOptions()`. Confirmed.
3. Manual polling: `loadingProgress.start(progressId)` and `.stop()` still happen inside `fetchSpineOptions()`. Confirmed.
4. Button: `generateBtn.disabled = true` before request, then state is re-synced via `updateGenerateButton()` in `finally`. Confirmed.
5. Already `async` with `try`/`catch`/`finally`. Confirmed.
6. Existing tests already live in `test/unit/client/spines-page/controller.test.ts`, but they do not currently assert overlay/session lifecycle behavior strongly enough. Confirmed.

### Create story controller (`09c`)
1. Two-node overlay: `progressSection` + `progressContent`. Confirmed.
2. Manual visibility: `progressSection.style.display = 'flex'` and `= 'none'` still happen inside `createStory()`. Confirmed.
3. Manual polling: `loadingProgress.start(progressId)` and `.stop()` still happen inside `createStory()`. Confirmed.
4. Button: `createBtn.disabled = true` before request, but current re-enable behavior is split across `catch` and `finally` rather than owned by a shared overlay lifecycle. This is a good fit for `onHide: updateCreateButton`.
5. Already `async` with `try`/`catch`/`finally`. Confirmed.
6. Existing tests already live in `test/unit/client/create-story-page/controller.test.ts`, but coverage is currently narrow and focused on inline error display. Confirmed.

## Architecture Check

1. Adopting `createLoadingOverlaySession()` is more beneficial than keeping the current controller-local lifecycle code because it consolidates overlay visibility, polling start/stop, and button disabling into one contract that already exists and is tested.
2. This is an architectural simplification, not an abstraction stretch. The helper is already the intended primitive; leaving these two controllers on manual lifecycle code only preserves duplication and drift.
3. `onHide` should own post-request button re-synchronization (`updateGenerateButton`, `updateCreateButton`) so button state is restored consistently after both success and failure.
4. No backwards-compatibility aliases or alternate APIs should be introduced. The controllers should move directly to the canonical helper.
5. No broader rewrite is justified here. The current controller architecture is serviceable once the duplicated overlay lifecycle is removed.

## What to Change

### 1. Spine page controller — adopt session helper

Replace direct `createLoadingProgressController(progressContent)` usage with:
```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressSection,
  progressElement: progressContent,
  buttonElement: generateBtn,
  onHide: updateGenerateButton,
});
```

Wrap the generation request lifecycle in `session.withProgress()`. Keep existing generated-results behavior unchanged.

### 2. Create story controller — adopt session helper

Replace direct `createLoadingProgressController(progressContent)` usage with:
```javascript
var session = createLoadingOverlaySession({
  overlayElement: progressSection,
  progressElement: progressContent,
  buttonElement: createBtn,
  onHide: updateCreateButton,
});
```

Wrap the story-creation request lifecycle in `session.withProgress()`. Keep inline error display and successful navigation behavior unchanged.

### 3. Remove now-unused `loadingProgress` variables

Both controllers' direct `createLoadingProgressController()` calls become unnecessary.

### 4. Strengthen regression tests

Expand the existing controller tests so they verify:
- overlay visibility during the active request
- overlay cleanup on success and failure
- button disable/re-enable behavior around the request lifecycle
- request payloads still include the generated `progressId`

### 5. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js`.

## Files to Touch

- `public/js/src/09b-spine-page-controller.js` (modify)
- `public/js/src/09c-create-story-controller.js` (modify)
- `test/unit/client/spines-page/controller.test.ts` (modify)
- `test/unit/client/create-story-page/controller.test.ts` (modify)
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
11. Create-story inline error rendering remains unchanged on failure
12. Successful create-story flow still navigates to the generated story briefing route

**Both:**
13. No direct `style.display` manipulation for loading overlays remains in the migrated request lifecycles
14. No direct `loadingProgress.start()` / `.stop()` calls remain in the migrated controllers
15. Existing suite: `npm run test:client`

### Invariants

1. Neither controller calls `createLoadingProgressController()` directly
2. Spine save/delete and spine summary display unchanged
3. Create story form validation and navigation to briefing page unchanged
4. Two-node overlay layout (section wrapping content) works correctly in both
5. `progressId` generation remains owned by `withProgress()` rather than by controller-local code

## Test Plan

### New/Modified Tests

1. `test/unit/client/spines-page/controller.test.ts` — strengthen generation lifecycle assertions for overlay visibility, button state, and failure cleanup
2. `test/unit/client/create-story-page/controller.test.ts` — expand coverage to include success, failure, overlay cleanup, and button re-synchronization

### Series Note

This ticket remains part of the active overlay-lifecycle migration plan. No new ticket is needed for these controllers.

### Commands

1. `npm run test:client`
2. `npm run lint`
3. `npm test`

## Outcome

- Completed on 2026-03-25.
- Updated `09b-spine-page-controller.js` and `09c-create-story-controller.js` to use the existing `createLoadingOverlaySession()` helper instead of manual overlay visibility and raw progress-controller lifecycle code.
- Strengthened `test/unit/client/spines-page/controller.test.ts` and `test/unit/client/create-story-page/controller.test.ts` to cover in-flight overlay visibility, cleanup on success/failure, button state recovery, and `progressId` propagation.
- Regenerated `public/js/app.js` from source.
- Deviation from original plan: this ticket did not introduce the session helper or new page test files because both already existed in the repo; the actual work was controller adoption plus stronger regression coverage.
- Verification: `npm run test:client`, `npm run lint`, and `npm test` all passed.
