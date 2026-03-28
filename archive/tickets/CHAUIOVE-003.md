# CHAUIOVE-003: Compact input bar with API key popover

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (layout must exist for input bar to be pinned in grid)

## Problem

The current "Send Turn" form occupies a full `story-card` section with a visible API key field and large textarea, taking up significant vertical space. The spec calls for a compact input bar pinned at the bottom with an API key popover behind a lock icon, an auto-growing textarea, and a compact send button.

## Assumption Reassessment (2026-03-28)

1. Current form already lives inside `<section class="chat-input-bar">`, not a generic `.form-section` container. The grid layout from the chat UI overhaul is already present in `src/server/views/pages/chat.ejs`.
2. API key input is `#chat-api-key`, message textarea is `#chat-message`, send button is `#chat-send-button` — confirmed.
3. Enter-to-send and Shift+Enter for newline already implemented in `20-chat-controller.js:281-293` — confirmed.
4. `getApiKey()` and `setApiKey()` already exist in client JS for session storage — confirmed in `public/js/src/02-utils.js`.
5. Loading indicator (`#chat-loading-indicator`) and progress status (`#chat-progress-status`) are used during turn generation — confirmed.
6. Client-side chat coverage already exists in `test/unit/client/chat-page/controller.test.ts`; the ticket should extend that suite rather than invent a new `test/client` path.
7. The current controller still owns chat-page orchestration, turn rendering, sidebar updates, and composer behavior in one file. No extracted `20a-*` / `20b-*` chat modules exist yet in this repository.

## Architecture Check

1. The compact composer is a clear improvement over the current architecture because it removes persistent low-value chrome from the page while keeping the important controls always visible in the pinned input area.
2. The best long-term boundary for this ticket is not a new standalone module yet; it is extracting small composer-focused helpers inside `20-chat-controller.js` so the submit flow remains readable without introducing speculative file splits ahead of later chat tickets.
3. API key popover should stay pure CSS/JS. No dependency or abstraction layer is justified for a single anchored disclosure control.
4. Existing element IDs that the controller depends on must remain stable so submit/progress wiring stays coherent, but the visible DOM structure around them can be modernized aggressively.
5. This ticket should also correct a current UX/logic mismatch: the send button is not proactively disabled based on message/API-key state today, even though the spec expects composer state to be reflected before submit.

## What to Change

### 1. EJS template: input bar in `.chat-input-bar`

```html
<div class="chat-input-bar">
  <form id="chat-turn-form" class="chat-input-form" data-chat-turn-form>
    <div class="chat-apikey-popover-anchor">
      <button type="button" id="chat-apikey-toggle" class="chat-apikey-btn" title="API Key">
        <!-- Lock icon (SVG or character) -->
      </button>
      <div id="chat-apikey-popover" class="chat-apikey-popover" style="display:none;">
        <input type="password" id="chat-api-key" placeholder="sk-or-..." autocomplete="off">
        <p class="form-help">Stored client-side only.</p>
      </div>
    </div>
    <textarea id="chat-message" rows="1" maxlength="2000"
      placeholder="Use *asterisks* for actions and plain text for speech."
      required></textarea>
    <button type="submit" class="btn btn-primary chat-send-btn" id="chat-send-button">Send</button>
  </form>
  <div class="alert alert-error" id="chat-turn-error" style="display:none;" role="alert"></div>
  <div id="chat-loading-indicator" style="display:none;" aria-live="polite"></div>
  <div id="chat-progress-status" data-chat-progress></div>
</div>
```

Notes:
- Remove the visible API-key label/input block from the main row and replace it with a left-anchored toggle button plus popover.
- Keep the loading/error/progress nodes in the input area, but the form layout should become a single compact composer row instead of a three-column settings form.

### 2. CSS: input bar styling

- `.chat-input-form`: flexbox row, items centered, padding, border-top
- `#chat-message`: auto-grow textarea (1 line min, ~4 lines max via JS + max-height CSS)
- `.chat-apikey-btn`: small icon button, toggles filled/unfilled lock state
- `.chat-apikey-popover`: absolute-positioned dropdown above the lock button
- `.chat-send-btn`: compact, disabled styling when empty

### 3. Client JS: popover toggle + auto-grow + send-button state

In `20-chat-controller.js`:
- Toggle `#chat-apikey-popover` visibility on lock icon click
- Auto-grow textarea: listen to `input` event, set `style.height` based on `scrollHeight`, cap at max
- Update lock icon filled/unfilled state based on whether API key is set
- Disable send button when textarea is empty or API key is not set
- Close the popover on outside click and `Escape` so it behaves like a real disclosure control instead of a sticky overlay
- Keep this logic in focused composer helper functions so `submitTurn()` remains orchestration-only

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — replace form section with compact input bar
- `public/css/styles.css` (modify) — add `.chat-input-form`, `.chat-apikey-*`, `.chat-send-btn` styles
- `public/js/src/20-chat-controller.js` (modify) — add popover toggle, auto-grow, send-button state
- `test/unit/server/views/chat.test.ts` (modify) — update form structure assertions
- `test/unit/client/chat-page/controller.test.ts` (modify) — verify popover/composer behavior in the real client harness

## Out of Scope

- Layout grid structure (CHAUIOVE-002)
- Turn rendering changes (CHAUIOVE-004 through CHAUIOVE-006)
- Sidebar changes (CHAUIOVE-007 through CHAUIOVE-009)
- Chat-wide module extraction into new `20a-*` / `20b-*` files
- Submit contract changes with the server
- Progress polling changes (existing `loadingSession` pattern unchanged)

## Acceptance Criteria

### Tests That Must Pass

1. Template renders `#chat-turn-form` inside `.chat-input-bar` with lock icon button and popover
2. `#chat-api-key` input exists inside `#chat-apikey-popover`
3. `#chat-message` textarea has `rows="1"` and `maxlength="2000"`
4. `#chat-send-button` exists as a submit button and reflects disabled state when message/API key requirements are not met
5. Existing suite: `npm test` — no regressions
6. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Element IDs `chat-api-key`, `chat-message`, `chat-send-button`, `chat-turn-form`, `chat-loading-indicator`, `chat-progress-status` preserved
2. Enter-to-send and Shift+Enter-for-newline behavior unchanged
3. API key stored/retrieved from session storage as before
4. `submitTurn()` request/response contract remains unchanged
5. Composer behavior must be deterministic with or without a stored API key already present in session storage

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: form is inside `.chat-input-bar`, contains popover structure
2. `test/unit/server/views/chat.test.ts` — add: lock icon button exists with correct ID and textarea renders as one-row composer
3. `test/unit/client/chat-page/controller.test.ts` — add: send button enables/disables as message and API key state changes
4. `test/unit/client/chat-page/controller.test.ts` — add: API key popover toggles, closes on outside click, and lock state updates after persistence
5. `test/unit/client/chat-page/controller.test.ts` — add: textarea auto-grows and resets after successful submit

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `npm run concat:js`
3. `npm run test:client` — client JS tests
4. `npm test` — full suite

## Outcome

- Completed: 2026-03-28
- Actual changes:
  - Replaced the visible API-key field block with a compact composer row, anchored API-key popover, one-line textarea, and compact send button.
  - Added controller-side composer helpers for popover state, send-button gating, lock-state sync, textarea auto-grow, and read-only behavior during turn submission.
  - Strengthened both server-render and client-controller tests around the compact composer contract.
- Deviations from original plan:
  - Did not extract new chat-specific `20a-*` / `20b-*` modules in this ticket. The current codebase has not established those boundaries yet, and forcing that split here would have expanded scope without improving this small change set.
  - Kept the submit request/response flow intact and limited the refactor to composer-specific behavior inside the existing controller.
- Verification:
  - `npm run concat:js`
  - `npm run test:client -- --testPathPatterns=test/unit/client/chat-page/controller.test.ts`
  - `npm run test:unit -- --testPathPatterns=test/unit/server/views/chat.test.ts`
  - `npm run lint`
  - `npm test`
