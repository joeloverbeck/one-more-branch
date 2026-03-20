# SPNDISP-001: Add saved spines loading on /spines page init

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The `/spines` page always shows "No saved spines yet" even when spine JSON files exist in `spines/`. Users cannot see or manage their previously saved spines.

## Assumption Reassessment (2026-03-20)

1. **Server route works correctly**: Confirmed — `spines.ts:25-42` calls `listSpines()` and passes `savedSpines` to the EJS template. The `/spines/api/list` endpoint (lines 44-50) returns spines as JSON.
2. **Persistence layer works correctly**: Confirmed — `spine-repository.ts` uses `createJsonEntityRepository` which lists `.json` files from the `spines/` directory. Spine files exist on disk.
3. **EJS template delegates rendering to client JS**: Confirmed — `spines.ejs:119-123` only renders the empty-state message, matching the kernels/characters pattern where the `<div id="saved-spines">` container is populated by client-side JavaScript.
4. **Client JS has rendering function but no init call**: Confirmed — `09b-spine-page-controller.js` has `renderSavedSpineCard()` (line 99) for rendering individual spine cards, and save/delete handlers, but **no `loadSavedSpines()` function and no init-time fetch call**.
5. **Established pattern exists**: Confirmed — `12-kernels-controller.js` uses `loadSavedKernels()` (line 194) fetching from `/kernels/api/list`, called at init via `void loadSavedKernels().catch(...)` (line 545). `17-characters-controller.js` uses the same pattern with `refreshCharacters()`.

## Architecture Check

1. **Follows established client-fetch pattern**: The kernels and characters pages both use a `loadSaved*()` async function that fetches from an `/api/list` endpoint on page init. This ticket applies the identical pattern to spines — no new abstractions, no architectural novelty.
2. **No backwards-compatibility aliasing/shims introduced**: Pure addition of missing initialization logic. No existing behavior changes.
3. **Why not server-side EJS rendering**: The spine controller already manages the saved-spines container dynamically (save adds cards, delete removes cards). Client-side init fetch keeps all DOM management in one place, avoiding split responsibility between EJS and JS. This matches how kernels and characters work.

## What to Change

### 1. Add `loadSavedSpines()` function to spine page controller

In `public/js/src/09b-spine-page-controller.js`, inside the `initSpinesPage()` closure:

Add an async `loadSavedSpines()` function that:
- Fetches `GET /spines/api/list` with `{ method: 'GET', cache: 'no-store' }`
- Validates response: `response.ok && data.success && Array.isArray(data.spines)`
- Clears `savedContainer.innerHTML`
- If `data.spines.length === 0`: appends the empty-state `<p>` message
- Otherwise: iterates `data.spines` and appends `renderSavedSpineCard(spine)` for each

Reference implementation from `12-kernels-controller.js:194-206`:
```javascript
async function loadSavedKernels() {
  var response = await fetch('/kernels/api/list', {
    method: 'GET',
    cache: 'no-store',
  });
  var data = await response.json();
  if (!response.ok || !data.success || !Array.isArray(data.kernels)) {
    throw new Error(data.error || 'Failed to load kernels');
  }
  renderSavedKernels(data.kernels, data.conflictAxisGroups);
}
```

### 2. Call `loadSavedSpines()` at page init

At the bottom of `initSpinesPage()` (before the closing `}`), add:
```javascript
void loadSavedSpines().catch(function (error) {
  console.error('Failed to load saved spines:', error);
});
```

This matches the kernels pattern at `12-kernels-controller.js:545`.

### 3. Update save handler to reload full list

Replace the manual card append in the save handler (current lines 214-217):
```javascript
// Current: manually appends one card
var emptyMsg = savedContainer.querySelector('.spine-section-subtitle');
if (emptyMsg) emptyMsg.remove();
savedContainer.appendChild(renderSavedSpineCard(data.spine));
```

With a full reload call:
```javascript
await loadSavedSpines();
```

This ensures consistent rendering (sorted order, no stale DOM) and matches how kernels refreshes after mutations.

### 4. Regenerate `app.js`

Run `node scripts/concat-client-js.js` to regenerate `public/js/app.js` from the source files.

## Files to Touch

- `public/js/src/09b-spine-page-controller.js` (modify)
- `public/js/app.js` (regenerated via concat script — never hand-edited)

## Out of Scope

- Server-side EJS rendering of saved spines (unnecessary given client-fetch pattern)
- Changes to the spine persistence layer (working correctly)
- Changes to the spine route handlers (working correctly)
- Adding new API endpoints (existing `/spines/api/list` is sufficient)
- Refactoring the spine page controller beyond the missing init logic

## Acceptance Criteria

### Tests That Must Pass

1. Navigate to `/spines` with saved spine files on disk — all saved spines render under "Saved Spines" with name, type, dramatic question, conflict, arc, and delete button
2. Navigate to `/spines` with no spine files — "No saved spines yet" message displays
3. Save a new spine — saved spines section refreshes and shows the newly saved spine in sorted order
4. Delete a spine — spine disappears from the list; if last spine, empty-state message appears
5. Existing suite: `npm test` passes with no regressions

### Invariants

1. **Client-fetch pattern consistency**: Spines page must use the same `loadSaved*()` + API fetch pattern as kernels and characters pages
2. **No manual DOM manipulation after save**: Save handler must reload the full list (not manually append) to ensure sort order and state consistency
3. **Generated app.js**: `public/js/app.js` is always regenerated from source files, never hand-edited

## Test Plan

### New/Modified Tests

1. `test/unit/client/spine-page-controller.test.ts` — Test that `initSpinesPage()` fetches from `/spines/api/list` and renders saved spine cards (if client tests exist for this controller)

### Commands

1. `node scripts/concat-client-js.js` — Regenerate app.js
2. `npm run lint` — Lint passes
3. `npm run typecheck` — Type check passes
4. `npm test` — Full test suite passes
5. Manual verification at `localhost:3000/spines` — Saved spines display correctly

## Outcome

**Completed**: 2026-03-20

**What changed**:
- Added `loadSavedSpines()` async function to `public/js/src/09b-spine-page-controller.js` (fetches `/spines/api/list`, renders cards or empty-state)
- Added `void loadSavedSpines().catch(...)` init call at bottom of `initSpinesPage()`
- Updated save handler to call `await loadSavedSpines()` instead of manual DOM append
- Regenerated `public/js/app.js` via concat script

**Deviations from plan**: None.

**Verification**: Lint clean, typecheck clean, 314 test suites / 3646 tests all pass.
