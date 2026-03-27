# CHACHASYS-014: Chat Client-Side JavaScript

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-013 (EJS templates with DOM structure)

## Problem

The chat UI needs client-side JavaScript for: the chat conversation controller (send messages, render responses, manage loading state), the setup form controller (character dropdowns, validation), and the chat list controller (delete confirmations). These follow the existing numbered source file pattern in `public/js/src/`.

## Assumption Reassessment (2026-03-27)

1. `public/js/src/` contains numbered source files (01-10) concatenated into `public/js/app.js`.
2. `scripts/concat-client-js.js` concatenates all `src/*.js` files alphabetically.
3. Existing controllers use IIFE patterns and attach to `window` or use DOM-ready checks.
4. API key is managed via session storage (existing pattern from story creation).

## Architecture Check

1. Files numbered 20-22 to sort after existing files (highest current is 10).
2. Pure vanilla JS — no frameworks (matching existing pattern).
3. After creating files, must run `node scripts/concat-client-js.js` to regenerate `app.js`.

## What to Change

### 1. Create `public/js/src/20-chat-controller.js`

Chat conversation page controller:
- Initialize on pages with `[data-chat-id]` container
- Text input with send button (Enter key to send, Shift+Enter for newline)
- On send: POST to `/chat/:chatId/turn` with message + apiKey
- Display loading indicator ("Character is thinking...")
- Poll progress endpoint for stage updates during loading
- On response: render character turn blocks (ACTION in italics, SPEECH in quotes with delivery tags)
- Render user turn blocks (same format, different visual style)
- Auto-scroll to newest message
- Parse user input for preview: `*asterisks*` → italics, rest → normal text
- Update sidebar: physical context, relationship state from response data

### 2. Create `public/js/src/21-chat-new-controller.js`

Chat setup form controller:
- Initialize on pages with `[data-chat-new-form]` container
- Fetch characters from `/characters/api/list` on load
- Populate target and interlocutor dropdowns
- Validate: two different characters selected
- Validate: required fields not empty (location, time of day, character activity, lead-in summary, why now)
- Auto-populate API key from session storage
- Prevent double-submit

### 3. Create `public/js/src/22-chat-list-controller.js`

Chat list page controller:
- Initialize on pages with `[data-chat-list]` container
- Delete button: confirm dialog before DELETE request
- Handle delete response (remove row or redirect)

### 4. Regenerate `app.js`

Run `node scripts/concat-client-js.js` after creating all source files.

## Files to Touch

- `public/js/src/20-chat-controller.js` (new)
- `public/js/src/21-chat-new-controller.js` (new)
- `public/js/src/22-chat-list-controller.js` (new)
- `public/js/app.js` (regenerated — never edit directly)

## Out of Scope

- EJS templates (CHACHASYS-013)
- Server routes (CHACHASYS-012)
- CSS styling
- Server-side input parser (CHACHASYS-003)
- Modifying existing JS source files (01-10)

## Acceptance Criteria

### Tests That Must Pass

1. Client test: chat controller sends POST with message and apiKey
2. Client test: chat controller renders ACTION blocks in italics
3. Client test: chat controller renders SPEECH blocks with delivery tags
4. Client test: chat controller auto-scrolls to newest message
5. Client test: setup form validates different characters selected
6. Client test: setup form validates required fields
7. Client test: list controller sends DELETE request with confirmation
8. `npm run test:client` passes (tests run against generated app.js)
9. Existing suite: `npm test` passes

### Invariants

1. `app.js` is never edited directly — only regenerated
2. API key read from session storage, never from DOM/HTML
3. Controllers only activate on their respective pages (data attribute check)
4. No global namespace pollution (IIFE pattern)
5. All fetch calls include proper error handling

## Test Plan

### New/Modified Tests

1. `test/unit/client/chat-controller.test.js` — chat page controller behavior
2. `test/unit/client/chat-new-controller.test.js` — setup form validation
3. `test/unit/client/chat-list-controller.test.js` — list page behavior

### Commands

1. `node scripts/concat-client-js.js`
2. `npm run test:client`
3. `npm test`
