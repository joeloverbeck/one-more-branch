# CHATUIFIX-001: Enlarge chat message textarea

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The message textarea on the chat page (`/chat`) is too small for comfortable message composition. It has `rows="1"` and `min-height: 46px`, appearing as a single cramped line next to the API key button and Send button. Users need more vertical space to compose multi-line messages with action descriptions and speech.

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs:947-954` — textarea has `rows="1"` and `maxlength="2000"`. Confirmed.
2. `public/css/styles.css:1157-1159` — `.chat-input-form__message textarea` has `min-height: 46px; max-height: 168px; resize: none`. Confirmed.
3. The grid layout uses `grid-template-columns: auto minmax(0, 1fr) auto` on `.chat-input-form__composer`, giving the textarea the flexible middle column. No mismatch.

## Architecture Check

1. Minimal CSS + HTML attribute change. No new components, no JS changes. The simplest possible fix for the problem.
2. No backwards-compatibility shims needed.

## What to Change

### 1. Increase textarea rows attribute

In `src/server/views/pages/chat.ejs`, change `rows="1"` to `rows="3"` on the `#chat-message` textarea (line ~950).

### 2. Increase minimum height in CSS

In `public/css/styles.css`, change `.chat-input-form__message textarea` `min-height` from `46px` to `96px`.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)

## Out of Scope

- Auto-resize textarea via JS (can be a follow-up enhancement)
- Character counter display
- Markdown preview

## Acceptance Criteria

### Tests That Must Pass

1. The textarea renders with `rows="3"` attribute
2. The textarea has adequate visible height (~96px minimum) on page load
3. Existing suite: `npm test`

### Invariants

1. The textarea must not exceed `max-height: 168px` (prevents input bar from dominating the viewport)
2. The grid layout of API key / textarea / Send button must remain properly aligned

## Test Plan

### New/Modified Tests

1. No new test files needed — this is a CSS/HTML-only change

### Commands

1. `npm run build` — verify build succeeds
2. `npm run lint` — verify lint passes
3. `npm test` — verify existing tests pass
4. Manual: visit `/chat` and verify textarea is visibly larger
