# Spec: Loading Overlay Lifecycle Architecture

**Status**: PENDING
**Date**: 2026-03-25
**Owner**: App/Web

## Overview

The current frontend architecture splits long-running UI work across two concepts:

1. Overlay visibility is handled ad hoc in each page controller with direct `style.display = 'flex'/'none'`.
2. Progress polling and stage phrase rotation are handled by `createLoadingProgressController()` in `public/js/src/03-loading-progress.js`.

That split is valid in principle, but the current implementation is brittle because there is no shared lifecycle abstraction binding the two together. The `CONPACCLEAN-002` bug happened because `public/js/src/11-content-packets.js` started progress polling without making its overlay visible.

This spec defines the cleaner long-term architecture: page controllers should stop manually coordinating overlay visibility and polling as separate responsibilities. They should instead use a single lifecycle helper that owns the start/stop contract for loading overlays.

## Reassessed Current State

1. `createLoadingProgressController(loadingElement)` currently owns only stage/status text, timers, and `/generation-progress/:progressId` polling.
2. It does not show or hide the overlay container.
3. Multiple pages already duplicate the same lifecycle sequence:
   - show overlay
   - create `progressId`
   - `loadingProgress.start(progressId)`
   - run async work
   - `loadingProgress.stop()`
   - hide overlay
4. That pattern currently exists in:
   - `public/js/src/09c-create-story-controller.js`
   - `public/js/src/09b-spine-page-controller.js`
   - `public/js/src/10-briefing-controller.js`
   - `public/js/src/11-concepts-controller.js`
   - `public/js/src/11-content-packets.js`
   - `public/js/src/12-kernels-controller.js`
   - `public/js/src/13-evolution-controller.js`
   - `public/js/src/14-kernel-evolution-controller.js`
   - `public/js/src/15-concept-seeds-controller.js`
   - `public/js/src/16-character-webs-controller.js`
   - `public/js/src/17-characters-controller.js`
   - `public/js/src/19-character-brainstormer-controller.js`
5. Some pages use overlay container + inner content nodes (`progressSection` + `progressContent`), while others use a single loading element for both overlay and text container.
6. The existing pages are close enough structurally that a unifying helper is justified and should reduce bugs rather than introduce abstraction debt.

## Problem

The current architecture is too easy to misuse because it requires every controller author to remember a multi-step protocol:

1. find the right overlay element
2. show it manually
3. create and track a progress id
4. start polling
5. stop polling on every exit path
6. hide the overlay on every exit path
7. keep the button/error/result behavior consistent around that lifecycle

This protocol is duplicated, easy to partially apply, and not enforced by any API boundary.

## Goal

Introduce one shared client-side abstraction that makes the correct lifecycle the easiest lifecycle:

- one helper call to begin a loading session
- one helper call to finish it
- no direct per-page coordination between overlay visibility and progress polling
- no backwards-compatibility shims or alias APIs

## Non-Goals

1. Redesigning spinner visuals or phrase pools.
2. Replacing progress polling with SSE/WebSockets.
3. Refactoring every modal in the app; this spec only covers loading overlays tied to async work.
4. Changing route contracts or progress endpoint behavior.

## Design Decision

Keep `createLoadingProgressController()` focused on progress text/polling internals, and add a higher-level helper above it for page controllers.

Do not expand `createLoadingProgressController()` so that it mutates arbitrary DOM visibility itself. That function is already a narrow primitive and should stay reusable. The cleaner architecture is:

- low-level primitive: progress text/polling controller
- high-level primitive: loading overlay session controller
- page controllers: use the session controller, not raw DOM toggles

## Proposed Architecture

### 1. New helper: loading overlay session controller

Add a new shared client helper in `public/js/src/03a-loading-overlay-session.js` or the nearest stable position before page controllers in concatenation order.

Proposed API:

```javascript
function createLoadingOverlaySession(options) {
  return {
    begin: function begin(progressId) {},
    end: function end() {},
    withProgress: async function withProgress(run) {},
    isActive: function isActive() {},
  };
}
```

### 2. Options contract

The helper must accept:

```javascript
{
  overlayElement: HTMLElement,
  progressElement: HTMLElement,
  buttonElement?: HTMLElement,
  buttonElements?: HTMLElement[],
  onShow?: function () {},
  onHide?: function () {},
}
```

Rules:

1. `overlayElement` is the node whose visibility toggles between hidden and visible.
2. `progressElement` is the node passed to `createLoadingProgressController()`.
3. For one-node overlays, `overlayElement === progressElement`.
4. No aliasing or alternate key names.
5. `buttonElement` is a convenience shorthand for a single button. If provided, it is treated as `buttonElements: [buttonElement]`.
6. `buttonElements` is an array of buttons to disable on `begin()` and re-enable on `end()`. Both fields are optional; controllers that omit them get current behavior (no button management).
7. If both `buttonElement` and `buttonElements` are provided, `buttonElement` is ignored and `buttonElements` wins.

### 3. Behavior contract

`begin(progressId)` must:

1. stop any prior active session defensively
2. set `overlayElement.style.display = 'flex'`
3. start the underlying progress controller with `progressId`
4. disable all elements in `buttonElements` by setting `.disabled = true`
5. mark the session active
6. invoke `onShow` after visibility is applied

`end()` must:

1. no-op safely if no session is active
2. stop the underlying progress controller
3. set `overlayElement.style.display = 'none'`
4. re-enable all elements in `buttonElements` by setting `.disabled = false`
5. mark the session inactive
6. invoke `onHide` after visibility is removed

`withProgress(run)` must:

1. create a new `progressId` internally via `createProgressId()`
2. call `begin(progressId)`
3. invoke `run(progressId)`
4. always call `end()` in a `finally` block
5. rethrow the original error

This becomes the preferred controller-level API.

### 4. Controller usage rules

Controllers using loading overlays must:

1. stop calling `createLoadingProgressController()` directly
2. stop toggling loading overlay visibility directly inside request lifecycles
3. create one session helper during controller init
4. wrap long-running generation/evolution calls in `withProgress(async function (progressId) { ... })`

Allowed direct visibility toggles after migration:

1. non-loading UI state unrelated to overlay lifecycle
2. modals such as API key, lore, recap, concept edit

Disallowed after migration:

1. page-level loading overlays toggled via raw `style.display` in generation/evolution flows
2. calling `loadingProgress.start()` and `loadingProgress.stop()` directly in page controllers that have migrated

## Migration Plan

### Phase 1: Introduce helper and migrate the simplest pages

Migrate:

1. `public/js/src/11-content-packets.js`
2. `public/js/src/12-kernels-controller.js`
3. `public/js/src/09c-create-story-controller.js`
4. `public/js/src/09b-spine-page-controller.js`

Reason:

- these are the cleanest examples of the current protocol
- they cover both one-node and two-node overlay shapes

Migration guidance for Phase 1:

1. **Content Packets async/await conversion**: `public/js/src/11-content-packets.js` is the only controller still using `.then()`/`.catch()` chains instead of `async`/`await`. During migration, its `handleContentGenerate()` function must be converted to `async`/`await` + `try`/`finally` to align with all other controllers and work naturally with `withProgress()`. The `.then()` chain structure is incompatible with the `withProgress(async function (progressId) { ... })` contract because `withProgress` relies on `await` to know when the async work completes.
2. **Error display standardization**: During migration, controllers should replace `alert()` calls in generation error paths with their page's `showError()` or `setError()` pattern. This is not a hard requirement for the session helper itself, but migrating controllers should adopt the structured inline error display that newer pages already use (e.g., Kernels, Evolution, Create Story). Content Packets is the primary candidate: its `handleContentGenerate()` currently uses `alert()` for all error paths.

### Phase 2: Migrate the remaining generation pages

Migrate:

1. `public/js/src/10-briefing-controller.js`
2. `public/js/src/11-concepts-controller.js`
3. `public/js/src/13-evolution-controller.js`
4. `public/js/src/14-kernel-evolution-controller.js`
5. `public/js/src/15-concept-seeds-controller.js`
6. `public/js/src/16-character-webs-controller.js`
7. `public/js/src/17-characters-controller.js`
8. `public/js/src/19-character-brainstormer-controller.js`

### Phase 3: Cleanup

After all targeted pages are migrated:

1. grep for page-level loading overlays still toggled by raw `style.display = 'flex'/'none'`
2. remove dead local helper code or duplicate comments
3. ensure no page still instantiates `createLoadingProgressController()` directly unless it is intentionally lower-level infrastructure

## Required File Changes

### New files

1. `public/js/src/03a-loading-overlay-session.js`

### Files to modify

1. `public/js/src/11-content-packets.js`
2. `public/js/src/12-kernels-controller.js`
3. `public/js/src/09c-create-story-controller.js`
4. `public/js/src/09b-spine-page-controller.js`
5. `public/js/src/10-briefing-controller.js`
6. `public/js/src/11-concepts-controller.js`
7. `public/js/src/13-evolution-controller.js`
8. `public/js/src/14-kernel-evolution-controller.js`
9. `public/js/src/15-concept-seeds-controller.js`
10. `public/js/src/16-character-webs-controller.js`
11. `public/js/src/17-characters-controller.js`
12. `public/js/src/19-character-brainstormer-controller.js`
13. `public/js/app.js` regenerated

### Files that should not change for this refactor

1. `public/js/src/03-loading-progress.js` except for minimal integration if truly necessary
2. backend routes/services for `/generation-progress`
3. EJS templates unless a page currently lacks a consistent overlay node pairing

## Invariants

1. If a controller starts a loading session, the overlay is visible for the full async lifecycle and hidden afterward.
2. Overlay cleanup must happen on:
   - success
   - API-level failure response
   - rejected fetch / thrown error
3. Progress polling cannot continue after the overlay session ends.
4. Starting a new loading session while one is active must not leak timers or leave stale polling alive.
5. No page may require controller authors to remember both "show overlay" and "start polling" as separate manual steps after migration.
6. The abstraction must support both:
   - single-node overlays
   - overlay-wrapper plus progress-content layouts
7. Existing user-visible stage text behavior remains unchanged.
8. If `buttonElements` are provided, all specified buttons are disabled for the full duration of the loading session and re-enabled when the session ends, regardless of success or failure.

## Testing Requirements

### New unit tests

1. Add a dedicated client unit test for the new session helper.
2. Cover:
   - `begin()` shows overlay and starts polling
   - `end()` stops polling and hides overlay
   - repeated `begin()` does not leak prior session state
   - `withProgress()` hides overlay in `finally` on success
   - `withProgress()` hides overlay in `finally` on thrown error
   - `begin()` disables all `buttonElements`
   - `end()` re-enables all `buttonElements`
   - `withProgress()` re-enables buttons on thrown error
   - omitting `buttonElements` does not affect overlay behavior (backward compatibility)

### Page controller test updates

Strengthen or preserve controller specs for:

1. `test/unit/client/content-packets-page/controller.test.ts`
2. `test/unit/client/kernels-page/controller.test.ts`
3. client tests covering create-story, briefing, concepts, spines, evolution, character-webs, characters, and character-brainstormer where applicable

Each migrated page should assert:

1. overlay becomes visible during the request lifecycle
2. overlay is hidden after success
3. overlay is hidden after failure

### Verification commands

1. `npm run test:client`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Breaking-Change Policy

This refactor is intentionally breaking at the internal architecture level:

1. page controllers should no longer use raw overlay visibility toggles for loading flows
2. page controllers should no longer depend on `createLoadingProgressController()` directly once migrated

If any migrated page breaks because it depended on the old ad hoc protocol, fix that page. Do not add compatibility aliases that preserve the old pattern.

## Implementation Notes

1. Keep the helper minimal and explicit. This should not become a generic async-state framework.
2. Prefer one helper instance per page controller, created once during init.
3. `withProgress()` should be the default path because it structurally guarantees cleanup.
4. Avoid rewriting entire controllers; migrate the smallest lifecycle slices necessary.
5. If a page mixes loading overlays with unrelated modals, do not unify those concerns.
6. Migrated controllers should adopt defensive JSON parsing for fetch responses. The recommended pattern (already used by Kernels and Evolution controllers) guards against non-JSON error responses from the server:
   ```javascript
   var data = null;
   try { data = await response.json(); } catch (_) { data = null; }
   ```
   This prevents an unhandled parse error from masking the original HTTP failure and ensures the controller can fall through to its error handling with `data === null`.
7. Controllers needing post-operation state sync (e.g., Kernels calling `syncGenerateButtonState()` after generation completes) should wire those functions to the `onHide` callback. This keeps cleanup logic declarative and co-located with the session setup rather than scattered in `finally` blocks. No new API surface is needed; `onHide` already fires after the overlay is hidden and buttons are re-enabled.

## Acceptance Criteria

1. The content-packets bug class is structurally prevented by the new API.
2. At least the phase-1 pages no longer coordinate overlay visibility and progress polling manually.
3. The helper supports both existing overlay DOM shapes in the app.
4. Client tests explicitly cover success and failure cleanup.
5. All standard verification commands pass.
6. Button disabling/re-enabling is handled by the session helper for controllers that opt in via `buttonElements`, eliminating the class of bug where buttons stay permanently disabled on fetch rejection.

## Future Extensibility

Once this helper exists, the next clean step would be optional, not part of this spec:

1. expose a tiny controller-state object for tests
2. use the same abstraction for any future long-running workflow pages
