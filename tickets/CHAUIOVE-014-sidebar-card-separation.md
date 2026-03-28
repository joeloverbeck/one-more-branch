# CHAUIOVE-014: Sidebar card separation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

The right sidebar contains 7-8 sections (Scene State, Physical Context, Relationship, Knowledge State, Character Mind, Conversation, Guardrails & Constraints, Lead-In) all rendered inside a single scrollable container with minimal visual separation. When scrolling, it's hard to tell where one section ends and another begins, making the information difficult to parse.

## Assumption Reassessment (2026-03-28)

1. `chat.ejs:575-1050` — sidebar is an `<aside id="chat-sidebar">` containing 8 sections: 1 static header (`Scene State`), 6 collapsible `<details>` accordions, and 1 static `Lead-In` section.
2. All sections use `class="chat-sidebar__section"` — confirmed at lines 576, 581, 640, 742, 810, 912, 978, 1019.
3. `public/css/styles.css` — sidebar uses `overflow-y: auto` with `align-content: start`. Sections share the same background as the sidebar container.
4. `public/js/src/20b-chat-sidebar.js` — handles sidebar updates (AJAX refreshes). Must continue to target sections by their existing IDs.

## Architecture Check

1. Each section becomes a visually distinct card by adding a `.chat-sidebar-card` wrapper class. This creates clear visual boundaries without changing the DOM structure or IDs that JS targets. Cards get their own background, border-radius, padding, and subtle shadow — making each section a self-contained visual unit.
2. No backwards-compatibility shims. Existing section IDs and data attributes are unchanged. The card class is additive.

## What to Change

### 1. Add card wrapper class to each sidebar section in `chat.ejs`

Add `chat-sidebar-card` class to each section element:

- `<div class="chat-sidebar__section">` (Scene State header, line 576) → `<div class="chat-sidebar__section chat-sidebar-card">`
- Each `<details class="chat-accordion chat-sidebar__section" ...>` (lines 581, 640, 742, 810, 912, 978) → add `chat-sidebar-card` to class list
- `<section class="chat-sidebar__section" id="chat-lead-in-context">` (line 1019) → add `chat-sidebar-card`

### 2. Update CSS in `styles.css`

Add new `.chat-sidebar-card` rule:
```css
.chat-sidebar-card {
  background: rgba(15, 52, 96, 0.35);
  border: 1px solid rgba(233, 69, 96, 0.08);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
```

Update `.chat-sidebar` container to use `gap` for card spacing:
```css
.chat-sidebar {
  display: grid;
  gap: 0.75rem;
  align-content: start;
}
```

Remove any existing shared background/border from `.chat-sidebar__section` that would conflict with the card styling (avoid double backgrounds).

### 3. Adjust accordion internal spacing

Ensure `.chat-accordion-content` inside cards doesn't add redundant padding that doubles up with the card padding. May need to reduce or zero out internal padding since the card now provides it.

### 4. Update view tests

Add assertions that each sidebar section has the `chat-sidebar-card` class.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `test/unit/server/views/chat.test.ts` (modify)

## Out of Scope

- Changing sidebar width (stays 340px)
- Adding tabs or other navigation
- Changing collapsible behavior (accordions stay as-is)
- Header changes (CHAUIOVE-012, CHAUIOVE-013)

## Acceptance Criteria

### Tests That Must Pass

1. Each sidebar section has the `chat-sidebar-card` class
2. Visual gaps exist between cards (verified by `gap` on parent)
3. Collapsible accordion behavior still works (open/close)
4. Sidebar toggle (show/hide) still works
5. Dynamic sidebar updates via AJAX still target correct section IDs
6. Existing suite: `npm test`

### Invariants

1. All section IDs preserved (`chat-physical-context`, `chat-relationship-state`, `chat-knowledge-state`, `chat-character-mind`, `chat-conversation-state`, `chat-guardrails`, `chat-lead-in-context`)
2. All `data-chat-section` attributes preserved
3. Sidebar scrolling behavior preserved
4. Card styling consistent with existing dark theme

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add card class assertions for each sidebar section

### Commands

1. `npx jest test/unit/server/views/chat.test.ts`
2. `npm run lint && npm run typecheck && npm test`
