# CHATUIFIX-002: Global dark scrollbar styling for chat page

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

The main scrollable areas on the chat page (`.chat-conversation`, `.chat-sidebar`) use default browser scrollbars that visually clash with the dark theme. Other areas (`.sidebar-widgets`, `.insights-body`, `.recap-body`) already have custom thin dark scrollbars using `scrollbar-color: rgba(39, 64, 111, 0.5) transparent`. The inconsistency is jarring.

## Assumption Reassessment (2026-03-28)

1. `public/css/styles.css:525` — `.chat-conversation` has `overflow-y: auto` with no custom scrollbar styling. Confirmed.
2. `public/css/styles.css:1665-1686` — `.sidebar-widgets` has custom scrollbar styling (`scrollbar-width: thin; scrollbar-color: rgba(39, 64, 111, 0.5) transparent` + webkit prefixes). Confirmed as existing pattern.
3. `public/css/styles.css:1693-1718` — `.left-sidebar-widgets` has identical custom scrollbar styling. Confirmed.
4. `public/css/styles.css:397-399` — `body.chat-page-body` exists with `height: 100vh; overflow: hidden;`. Confirmed as the global chat page selector.

## Architecture Check

1. A single global rule on `body.chat-page-body` covers all current and future scrollable areas on the chat page. This is cleaner than adding per-element rules and avoids the existing pattern of duplicating scrollbar CSS across multiple selectors.
2. Existing per-widget scrollbar rules (`.sidebar-widgets`, `.left-sidebar-widgets`, `.insights-body`, `.recap-body`) can optionally be removed since the global rule covers them, but can also be left in place without harm (they'll simply be redundant).

## What to Change

### 1. Add global scrollbar styling for chat page

In `public/css/styles.css`, add scrollbar rules targeting `body.chat-page-body` and all its descendants:

```css
body.chat-page-body,
body.chat-page-body * {
  scrollbar-width: thin;
  scrollbar-color: rgba(39, 64, 111, 0.5) transparent;
}

body.chat-page-body ::-webkit-scrollbar {
  width: 6px;
}

body.chat-page-body ::-webkit-scrollbar-track {
  background: transparent;
}

body.chat-page-body ::-webkit-scrollbar-thumb {
  background: rgba(39, 64, 111, 0.5);
  border-radius: 3px;
}

body.chat-page-body ::-webkit-scrollbar-thumb:hover {
  background: rgba(39, 64, 111, 0.7);
}
```

Place this near the existing `body.chat-page-body` rules (around line 397-402).

### 2. (Optional) Remove redundant per-widget scrollbar rules

The following selectors now have redundant scrollbar styling that could be removed to reduce CSS duplication:
- `.sidebar-widgets` (lines 1665-1686)
- `.left-sidebar-widgets` (lines 1700-1718)
- `.insights-body` (lines 3391-3409)
- `.recap-body` (lines 3453-3471)

However, leaving them is harmless. Removal is a cleanup preference, not a requirement.

## Files to Touch

- `public/css/styles.css` (modify)

## Out of Scope

- Scrollbar styling on non-chat pages (play page, home, etc.)
- Custom scrollbar colors per container
- Horizontal scrollbar styling (none needed)

## Acceptance Criteria

### Tests That Must Pass

1. All scrollable areas on the chat page (conversation, sidebar, modals) display thin dark scrollbars instead of browser defaults
2. Existing suite: `npm test`

### Invariants

1. Scrollbar behavior (scroll position, scroll amount) must not change — only visual appearance
2. Non-chat pages must not be affected

## Test Plan

### New/Modified Tests

1. No new test files needed — this is a CSS-only change

### Commands

1. `npm run build` — verify build succeeds
2. `npm run lint` — verify lint passes
3. `npm test` — verify existing tests pass
4. Manual: visit `/chat`, scroll the conversation area and sidebar, verify dark thin scrollbars appear
