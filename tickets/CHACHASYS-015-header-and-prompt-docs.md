# CHACHASYS-015: Header Integration and Prompt Documentation

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: CHACHASYS-005, CHACHASYS-006, CHACHASYS-007, CHACHASYS-008, CHACHASYS-009, CHACHASYS-012

## Problem

The chat feature needs to be discoverable from the global navigation. The Characters dropdown in the header needs a "Chat with Character" link. Additionally, the 5 new LLM stages need prompt documentation files following the existing format.

## Assumption Reassessment (2026-03-27)

1. `src/server/views/partials/header.ejs` has a Characters dropdown with existing links (Brainstorm Characters, Character Profiles, Character Webs).
2. `prompts/` directory contains existing prompt documentation markdown files.
3. The header uses `nav-dropdown__item` CSS class for dropdown links.
4. Prompt-doc ownership for the new chat stages already lives here. CHACHASYS-005 through CHACHASYS-009 intentionally exclude markdown prompt docs and point here as the follow-up ticket.
5. CHACHASYS-005 is now implemented and archived, so this ticket should document the prompt behavior from the actual source files rather than the earlier speculative sketch.
6. `CHACHASYS-013` is now complete and the chat templates include the shared header partial, but the chat routes in `src/server/routes/chat.ts` currently do not pass `currentPath` into `res.render(...)`. That means `/chat` active-state behavior cannot be achieved by editing `header.ejs` alone.

## Architecture Check

1. Header link visibility is a simple `header.ejs` change, but header active-state correctness for `/chat` requires the route render contract to supply `currentPath`, matching the rest of the app’s header pattern.
2. Prompt docs follow existing format: purpose, system prompt, user sections, output schema, constraints.
3. This ticket is the right place to restore prompt/code documentation parity after the chat-stage implementations land. Keeping docs centralized here is cleaner than duplicating markdown work across each stage ticket.
4. This should run after the stage implementations are stable enough that the docs can mirror real source instead of planned behavior.
5. The clean architecture is to keep header active-state driven by explicit render data rather than introducing implicit hacks inside the partial.

## What to Change

### 1. Modify `src/server/views/partials/header.ejs`

Add to the Characters dropdown menu, after the "Character Webs" link:
```html
<a href="/chat" class="nav-dropdown__item<%= cp === '/chat' || cp.startsWith('/chat') ? ' nav-dropdown__item--active' : '' %>">Chat with Character</a>
```

Also update the dropdown active detection to include `/chat`:
```ejs
<div class="nav-dropdown<%= cp.startsWith('/character') || cp.startsWith('/chat') ? ' nav-dropdown--active' : '' %>">
```

### 1a. Update `src/server/routes/chat.ts`

Pass `currentPath` in the chat page renders so the shared header can correctly highlight `/chat` routes:

- `GET /chat` should render with `currentPath: '/chat'`
- `GET /chat/new` should render with `currentPath: '/chat/new'`
- `GET /chat/:chatId` should render with `currentPath: '/chat'` or the concrete `/chat/:chatId` path, as long as it preserves the `cp.startsWith('/chat')` contract used by the header

### 2. Create `prompts/chat-bible-curator-prompt.md`

Document the Chat Bible Curator prompt: purpose, triggers, system prompt, user sections, output schema, constraints.
Note: derive the document from the implemented source files:
- `src/llm/prompts/chat/chat-bible-prompt.ts`
- `src/llm/schemas/chat-bible-schema.ts`
- `src/llm/chat/chat-bible-generation.ts`

### 3. Create `prompts/chat-turn-planner-prompt.md`

Document the Turn Planner prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented planner chat-stage source, not from earlier ticket text.

### 4. Create `prompts/chat-turn-writer-prompt.md`

Document the Turn Writer prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented writer chat-stage source, not from earlier ticket text.

### 5. Create `prompts/chat-state-updater-prompt.md`

Document the Chat State Updater prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented state-updater chat-stage source, not from earlier ticket text.

### 6. Create `prompts/chat-summarizer-prompt.md`

Document the Rolling Summary prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented summarizer chat-stage source, not from earlier ticket text.

## Files to Touch

- `src/server/views/partials/header.ejs` (modify)
- `src/server/routes/chat.ts` (modify)
- `prompts/chat-bible-curator-prompt.md` (new)
- `prompts/chat-turn-planner-prompt.md` (new)
- `prompts/chat-turn-writer-prompt.md` (new)
- `prompts/chat-state-updater-prompt.md` (new)
- `prompts/chat-summarizer-prompt.md` (new)

## Out of Scope

- CSS changes
- Service or business-logic changes outside the minimal `currentPath` render contract needed for header active state
- LLM schema or generation changes
- Any modification to existing prompt documentation
- Re-specifying prompt behavior that conflicts with implemented source; docs should mirror the codebase as built

## Acceptance Criteria

### Tests That Must Pass

1. E2E test: header renders "Chat with Character" link in Characters dropdown
2. E2E test: link navigates to `/chat`
3. E2E test: header dropdown shows active state when on `/chat` pages
4. Existing suite: `npm test` passes

### Invariants

1. Existing header links and dropdown behavior unchanged
2. Prompt docs follow existing format in `prompts/` directory
3. Any route changes in this ticket are limited to supplying `currentPath` for shared-header rendering; no chat business logic changes
4. Header active state detection works for all `/chat/*` paths

## Test Plan

### New/Modified Tests

1. Verify header rendering in existing E2E tests still passes
2. Manual verification: navigate to `/chat` and confirm header link is active

### Commands

1. `npm run typecheck`
2. `npm test`
