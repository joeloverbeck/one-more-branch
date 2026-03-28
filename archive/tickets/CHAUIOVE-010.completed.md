# CHAUIOVE-010: Canonicalize chat rolling-summary ownership

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — chat pipeline, models/validation, route/view contracts, prompt formatters
**Deps**: CHAUIOVE-001 (chat bible exposure), CHAUIOVE-008 (conversation sidebar), CHAUIOVE-009 (post-turn integration)

## Problem

The chat stack currently carries rolling-summary data in two different places:

1. `session.rollingSummary`, typed as `RollingSummaryOutput | null`
2. `chatBible.conversationNow.rollingSummary`, typed as `string | null`

That duplication creates an architectural smell:
- UI code must know which representation is canonical for display
- pipeline code must keep two related fields in sync
- future features can drift into reading or writing different sources

This ticket should establish one canonical ownership model for rolling summary data and remove the duplicate representation or reduce it to a deterministic derived projection with one-way ownership.

## Assumption Reassessment (2026-03-28)

1. `ChatSession.rollingSummary` currently stores structured summary data via `RollingSummaryOutput | null` — confirmed in `src/models/chat/chat-session.ts`.
2. `ChatBibleConversationNow.rollingSummary` currently stores a plain string summary for prompts/UI — confirmed in `src/models/chat/chat-bible.ts`.
3. `ChatBibleConversationNow.rollingSummary` is not currently a deterministic projection of `session.rollingSummary`; it is independently authored by chat scene-context generation and then persisted inside `chatBible` — confirmed in `src/llm/chat/chat-scene-context-generation.ts`, `src/llm/schemas/chat-scene-context-schema.ts`, and `src/llm/chat/chat-pipeline.ts`.
4. Planner, writer, state-updater, EJS, and client sidebar code currently consume the summary through `chatBible.conversationNow.rollingSummary`, so the duplicate ownership is embedded across prompt, server-render, and client-render seams — confirmed in `src/llm/prompts/chat/*.ts`, `src/server/views/pages/chat.ejs`, and `public/js/src/20b-chat-sidebar.js`.
5. The cleaner architecture is not to keep a derived mirror string inside `chatBible`, but to remove rolling-summary ownership from `ChatBible` entirely and let prompts/UI consume the canonical session summary through an explicit memory seam.
6. No active ticket currently owns this contract cleanup. `CHAUIOVE-009` is an integration ticket and should consume the canonical contract chosen here rather than inventing aliases.

## Architecture Check

1. One canonical owner is cleaner than parallel fields because every layer can answer a single question: where does rolling-summary truth live?
2. No backwards-compatibility shims or alias fields should be introduced. If a field is redundant, remove it and update all callers/tests to the canonical contract.
3. The preferred direction is to keep the rich structured data canonical in the session domain model and expose it explicitly where needed for prompts or UI. That preserves extensibility without forcing the rest of the system to parse lossy strings back into structure.
4. `ChatBible` should describe current scene state, relationship state, knowledge state, and constraints. Compressed older-memory should live outside that model. Removing `conversationNow.rollingSummary` entirely is cleaner than keeping a derived mirror field.

## What to Change

### 1. Choose and document canonical ownership

Decide the final contract and apply it consistently across models, validation, pipeline code, and route/view usage. The expectation is:
- `session.rollingSummary` remains canonical
- `chatBible.conversationNow.rollingSummary` is removed instead of retained as a second ownership path

### 2. Remove ambiguous duplicate ownership

Update the chat pipeline, chat scene-context schema, and model builders so only one layer owns rolling-summary truth. `ChatBibleConversationNow` and `ChatSceneContext` should no longer contain a rolling-summary field, and no code path should recreate it as a second authored string.

### 3. Update prompt and UI consumers

Adjust prompt formatters, generation contexts, sidebar consumers, and any other readers so they consume session memory explicitly from `session.rollingSummary` without fallback branching or alias logic.

### 4. Tighten tests around the invariant

Add tests that fail if a second rolling-summary ownership path is reintroduced or if prompts/UI stop rendering the canonical session summary.

## Files to Touch

- `src/models/chat/chat-session.ts` (modify) — canonical ownership documentation/types if needed
- `src/models/chat/chat-bible.ts` (modify) — remove rolling-summary from `conversationNow`
- `src/models/chat/chat-scene-context.ts` (modify) — remove rolling-summary from the scene-context conversation contract
- `src/models/chat/chat-validation.ts` (modify) — validation aligned to the canonical contract
- `src/llm/chat/chat-pipeline.ts` (modify) — stop treating both fields as independent state
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify) — consume canonical/derived summary cleanly
- `src/llm/chat/chat-generation-context.ts` (modify if needed) — align summary ownership
- `src/llm/chat/chat-planner-generation.ts` (modify) — pass session memory explicitly
- `src/llm/chat/chat-writer-generation.ts` (modify) — pass session memory explicitly
- `src/llm/chat/chat-state-updater-generation.ts` (modify) — pass session memory explicitly
- `src/llm/prompts/chat/chat-planner-prompt.ts` (modify) — render session memory via a dedicated section
- `src/llm/prompts/chat/chat-writer-prompt.ts` (modify) — render session memory via a dedicated section
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` (modify) — render session memory via a dedicated section
- `src/llm/schemas/chat-scene-context-schema.ts` (modify) — remove rolling-summary from scene-context generation schema
- `src/server/views/pages/chat.ejs` (modify if UI contract changes) — read the canonical/derived field without aliasing
- `public/js/src/20b-chat-sidebar.js` (modify if UI contract changes) — same constraint as above
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify) — verify canonical ownership and non-drift
- `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` (modify) — verify prompt rendering under the new contract
- `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` (modify) — verify planner prompt reads session memory explicitly
- `test/unit/llm/prompts/chat/chat-writer-prompt.test.ts` (modify) — verify writer prompt reads session memory explicitly
- `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` (modify) — verify state-updater prompt reads session memory explicitly
- `test/unit/models/chat/chat-models.test.ts` (modify) — verify model invariants
- `test/unit/server/views/chat.test.ts` (modify if the UI-facing field changes)
- `test/unit/client/chat-page/controller.test.ts` (modify if the UI-facing field changes)

## Out of Scope

- New chat UI features
- Visual redesign of the sidebar
- Non-chat summary systems elsewhere in the app

## Acceptance Criteria

### Tests That Must Pass

1. The chat domain has one documented canonical rolling-summary owner.
2. No route, prompt, or UI consumer depends on `chatBible.conversationNow.rollingSummary` or any other parallel authored summary string.
3. `ChatBibleConversationNow` and `ChatSceneContext.conversationNow` no longer define a rolling-summary field.
4. Existing chat UI/sidebar behavior remains correct after the contract cleanup.
5. Existing suite: `npm test`
6. `npm run lint`

### Invariants

1. Rolling-summary truth has a single owner in the chat domain model.
2. `ChatBible` is not used as a second storage location for compressed chat memory.
3. No alias path such as `updatedChatBible` or duplicate authored summary strings is introduced to preserve legacy callers.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` — prove canonical rolling-summary ownership and prevent drift between session/chat-bible representations.
2. `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` — verify prompt formatting can render session memory without embedding it in `chatBible`.
3. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts`, `test/unit/llm/prompts/chat/chat-writer-prompt.test.ts`, and `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` — verify each prompt stage consumes session memory explicitly.
4. `test/unit/models/chat/chat-models.test.ts` — enforce the final model/validation invariant.
5. `test/unit/server/views/chat.test.ts` and/or `test/unit/client/chat-page/controller.test.ts` — verify the chat UI still renders the summary correctly after the contract cleanup.

### Commands

1. `npm run test:unit -- --testPathPatterns=chat`
2. `npm run test:client`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- What changed: Removed `rollingSummary` from `ChatBibleConversationNow` and `ChatSceneContext.conversationNow`, routed canonical chat memory only through `ChatSession.rollingSummary`, passed session memory explicitly into planner/writer/state-updater prompts, exposed canonical rolling-summary data to the chat UI via the session/bootstrap contract, tightened validation to reject duplicate summary ownership, and regenerated `public/js/app.js`.
- Deviations from original plan: Instead of keeping a derived summary string inside `chatBible`, the implementation removed that field entirely. This was cleaner and more extensible than preserving a mirror projection inside the bible model.
- Verification results: `npm run test:unit -- --runInBand test/unit/models/chat/chat-models.test.ts test/unit/models/chat/chat-scene-context.test.ts test/unit/llm/schemas/chat-scene-context-schema.test.ts test/unit/llm/chat/chat-pipeline.test.ts test/unit/llm/chat/chat-planner-generation.test.ts test/unit/llm/chat/chat-writer-generation.test.ts test/unit/llm/chat/chat-state-updater-generation.test.ts test/unit/llm/chat/chat-character-context-generation.test.ts test/unit/llm/chat/chat-scene-context-generation.test.ts test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/chat/chat-writer-prompt.test.ts test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/server/routes/chat.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`, `npm run concat:js`, `npm test`, and `npm run lint` all passed.
