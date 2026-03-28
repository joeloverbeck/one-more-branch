# CHAUIOVE-012: Remove chat header subtitle line

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The chat header contains the subtitle "A resumable exchange grounded in the current scene state." which adds no value — users already know what a chat is. It wastes vertical space in the header.

## Assumption Reassessment (2026-03-28)

1. `chat.ejs:381` contains `<p class="chat-header__summary">A resumable exchange grounded in the current scene state.</p>` — confirmed present.
2. `public/css/styles.css` contains `.chat-header__summary` styling — to be confirmed at implementation time.
3. `test/unit/server/views/chat.test.ts` may assert on this text — must be checked and updated.

## Architecture Check

1. Pure deletion of a presentation-only element. No logic, data flow, or API contracts affected.
2. No backwards-compatibility shims needed.

## What to Change

### 1. Remove subtitle from EJS template

Delete the `<p class="chat-header__summary">` line at `chat.ejs:381`.

### 2. Remove CSS rule

Delete the `.chat-header__summary` rule from `public/css/styles.css` (if it exists as a standalone rule).

### 3. Update view tests

Remove any assertions in `test/unit/server/views/chat.test.ts` that check for the subtitle text or the `.chat-header__summary` element.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `test/unit/server/views/chat.test.ts` (modify)

## Out of Scope

- Header layout reorganization (CHAUIOVE-013)
- Any other header content changes

## Acceptance Criteria

### Tests That Must Pass

1. Chat view renders without the subtitle text
2. No `.chat-header__summary` element present in rendered output
3. Existing suite: `npm test`

### Invariants

1. Header still displays eyebrow, character names, badges, and toggle button
2. No orphaned CSS selectors referencing `.chat-header__summary`

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — remove/update subtitle assertion

### Commands

1. `npx jest test/unit/server/views/chat.test.ts`
2. `npm run lint && npm run typecheck && npm test`
