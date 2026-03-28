# CHAUIOVE-013: Header layout reorganization

**Status**: COMPLETED
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

1. `src/server/views/pages/chat.ejs:377-400` currently renders only two header regions: `chat-header__identity` and `chat-header__meta`.
2. `chat-header__meta` currently contains the turn count badge, the three physical-context badges, and the sidebar toggle button. Styling comes from `.chat-header` and `.chat-header__meta` in `public/css/styles.css:435-480`, with the meta stack aligned to the top-right.
3. Client code does not depend on those badges living inside `chat-header__meta`. `public/js/src/20-chat-controller.js` queries the page root by `[data-chat-turn-count]` and `[data-chat-field="..."]`, while `public/js/src/20b-chat-sidebar.js` updates all matching `[data-chat-field]` nodes globally under `#chat-page`.
4. Existing server view tests do **not** currently verify header badge placement. `test/unit/server/views/chat.test.ts` only checks for attribute/class presence. The ticket therefore needs new placement assertions, not just updated ones.
5. Existing client controller tests do not assert badge parent containers either, but their HTML fixture mirrors the old header DOM and must be updated so the exercised DOM shape matches production.
6. The sidebar toggle button uses `[data-chat-sidebar-toggle]` and must remain in the header meta/control region.

## Architecture Check

1. The current two-region header is too coarse. Character identity, scene context, and session controls are different concerns and should not share the same bucket.
2. The cleanest long-term structure is a three-region header:
   - `chat-header__identity`: conversation label + character names
   - `chat-header__context`: physical-context badges
   - `chat-header__meta`: turn count + sidebar toggle
3. This is more extensible than moving scene badges inside `chat-header__identity`, because future context badges or scene summaries can evolve without coupling non-identity content to the identity block.
4. No backwards-compatibility shims. Preserve the existing `data-chat-field`, `data-chat-turn-count`, and `data-chat-sidebar-toggle` attributes; only the DOM structure and CSS layout change.

## What to Change

### 1. Restructure header HTML in `chat.ejs`

Extract the three context badge `<span>` elements (`timeOfDay`, `privacy`, `distanceBand`) from `chat-header__meta` into a dedicated sibling container immediately after `chat-header__identity`.

Use `<div class="chat-header__context">` as the semantic region and `<div class="chat-header__context-badges">` as the badge row wrapper.

`chat-header__meta` retains only the turn count badge and the sidebar toggle button.

**Before:**
```html
<div class="chat-header__identity">
  <p class="chat-header__eyebrow">In-Character Conversation</p>
  <h1>...</h1>
</div>
<div class="chat-header__meta">
  <span class="chat-badge chat-badge--accent" data-chat-turn-count>0 turns</span>
  <button ...>Hide Scene State</button>
</div>
```

**After:**
```html
<div class="chat-header__identity">
  <p class="chat-header__eyebrow">In-Character Conversation</p>
  <h1>...</h1>
</div>
<div class="chat-header__context">
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

- `.chat-header`: switch from the current flex layout to a small grid with explicit areas so identity/context stay on the left and meta stays on the right.
- `.chat-header__context`: new semantic region occupying the row below identity.
- `.chat-header__meta`: remain a compact vertical control stack aligned to the right.
- `.chat-header__context-badges`: new rule for horizontal, wrapping badge layout with consistent gap.
- Preserve sensible mobile behavior in the existing `@media (max-width: 980px)` rules.

### 3. Update view tests

Add placement assertions to server view tests and update the client controller fixture to match the production DOM.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (modify fixture; add/assert dynamic updates across the moved header badges if needed)

## Out of Scope

- Making badges interactive/editable
- Changing badge content or data sources
- Sidebar changes (CHAUIOVE-014)

## Acceptance Criteria

### Tests That Must Pass

1. Turn count badge renders inside `chat-header__meta`, top-right of header
2. Context badges (`timeOfDay`, `privacy`, `distanceBand`) render inside `chat-header__context`, visually below the character names and left of the meta controls
3. Sidebar toggle button renders inside `chat-header__meta`
4. Dynamic badge updates via `data-chat-field` attributes still work
5. Relevant targeted tests, lint, typecheck, and the full test suite pass

### Invariants

1. All `data-chat-field` and `data-chat-turn-count` attributes preserved
2. `data-chat-sidebar-toggle` button remains functional
3. Header spans full width of layout grid

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add explicit container assertions for `chat-header__context` and `chat-header__meta`
2. `test/unit/client/chat-page/controller.test.ts` — update the DOM fixture and verify moved header badges still receive dynamic updates

### Commands

1. `npx jest test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completion date: 2026-03-28
- Implemented a three-region header architecture: `chat-header__identity`, `chat-header__context`, and `chat-header__meta`
- Moved physical-context badges into the new dedicated context region instead of nesting them under identity
- Updated chat header CSS from a two-bucket flex layout to an explicit grid that keeps scene context near the names while preserving a right-aligned meta/control area
- Added server view coverage for header-region placement and client coverage proving the moved header badges still receive page-wide dynamic updates
- Verification: `npx jest test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`, `npm run lint`, `npm run typecheck`, `npm test`
