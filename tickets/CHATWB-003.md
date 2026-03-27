# CHATWB-003: Thread decomposedWorld into Chat Bible pipeline

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — ChatPipelineContext, ChatBibleContext, chat-bible-prompt
**Deps**: CHATWB-001 (formatter), CHATWB-002 (worldbuildingId on session)

## Problem

Even after CHATWB-002 stores `worldbuildingId` on the chat session, the LLM stages still receive no worldbuilding context. Characters in chat cannot correctly reference social norms, geography, naming conventions, or cultural taboos because the Chat Bible prompt has no world knowledge. This ticket loads `decomposedWorld` on each turn and injects it into the Chat Bible generation stage using the formatter from CHATWB-001.

## Assumption Reassessment (2026-03-27)

1. `ChatPipelineContext` at `src/llm/chat/chat-pipeline.ts:12-20` includes `chatSession`, `targetCharacter`, `interlocutorCharacter`, `recentTurns`, `allTurns`, `latestUserTurn`, `isSessionResume` — confirmed. Does NOT include `decomposedWorld` — needs addition.
2. `ChatBibleContext` at `src/llm/chat/chat-bible-generation.ts:19-28` includes character profiles, relationship/knowledge state, physical/lead-in context, rolling summary, recent turns — confirmed. Does NOT include `decomposedWorld` — needs addition.
3. `buildChatBibleMessages()` at `src/llm/prompts/chat/chat-bible-prompt.ts:75-97` assembles user sections: character profiles, relationship, knowledge, physical context, lead-in, summary, recent turns — confirmed. No world section present — needs addition.
4. `chat-service.ts:sendTurn()` at lines 180-213 loads characters and turns, then calls `runChatPipeline()` — confirmed. Does NOT load worldbuilding — needs to load via `loadWorldbuildingById(session.worldbuildingId)`.
5. `loadWorldbuildingById()` at `src/services/worldbuilding-service.ts:138-140` returns `SavedWorldbuilding | null` which has `decomposedWorld: DecomposedWorld | null` — confirmed.
6. `buildWorldSectionForChat()` will exist after CHATWB-001 — dependency confirmed.
7. `DecomposedWorld` type importable from `src/models/decomposed-world.ts` — confirmed.

## Architecture Check

1. Follows the established pattern: worldbuilding loaded by service → passed through context objects → formatted by consumer-specific builder → rendered into prompt. This is exactly how the story pipeline works (generation-context-assembler → planner prompt → formatDecomposedWorldForPrompt).
2. Worldbuilding injected at Chat Bible stage only. The Bible curates all scene context for downstream stages (planner, writer, state updater), so world facts flow through the bible's structured output rather than being repeated in every prompt. This minimizes token cost while maximizing coverage.
3. No backwards-compatibility aliasing/shims introduced.

## What to Change

### 1. ChatPipelineContext — add decomposedWorld

In `src/llm/chat/chat-pipeline.ts`, add `readonly decomposedWorld: DecomposedWorld` to `ChatPipelineContext`. Import `DecomposedWorld` from models.

### 2. ChatBibleContext — add decomposedWorld

In `src/llm/chat/chat-bible-generation.ts`, add `readonly decomposedWorld: DecomposedWorld` to `ChatBibleContext`. Import `DecomposedWorld` from models.

### 3. chat-pipeline.ts — pass decomposedWorld to bible generation

In `runChatPipeline()`, pass `decomposedWorld: context.decomposedWorld` to the `generateChatBible()` call (around line 118-127).

### 4. chat-bible-prompt.ts — render world section

In `buildChatBibleMessages()`, add a worldbuilding section to the `userSections` array:
- Import `buildWorldSectionForChat` from `worldbuilding-sections.ts`
- Conditionally render: if `context.decomposedWorld.facts.length > 0`, call `buildWorldSectionForChat(context.decomposedWorld)` and insert between character profiles and relationship state
- If no facts, insert `WORLDBUILDING:\n(none provided)` as a signal to the LLM

### 5. chat-service.ts — load worldbuilding on sendTurn

In `sendTurn()`:
- Load worldbuilding alongside characters: `loadWorldbuildingById(session.worldbuildingId)` in the existing `Promise.all` block
- Validate worldbuilding exists and has `decomposedWorld !== null` (throw `ChatDomainError` with `INVALID_PERSISTED_DATA` if missing)
- Pass `decomposedWorld` to `runChatPipeline()` context
- Add `loadWorldbuildingById` to `ChatServiceDeps` for testability (if not already added in CHATWB-002)

## Files to Touch

- `src/llm/chat/chat-pipeline.ts` (modify) — add `decomposedWorld` to context, pass to bible
- `src/llm/chat/chat-bible-generation.ts` (modify) — add `decomposedWorld` to `ChatBibleContext`
- `src/llm/prompts/chat/chat-bible-prompt.ts` (modify) — render world section in prompt
- `src/server/services/chat-service.ts` (modify) — load worldbuilding in `sendTurn()`

## Out of Scope

- Injecting worldbuilding into planner, writer, or state updater prompts (Chat Bible curates context for them)
- Modifying the Chat Bible schema/output structure to explicitly surface world facts
- Filtering worldbuilding facts based on conversation progress or topic

## Acceptance Criteria

### Tests That Must Pass

1. `runChatPipeline()` passes `decomposedWorld` to `generateChatBible()` when bible refresh is triggered
2. `buildChatBibleMessages()` includes worldbuilding section when `decomposedWorld` has facts
3. `buildChatBibleMessages()` includes "(none provided)" fallback when `decomposedWorld` has empty facts
4. `sendTurn()` loads worldbuilding by `session.worldbuildingId` and passes it to pipeline
5. `sendTurn()` throws `ChatDomainError` if worldbuilding is missing or has no `decomposedWorld`
6. Existing suite: `npm test`

### Invariants

1. Worldbuilding section appears in Chat Bible prompt ONLY — not in planner, writer, or state updater prompts
2. Chat Bible system prompt remains unchanged (the worldbuilding section is user content, not system instructions)
3. Worldbuilding is loaded fresh on each `sendTurn()` call (not cached on session)

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — test `buildChatBibleMessages()` with/without decomposedWorld facts
2. `test/unit/llm/chat/chat-pipeline.test.ts` — test decomposedWorld flows to bible generation call
3. `test/unit/server/services/chat-service.test.ts` — test `sendTurn()` loads worldbuilding and handles missing/invalid cases

### Commands

1. `npx jest test/unit/llm/prompts/chat/ test/unit/llm/chat/ test/unit/server/services/chat-service.test.ts`
2. `npm run lint && npm run typecheck && npm test`
