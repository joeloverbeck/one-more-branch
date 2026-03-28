# CHAUIOVE-012: Remove chat header subtitle line

**Status**: COMPLETED
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The chat header contains the subtitle "A resumable exchange grounded in the current scene state." which adds no value — users already know what a chat is. It wastes vertical space in the header.

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs:381` contains `<p class="chat-header__summary">A resumable exchange grounded in the current scene state.</p>` — confirmed present.
2. `public/css/styles.css:476` contains a standalone `.chat-header__summary` rule used only for that subtitle — confirmed present and safe to remove with the element.
3. `test/unit/server/views/chat.test.ts` does not currently assert on the subtitle text or `.chat-header__summary`; coverage must be added rather than removed.
4. The subtitle is server-rendered markup only. It is not referenced by client-side chat controllers, route handlers, or bootstrap data.

## Architecture Check

1. This is a presentation-only simplification. Removing the subtitle reduces redundant copy and vertical noise without changing chat behavior, data flow, or API contracts.
2. The current architecture is better served by keeping the header focused on durable, information-dense elements: eyebrow, title, badges, and scene-state toggle. The subtitle adds copy debt without introducing a reusable view primitive.
3. No backwards-compatibility shims, aliases, or fallback selectors are warranted.

## What to Change

### 1. Remove subtitle from EJS template

Delete the `<p class="chat-header__summary">` line from `src/server/views/pages/chat.ejs`.

### 2. Remove CSS rule

Delete the standalone `.chat-header__summary` rule from `public/css/styles.css`.

### 3. Update view tests

Add a server-view assertion in `test/unit/server/views/chat.test.ts` proving the rendered header does not include the subtitle text or `.chat-header__summary` element.

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
3. Existing chat view tests still verify the rest of the header and conversation shell render correctly
4. Relevant verification: targeted chat view test, lint, typecheck, and full test suite pass

### Invariants

1. Header still displays eyebrow, character names, badges, and toggle button
2. No orphaned CSS selectors referencing `.chat-header__summary`

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add negative coverage for subtitle text and `.chat-header__summary` while retaining existing header shell assertions

### Commands

1. `npx jest test/unit/server/views/chat.test.ts`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completed on 2026-03-28.
- Removed the redundant chat header subtitle from `src/server/views/pages/chat.ejs`.
- Removed the now-unused `.chat-header__summary` selector from `public/css/styles.css`.
- Added explicit server-view coverage in `test/unit/server/views/chat.test.ts` to prevent the subtitle text and selector from returning.
- The original plan assumed an existing subtitle assertion would need to be removed; in practice, the correct change was to add missing negative coverage.
- Verification passed: `npx jest test/unit/server/views/chat.test.ts`, `npm run lint`, `npm run typecheck`, and `npm test`.
