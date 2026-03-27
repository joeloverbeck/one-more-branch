# CHACHASYS-015: Header Integration and Prompt Documentation

**Status**: COMPLETED
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
4. Prompt-doc ownership for chat-stage markdown still belongs here, but the scope must follow the codebase as implemented, not the earlier rollout sketch.
5. The chat stack is more complete than the original ticket assumed: `chat-bible`, `chat-planner`, `chat-writer`, `chat-state-updater`, and `chat-summary` prompt builders, schemas, generation stages, and pipeline orchestration already exist in `src/llm/chat/`, `src/llm/prompts/chat/`, and `src/llm/schemas/`.
6. Only one chat prompt doc already exists in `prompts/`: `chat-turn-writer-prompt.md`. The other implemented chat stages are undocumented in `prompts/`.
7. `src/server/routes/index.ts` already sets `res.locals.currentPath = _req.path` before mounting `/chat`, so the shared header can detect `/chat` routes without any `src/server/routes/chat.ts` changes.

## Architecture Check

1. Header link visibility and active-state behavior are a simple `header.ejs` change because `currentPath` already flows through `res.locals`. Changing `chat.ts` would duplicate an existing cross-app contract and make the architecture less clean.
2. Prompt docs should mirror the implemented chat prompt builders and schemas exactly. The robust architecture is code-first docs backed by tests, not speculative docs that drift from production.
3. This ticket is the right place to restore prompt/code documentation parity after the chat-stage implementations landed. Centralizing the markdown work here remains cleaner than scattering prompt-doc edits across multiple stage tickets.
4. The implementation should strengthen the existing prompt-doc alignment test so newly documented chat stages stay tied to their source files over time.
5. No backwards-compatibility shim or aliasing is needed. The clean path is to expose `/chat` in the existing Characters navigation and document the actual stage boundaries already enforced by the pipeline.

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
Note: derive the document from the implemented source files:
- `src/llm/prompts/chat/chat-bible-prompt.ts`
- `src/llm/schemas/chat-bible-schema.ts`
- `src/llm/chat/chat-bible-generation.ts`

### 3. Create `prompts/chat-turn-planner-prompt.md`

Document the Turn Planner prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented planner chat-stage source, not from earlier ticket text.

### 4. Keep `prompts/chat-turn-writer-prompt.md` aligned with source

Do not rewrite the existing Turn Writer doc unless alignment issues are discovered during this pass. Treat it as the format reference for the new chat prompt docs and keep it anchored to the implemented writer source.

### 5. Create `prompts/chat-state-updater-prompt.md`

Document the Chat State Updater prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented state-updater chat-stage source, not from earlier ticket text.

### 6. Create `prompts/chat-summarizer-prompt.md`

Document the Rolling Summary prompt: purpose, system prompt, user sections, output schema, constraints.
Note: derive from the implemented summarizer chat-stage source, not from earlier ticket text.

### 7. Extend prompt-doc and header tests

- Update the prompt-doc alignment suite so the four newly documented chat stages are required to stay mapped to their production source files.
- Strengthen existing header-partial coverage to assert the `/chat` navigation entry is present in the Characters dropdown and that the dropdown-level active-state expression includes `/chat`.

## Files to Touch

- `src/server/views/partials/header.ejs` (modify)
- `prompts/chat-bible-curator-prompt.md` (new)
- `prompts/chat-turn-planner-prompt.md` (new)
- `prompts/chat-state-updater-prompt.md` (new)
- `prompts/chat-summarizer-prompt.md` (new)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `test/unit/server/views/partials.test.ts` (modify)

## Out of Scope

- CSS changes
- Service, route, or business-logic changes in the chat flow
- LLM schema or generation changes
- Any modification to existing prompt documentation
- Re-specifying prompt behavior that conflicts with implemented source; docs should mirror the codebase as built

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: header partial includes the new `/chat` dropdown entry and `/chat` active-state expression
2. Unit test: prompt-doc alignment requires docs for all implemented chat prompt stages touched by this ticket
3. Existing relevant suites covering chat prompt builders, chat routes, and view partials continue to pass
4. `npm run lint` passes
5. `npm run typecheck` passes

### Invariants

1. Existing header links and dropdown behavior unchanged
2. Prompt docs follow existing format in `prompts/` directory
3. No chat route, service, schema, or generation behavior changes are introduced by this ticket
4. Header active state detection works for all `/chat/*` paths

## Test Plan

### New/Modified Tests

1. Extend `test/unit/server/views/partials.test.ts` to assert the Characters dropdown includes `/chat` and its active-state expression
2. Extend `test/unit/llm/prompt-doc-alignment.test.ts` to require docs for `chatBible`, `chatPlanner`, `chatStateUpdater`, and `chatSummarizer`
3. Run the existing chat prompt-builder tests to ensure the new docs reflect the real prompt structure they describe

### Commands

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:unit -- --runInBand test/unit/server/views/partials.test.ts test/unit/llm/prompt-doc-alignment.test.ts test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts test/unit/llm/prompts/chat/chat-summary-prompt.test.ts test/unit/server/routes/chat.test.ts`

## Outcome

- Completion date: 2026-03-27
- What actually changed:
  - Added `Chat with Character` to the Characters header dropdown and extended the dropdown/item active-state logic to cover `/chat/*`.
  - Added prompt docs for the implemented `chatBible`, `chatPlanner`, `chatStateUpdater`, and `chatSummarizer` stages.
  - Extended prompt-doc alignment coverage and header partial coverage so the new docs and nav entry are enforced by tests.
- Deviations from the original plan:
  - Did not modify `src/server/routes/chat.ts` because the ticket assumption was wrong; `res.locals.currentPath` is already supplied centrally by `src/server/routes/index.ts`.
  - Did not create or rewrite `prompts/chat-turn-writer-prompt.md` because it already existed and remained aligned.
  - Verification used the full unit suite triggered by the existing `npm run test:unit` wrapper, which is stricter than the initially scoped targeted run.
- Verification results:
  - `npm run test:unit -- --runInBand test/unit/server/views/partials.test.ts test/unit/llm/prompt-doc-alignment.test.ts test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts test/unit/llm/prompts/chat/chat-summary-prompt.test.ts test/unit/server/routes/chat.test.ts` -> passed (the wrapper executed the full unit suite: 333 suites / 3731 tests passed)
  - `npm run typecheck` -> passed
  - `npm run lint` -> passed
