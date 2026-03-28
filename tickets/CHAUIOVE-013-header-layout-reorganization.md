# CHAUIOVE-013: Header layout reorganization

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-012 (subtitle removal simplifies header structure)

## Problem

The chat header stacks all badges (TURNS, DAWN, SEMI_PRIVATE, INTIMATE) vertically on the right side, which looks wrong. The physical-context badges belong near the character names (they describe the scene), while the turn counter is the only true "meta" badge.

Target layout:

```
IN-CHARACTER CONVERSATION                    0 TURNS
Nahia Lasa and Jokin Lasa
DAWN  SEMI_PRIVATE  INTIMATE         [Hide Scene State]
```

## Assumption Reassessment (2026-03-28)

1. `chat.ejs:377-401` — header structure confirmed: `chat-header__identity` (left) + `chat-header__meta` (right, all badges + toggle).
2. `chat-header__meta` currently holds turn count badge, three context badges, and the sidebar toggle button — all stacked vertically via flex column.
3. Client JS (`20-chat-controller.js`) references `[data-chat-field="timeOfDay"]`, `[data-chat-field="privacy"]`, `[data-chat-field="distanceBand"]` for dynamic updates — these data attributes must be preserved.
4. The sidebar toggle button uses `[data-chat-sidebar-toggle]` — must remain accessible.

## Architecture Check

1. Moving context badges into `chat-header__identity` groups related information together (character + scene context). The turn counter stays in `chat-header__meta` as quantitative metadata. This is a cleaner semantic grouping.
2. No backwards-compatibility shims. The data attributes stay the same; only the DOM parent changes.

## What to Change

### 1. Restructure header HTML in `chat.ejs`

Move the three context badge `<span>` elements (timeOfDay, privacy, distanceBand) from `chat-header__meta` into `chat-header__identity`, below the `<h1>`. Wrap them in a `<div class="chat-header__context-badges">` for styling.

`chat-header__meta` retains only the turn count badge and the sidebar toggle button.

**Before:**
```html
<div class="chat-header__identity">
  <p class="chat-header__eyebrow">In-Character Conversation</p>
  <h1>...</h1>
</div>
<div class="chat-header__meta">
  <span class="chat-badge chat-badge--accent" data-chat-turn-count>0 turns</span>
  <span class="chat-badge" data-chat-field="timeOfDay">DAWN</span>
  <span class="chat-badge" data-chat-field="privacy">SEMI_PRIVATE</span>
  <span class="chat-badge" data-chat-field="distanceBand">INTIMATE</span>
  <button ...>Hide Scene State</button>
</div>
```

**After:**
```html
<div class="chat-header__identity">
  <p class="chat-header__eyebrow">In-Character Conversation</p>
  <h1>...</h1>
  <div class="chat-header__context-badges">
    <span class="chat-badge" data-chat-field="timeOfDay">DAWN</span>
    <span class="chat-badge" data-chat-field="privacy">SEMI_PRIVATE</span>
    <span class="chat-badge" data-chat-field="distanceBand">INTIMATE</span>
  </div>
</div>
<div class="chat-header__meta">
  <span class="chat-badge chat-badge--accent" data-chat-turn-count>0 turns</span>
  <button ...>Hide Scene State</button>
</div>
```

### 2. Update CSS in `styles.css`

- `.chat-header`: Switch to CSS grid or adjust flex to align meta top-right and bottom-right.
- `.chat-header__meta`: Change from vertical stack to `justify-content: space-between` with turn count at top and toggle at bottom (or use flex-column with `gap`).
- `.chat-header__context-badges`: New rule — horizontal flex row with `gap: 0.5rem`, `flex-wrap: wrap`.

### 3. Update view tests

Assertions that check badge positions within `chat-header__meta` need updating to reflect the new parent elements.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (modify — if assertions reference badge parent containers)

## Out of Scope

- Making badges interactive/editable
- Changing badge content or data sources
- Sidebar changes (CHAUIOVE-014)

## Acceptance Criteria

### Tests That Must Pass

1. Turn count badge renders inside `chat-header__meta`, top-right of header
2. Context badges (timeOfDay, privacy, distanceBand) render inside `chat-header__identity`, below character names
3. Sidebar toggle button renders inside `chat-header__meta`
4. Dynamic badge updates via `data-chat-field` attributes still work
5. Existing suite: `npm test`

### Invariants

1. All `data-chat-field` and `data-chat-turn-count` attributes preserved
2. `data-chat-sidebar-toggle` button remains functional
3. Header spans full width of layout grid

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update badge container assertions
2. `test/unit/client/chat-page/controller.test.ts` — verify dynamic badge updates still target correct elements

### Commands

1. `npx jest test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint && npm run typecheck && npm test`
