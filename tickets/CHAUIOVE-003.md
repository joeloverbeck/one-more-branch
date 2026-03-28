# CHAUIOVE-003: Compact input bar with API key popover

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (layout must exist for input bar to be pinned in grid)

## Problem

The current "Send Turn" form occupies a full `story-card` section with a visible API key field and large textarea, taking up significant vertical space. The spec calls for a compact input bar pinned at the bottom with an API key popover behind a lock icon, an auto-growing textarea, and a compact send button.

## Assumption Reassessment (2026-03-28)

1. Current form is inside `<section class="form-section">` with id `chat-turn-form` — confirmed in `chat.ejs:113`.
2. API key input is `#chat-api-key`, message textarea is `#chat-message`, send button is `#chat-send-button` — confirmed.
3. Enter-to-send and Shift+Enter for newline already implemented in `20-chat-controller.js:281-293` — confirmed.
4. `getApiKey()` and `setApiKey()` already exist in client JS for session storage — confirmed at line 43-46.
5. Loading indicator (`#chat-loading-indicator`) and progress status (`#chat-progress-status`) are used during turn generation — confirmed.

## Architecture Check

1. The input bar replaces the existing form section within the `.chat-input-bar` grid area from CHAUIOVE-002.
2. API key popover is pure CSS/JS — no library needed. A simple absolutely-positioned dropdown toggled by the lock icon button.
3. Existing element IDs preserved so `submitTurn()` and event listeners in `20-chat-controller.js` continue to work without changes to the submit logic.

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

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — replace form section with compact input bar
- `public/css/styles.css` (modify) — add `.chat-input-form`, `.chat-apikey-*`, `.chat-send-btn` styles
- `public/js/src/20-chat-controller.js` (modify) — add popover toggle, auto-grow, send-button state
- `test/unit/server/views/chat.test.ts` (modify) — update form structure assertions

## Out of Scope

- Layout grid structure (CHAUIOVE-002)
- Turn rendering changes (CHAUIOVE-004 through CHAUIOVE-006)
- Sidebar changes (CHAUIOVE-007 through CHAUIOVE-009)
- Submit logic changes (`submitTurn()` function body unchanged)
- Progress polling changes (existing `loadingSession` pattern unchanged)

## Acceptance Criteria

### Tests That Must Pass

1. Template renders `#chat-turn-form` inside `.chat-input-bar` with lock icon button and popover
2. `#chat-api-key` input exists inside `#chat-apikey-popover`
3. `#chat-message` textarea has `rows="1"` and `maxlength="2000"`
4. `#chat-send-button` exists as a submit button
5. Existing suite: `npm test` — no regressions
6. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Element IDs `chat-api-key`, `chat-message`, `chat-send-button`, `chat-turn-form`, `chat-loading-indicator`, `chat-progress-status` preserved
2. Enter-to-send and Shift+Enter-for-newline behavior unchanged
3. API key stored/retrieved from session storage as before
4. `submitTurn()` function logic unchanged — only the DOM structure around it changes

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: form is inside `.chat-input-bar`, contains popover structure
2. `test/unit/server/views/chat.test.ts` — add: lock icon button exists with correct ID

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
