# CHAUIOVE-002: Full-viewport CSS grid layout for chat page

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (can be done in parallel with CHAUIOVE-001)

## Problem

The current chat page uses a vertical-scroll layout where the message input ("Send Turn") sits at the bottom of a long page, separated from the conversation by the Scene State section. Users must scroll past all state info to type their next message. This ticket replaces the layout with a full-viewport CSS grid: header bar, scrollable conversation pane, collapsible sidebar, and pinned input bar.

## Assumption Reassessment (2026-03-28)

1. Current layout uses `container`, `hero`, `form-section`, `stories-grid`, and `story-card` classes in `src/server/views/pages/chat.ejs` — confirmed.
2. Chat page behavior is split between `src/server/views/pages/chat.ejs`, `public/css/styles.css`, and `public/js/src/20-chat-controller.js` — confirmed.
3. There are already both server-rendered template tests (`test/unit/server/views/chat.test.ts`) and client controller tests (`test/unit/client/chat-page/controller.test.ts`) covering this page. Sidebar toggle behavior belongs in the client suite, not only the view suite.
4. `GET /chat/:chatId` already passes `session`, `turns`, and `chatUiBootstrap`; this ticket does not need route/service changes.
5. `body` overflow cannot be controlled from `#chat-page` alone. If page-level scrolling must be disabled only for this page, the template needs a chat-page-specific class on `<body>`.

## Architecture Check

1. Chat-specific CSS classes (prefixed `chat-`) avoid polluting global styles. The grid layout is scoped to `#chat-page`.
2. The `partials/header` can remain as the site header. The spec's "Header Bar" is a chat-specific zone below the site header containing character names and scene badges.
3. No backwards-compatibility shims or alias classes. The chat page should move to a dedicated layout vocabulary instead of mixing `story-card` / `stories-grid` with chat-specific structure.
4. The cleanest durable shape is:
   - Server template owns semantic layout zones and stable `data-chat-*` hooks.
   - CSS owns viewport/grid behavior.
   - Client controller owns only interaction/state updates (for this ticket: sidebar collapse/expand).
5. This ticket should stay layout-focused. It should not start embedding future accordion or turn-detail abstractions prematurely.

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

Notes:
- Preserve existing `data-chat-id`, `data-target-character-name`, and `data-interlocutor-character-name` attributes on `#chat-page`.
- Preserve existing `data-chat-turn`, `data-chat-speaker`, `data-turn-number`, and `data-chat-field` hooks so current controller behavior keeps working.
- Add a chat-page-specific class on `<body>` so page-level overflow can be disabled without affecting other pages.

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

When on the chat page, `body` needs `overflow: hidden` to prevent page-level scrolling. Add a chat-page-specific body class in the template; do not rely on `#chat-page` for body scrolling behavior.

### 5. Client JS: sidebar toggle

Add a small handler in `20-chat-controller.js` for the sidebar toggle button that adds/removes `sidebar-collapsed` class on `.chat-layout`.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — restructure to grid layout
- `public/css/styles.css` (modify) — add `.chat-layout`, `.chat-header`, `.chat-conversation`, `.chat-sidebar`, `.chat-input-bar` classes
- `public/js/src/20-chat-controller.js` (modify) — add sidebar toggle handler
- `test/unit/server/views/chat.test.ts` (modify) — update assertions for new HTML structure/body class/header hooks
- `test/unit/client/chat-page/controller.test.ts` (modify) — verify sidebar toggle behavior and guard existing rendering/update behavior

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
3. The conversation zone renders as the dedicated `.chat-conversation` container; CSS assigns `overflow-y: auto`
4. Sidebar toggle button adds/removes `sidebar-collapsed` class on the layout root
5. Existing suite: `npm test` — no regressions
6. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. All existing `data-chat-*` attributes preserved for client JS compatibility
2. Turn rendering still works (existing `buildTurnHtml` in `20-chat-controller.js` still appends correctly)
3. `partials/header` and `partials/footer` inclusion unchanged
4. No page-level scrollbar when chat page is loaded (via chat-page-specific body class)
5. No route/service payload changes in this ticket

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: template renders with `.chat-layout`, `.chat-conversation`, `.chat-sidebar`, `.chat-input-bar`, and chat-page body class
2. `test/unit/server/views/chat.test.ts` — add: header bar renders character names, turn count, scene badges, and sidebar toggle hook
3. `test/unit/client/chat-page/controller.test.ts` — add: sidebar toggle button adds/removes `sidebar-collapsed` on `#chat-page`
4. `test/unit/client/chat-page/controller.test.ts` — keep coverage that turn rendering and sidebar field updates still work after layout restructure

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
4. `npm run typecheck`

## Outcome

- Completion date: 2026-03-28
- What changed:
  - Replaced the chat page's long-form stacked layout with a dedicated `chat-layout` viewport grid in `chat.ejs`.
  - Added chat-scoped layout styling in `public/css/styles.css`, including a body class for chat-only overflow control and a responsive fallback for narrower screens.
  - Added sidebar collapse/expand behavior in `public/js/src/20-chat-controller.js`.
  - Strengthened chat tests across the server view and client controller suites, including duplicate `data-chat-field` updates and turn-count updates.
- Deviations from original plan:
  - No route or service changes were needed.
  - Sidebar toggle verification landed in the client controller suite rather than the server view suite because the behavior is JS-owned.
  - `data-chat-field` updates were generalized to update all matching nodes so header badges and sidebar fields stay synchronized cleanly without alias hooks.
- Verification:
  - `node scripts/concat-client-js.js`
  - `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts`
  - `npm run test:unit -- --runTestsByPath test/unit/client/chat-page/controller.test.ts`
  - `npm run test:client`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
