# CHACHASYS-013: Chat EJS View Templates

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-012 (routes provide render data)

## Problem

The chat feature needs 3 EJS view templates: a chat list page, a chat setup form, and the chat conversation page. These follow existing view patterns and use the shared layout/header partials.

## Assumption Reassessment (2026-03-27)

1. `src/server/views/pages/` contains existing EJS templates (play.ejs, home.ejs, etc.).
2. Templates use `<%- include('../partials/header') %>` for shared header.
3. Templates receive data from route handlers via `res.render(template, data)`.
4. CSS is in `public/css/` — existing styles cover common patterns (forms, lists, buttons).

## Architecture Check

1. Follow existing template patterns for consistency.
2. Chat conversation page needs a distinct chat-specific layout (message bubbles, sidebar with context).
3. Setup form uses existing form styling patterns.

## What to Change

### 1. Create `src/server/views/pages/chat-list.ejs`

- Include header partial
- Display list of saved chats (target character name, interlocutor name, turn count, last updated, location)
- Each entry links to `/chat/{chatId}`
- "New Chat" button linking to `/chat/new`
- Delete button per chat (with confirmation)
- Empty state when no chats exist

### 2. Create `src/server/views/pages/chat-new.ejs`

- Include header partial
- Form posting to `POST /chat`
- Character selection dropdowns (populated by client JS from `/characters/api/list`)
- Physical context fields: location (text), micro-location (text), time of day (select with 7 options), privacy (select with 3 options), distance band (select with 5 options), character activity (text), interactable objects (textarea, comma-separated), ambient conditions (textarea, comma-separated)
- Lead-in context fields: lead-in summary (textarea), recent events (textarea, one per line), why now (textarea)
- API key field (from session storage, auto-populated by client JS)
- Submit button

### 3. Create `src/server/views/pages/chat.ejs`

- Include header partial
- Chat conversation area: scrollable message list showing turns with ACTION (italics) and SPEECH (quoted with delivery tags)
- User turns and character turns visually distinct (alignment, color)
- Sidebar: physical context summary (location, time, privacy, distance), relationship state (dynamic, valence bar, tension bar)
- Text input area at bottom with send button
- Loading indicator area (for "Character is thinking..." during pipeline)
- API key hidden input (from session storage)
- Data attributes on container for chatId and session metadata

## Files to Touch

- `src/server/views/pages/chat-list.ejs` (new)
- `src/server/views/pages/chat-new.ejs` (new)
- `src/server/views/pages/chat.ejs` (new)

## Out of Scope

- Client-side JavaScript logic (CHACHASYS-014)
- CSS additions (can be inline or in existing stylesheet — keep minimal)
- Header modification (CHACHASYS-015)
- Route handlers (CHACHASYS-012)
- Chat service (CHACHASYS-011)

## Acceptance Criteria

### Tests That Must Pass

1. E2E test: chat-list page renders without errors when given empty chats array
2. E2E test: chat-list page renders chat entries with correct character names
3. E2E test: chat-new page renders form with all required fields
4. E2E test: chat page renders conversation history with user and character turns
5. E2E test: chat page shows physical context in sidebar
6. Existing suite: `npm test` passes

### Invariants

1. All templates include the shared header partial
2. No API key is rendered in HTML (only populated by client JS from session storage)
3. Templates do not contain inline `<script>` logic — all behavior in client JS files
4. Templates use existing CSS classes where possible
5. Form action URLs match route definitions from CHACHASYS-012

## Test Plan

### New/Modified Tests

1. `test/e2e/chat-flow/chat-views.test.ts` — template rendering tests with mock data

### Commands

1. `npm run test:e2e -- --testPathPattern='chat'`
2. `npm run typecheck`
3. `npm test`
