# CHATUIFIX-002: Global dark scrollbar styling for chat page

**Status**: COMPLETED
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
5. `src/server/views/pages/chat.ejs` — the chat page currently exposes two primary scroll containers: `.chat-conversation` and `.chat-sidebar`. Confirmed.
6. `src/server/views/pages/chat.ejs` — the chat page does not render `.insights-body` or `.recap-body`; those belong to the play page. The original ticket scope incorrectly treated them as chat-page scroll areas.

## Architecture Check

1. A blanket rule on `body.chat-page-body *` is too broad. It would style every descendant scrollbar on the chat page, including any future embedded components, nested overflow containers, and third-party widgets. That is not a robust long-term contract.
2. The cleaner architecture for this ticket is to style the actual chat scroll containers explicitly: `.chat-conversation` and `.chat-sidebar`.
3. Existing per-widget scrollbar rules on the play page (`.sidebar-widgets`, `.left-sidebar-widgets`, `.insights-body`, `.recap-body`) should remain untouched. They represent separate page-level concerns and should not be coupled to chat-page styling through a global descendant rule.
4. Longer-term ideal architecture: introduce a reusable utility class for dark thin scrollbars and apply it intentionally in templates. That is a broader cleanup/refactor and is out of scope for this ticket.

## What to Change

### 1. Add shared scrollbar styling for chat scroll containers

In `public/css/styles.css`, add scrollbar rules targeting `.chat-conversation` and `.chat-sidebar` together:

```css
.chat-conversation,
.chat-sidebar {
  scrollbar-width: thin;
  scrollbar-color: rgba(39, 64, 111, 0.5) transparent;
}

.chat-conversation::-webkit-scrollbar,
.chat-sidebar::-webkit-scrollbar {
  width: 6px;
}

.chat-conversation::-webkit-scrollbar-track,
.chat-sidebar::-webkit-scrollbar-track {
  background: rgba(14, 24, 49, 0.3);
  border-radius: 3px;
}

.chat-conversation::-webkit-scrollbar-thumb,
.chat-sidebar::-webkit-scrollbar-thumb {
  background: rgba(39, 64, 111, 0.5);
  border-radius: 3px;
}

.chat-conversation::-webkit-scrollbar-thumb:hover,
.chat-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(39, 64, 111, 0.8);
}
```

Place this near the existing `.chat-conversation` / `.chat-sidebar` rules so the ownership stays local to the chat layout styles.

### 2. Add a stylesheet regression test

Strengthen `test/unit/server/public/css.test.ts` so the suite asserts that the chat stylesheet includes explicit thin dark scrollbar rules for `.chat-conversation` and `.chat-sidebar`.

## Files to Touch

- `public/css/styles.css` (modify)
- `test/unit/server/public/css.test.ts` (modify)

## Out of Scope

- Scrollbar styling on non-chat pages (play page, home, etc.)
- Refactoring all scrollbar styling into a reusable utility class
- Custom scrollbar colors per container
- Horizontal scrollbar styling (none needed)

## Acceptance Criteria

### Tests That Must Pass

1. The two chat-page scroll containers, `.chat-conversation` and `.chat-sidebar`, display thin dark scrollbars instead of browser defaults
2. Non-chat scrollbar rules remain unchanged
3. Relevant automated tests and lint pass

### Invariants

1. Scrollbar behavior (scroll position, scroll amount) must not change — only visual appearance
2. Non-chat pages must not be affected

## Test Plan

### New/Modified Tests

1. Modify `test/unit/server/public/css.test.ts` to assert explicit chat scrollbar coverage for both `.chat-conversation` and `.chat-sidebar`

### Commands

1. `npm run build` — verify build succeeds
2. `npm run lint` — verify lint passes
3. `npm run test:unit -- --coverage=false test/unit/server/public/css.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts` — verify chat-page CSS/template/controller invariants
4. Manual: visit `/chat`, scroll the conversation area and sidebar, verify dark thin scrollbars appear

## Outcome

- Completed on 2026-03-28
- Added explicit thin dark scrollbar styling for `.chat-conversation` and `.chat-sidebar`
- Added a stylesheet regression test covering the chat scrollbar selectors
- Corrected the original plan: did not use a global `body.chat-page-body *` rule because it was broader than the actual ownership boundary and would have coupled future nested scroll containers to chat-page styling
- Verification:
  - `npm run test:unit -- --coverage=false test/unit/server/public/css.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts` (passed; due to the repo script shape this exercised the full unit suite)
  - `npm run lint` (passed)
  - `npm run build` (passed)
