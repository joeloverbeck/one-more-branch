# CHACHASYS-015: Header Integration and Prompt Documentation

**Status**: PENDING
**Priority**: LOW
**Effort**: Small
**Engine Changes**: None
**Deps**: CHACHASYS-012 (routes must exist for header link to work)

## Problem

The chat feature needs to be discoverable from the global navigation. The Characters dropdown in the header needs a "Chat with Character" link. Additionally, the 5 new LLM stages need prompt documentation files following the existing format.

## Assumption Reassessment (2026-03-27)

1. `src/server/views/partials/header.ejs` has a Characters dropdown with existing links (Brainstorm Characters, Character Profiles, Character Webs).
2. `prompts/` directory contains existing prompt documentation markdown files.
3. The header uses `nav-dropdown__item` CSS class for dropdown links.

## Architecture Check

1. Header link is a simple `<a>` tag addition — minimal change.
2. Prompt docs follow existing format: purpose, system prompt, user sections, output schema, constraints.
3. This is the final ticket — all functionality should be complete before this.

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

### 2. Create `prompts/chat-bible-curator-prompt.md`

Document the Chat Bible Curator prompt: purpose, triggers, system prompt, user sections, output schema, constraints.

### 3. Create `prompts/chat-turn-planner-prompt.md`

Document the Turn Planner prompt: purpose, system prompt, user sections, output schema, constraints.

### 4. Create `prompts/chat-turn-writer-prompt.md`

Document the Turn Writer prompt: purpose, system prompt, user sections, output schema, constraints.

### 5. Create `prompts/chat-state-updater-prompt.md`

Document the Chat State Updater prompt: purpose, system prompt, user sections, output schema, constraints.

### 6. Create `prompts/chat-summarizer-prompt.md`

Document the Rolling Summary prompt: purpose, system prompt, user sections, output schema, constraints.

## Files to Touch

- `src/server/views/partials/header.ejs` (modify)
- `prompts/chat-bible-curator-prompt.md` (new)
- `prompts/chat-turn-planner-prompt.md` (new)
- `prompts/chat-turn-writer-prompt.md` (new)
- `prompts/chat-state-updater-prompt.md` (new)
- `prompts/chat-summarizer-prompt.md` (new)

## Out of Scope

- Any TypeScript, JavaScript, or server code
- CSS changes
- Route or service changes
- LLM schema or generation changes
- Any modification to existing prompt documentation

## Acceptance Criteria

### Tests That Must Pass

1. E2E test: header renders "Chat with Character" link in Characters dropdown
2. E2E test: link navigates to `/chat`
3. E2E test: header dropdown shows active state when on `/chat` pages
4. Existing suite: `npm test` passes

### Invariants

1. Existing header links and dropdown behavior unchanged
2. Prompt docs follow existing format in `prompts/` directory
3. No functional code changes in this ticket
4. Header active state detection works for all `/chat/*` paths

## Test Plan

### New/Modified Tests

1. Verify header rendering in existing E2E tests still passes
2. Manual verification: navigate to `/chat` and confirm header link is active

### Commands

1. `npm run typecheck`
2. `npm test`
