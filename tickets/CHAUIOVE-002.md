# CHAUIOVE-002: Full-viewport CSS grid layout for chat page

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (can be done in parallel with CHAUIOVE-001)

## Problem

The current chat page uses a vertical-scroll layout where the message input ("Send Turn") sits at the bottom of a long page, separated from the conversation by the Scene State section. Users must scroll past all state info to type their next message. This ticket replaces the layout with a full-viewport CSS grid: header bar, scrollable conversation pane, collapsible sidebar, and pinned input bar.

## Assumption Reassessment (2026-03-28)

1. Current layout uses `container`, `hero`, `form-section`, `stories-grid`, `story-card` classes — confirmed in `chat.ejs`.
2. CSS lives in `public/css/styles.css` — confirmed via glob.
3. The EJS template includes `partials/header` and `partials/footer` — confirmed in `chat.ejs`.
4. No other pages share the chat-specific layout — chat page is standalone.

## Architecture Check

1. Chat-specific CSS classes (prefixed `chat-`) avoid polluting global styles. The grid layout is scoped to `#chat-page`.
2. The `partials/header` can remain as the site header. The spec's "Header Bar" is a chat-specific zone below the site header containing character names and scene badges.
3. No backwards-compatibility shims — old `story-card` / `stories-grid` usage in chat.ejs is fully replaced.

## What to Change

### 1. EJS template restructure (`chat.ejs`)

Replace the current `<main class="container">` content with a CSS grid layout:

```html
<main id="chat-page" class="chat-layout" data-chat-id="..." ...>
  <div class="chat-header">
    <!-- Character names, turn count, scene badges, sidebar toggle -->
  </div>
  <div class="chat-conversation" id="chat-message-list">
    <!-- Scrollable turn list -->
  </div>
  <aside class="chat-sidebar" id="chat-sidebar">
    <!-- Accordion sections (content filled by later tickets) -->
  </aside>
  <div class="chat-input-bar">
    <!-- Input form (redesigned in CHAUIOVE-003, placeholder here) -->
  </div>
</main>
```

### 2. CSS grid layout (`styles.css`)

Add chat-specific classes:

```css
.chat-layout {
  display: grid;
  grid-template-rows: auto 1fr auto;
  grid-template-columns: 1fr 320px;
  grid-template-areas:
    "header  header"
    "convo   sidebar"
    "input   input";
  height: 100vh;
  overflow: hidden;
}
.chat-header    { grid-area: header; }
.chat-conversation { grid-area: convo; overflow-y: auto; }
.chat-sidebar   { grid-area: sidebar; overflow-y: auto; }
.chat-input-bar { grid-area: input; }

/* Sidebar collapsed state */
.chat-layout.sidebar-collapsed {
  grid-template-columns: 1fr 0;
}
.chat-layout.sidebar-collapsed .chat-sidebar {
  display: none;
}
```

### 3. Chat header bar content

Render character names, turn count badge, time-of-day/privacy/distance badges, and sidebar toggle button from existing `session` data already available in the template.

### 4. Body overflow control

When on the chat page, `body` needs `overflow: hidden` to prevent page-level scrolling. Add a conditional class or use the existing `#chat-page` selector.

### 5. Client JS: sidebar toggle

Add a small handler in `20-chat-controller.js` for the sidebar toggle button that adds/removes `sidebar-collapsed` class on `.chat-layout`.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — restructure to grid layout
- `public/css/styles.css` (modify) — add `.chat-layout`, `.chat-header`, `.chat-conversation`, `.chat-sidebar`, `.chat-input-bar` classes
- `public/js/src/20-chat-controller.js` (modify) — add sidebar toggle handler
- `test/unit/server/views/chat.test.ts` (modify) — update assertions for new HTML structure

## Out of Scope

- Turn rendering improvements (CHAUIOVE-004, CHAUIOVE-005, CHAUIOVE-006)
- Sidebar accordion content (CHAUIOVE-007 through CHAUIOVE-009)
- Input bar redesign with API key popover (CHAUIOVE-003)
- Sparkline rendering (CHAUIOVE-011)
- Any server-side route or service changes
- Mobile/responsive breakpoints (can be a follow-up)

## Acceptance Criteria

### Tests That Must Pass

1. Chat page renders without errors with the new grid layout structure
2. `#chat-page` element has `chat-layout` class
3. `.chat-conversation` is a scrollable container (overflow-y: auto)
4. Sidebar toggle button adds/removes `sidebar-collapsed` class
5. Existing suite: `npm test` — no regressions
6. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. All existing `data-chat-*` attributes preserved for client JS compatibility
2. Turn rendering still works (existing `buildTurnHtml` in `20-chat-controller.js` still appends correctly)
3. `partials/header` and `partials/footer` inclusion unchanged
4. No page-level scrollbar when chat page is loaded (body overflow hidden)

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: template renders with `.chat-layout` grid structure
2. `test/unit/server/views/chat.test.ts` — add: sidebar toggle button present in rendered HTML
3. `test/unit/server/views/chat.test.ts` — add: `.chat-header` contains character names and turn count

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
4. `npm run typecheck`
