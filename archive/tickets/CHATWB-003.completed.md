# CHATWB-003: Thread decomposedWorld into Chat Bible pipeline

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — ChatPipelineContext, ChatBibleContext, chat-bible-prompt
**Deps**: CHATWB-001 (formatter), CHATWB-002 (worldbuildingId on session)

## Problem

Even after CHATWB-002 stores `worldbuildingId` on the chat session, the LLM stages still receive no worldbuilding context. Characters in chat cannot correctly reference social norms, geography, naming conventions, or cultural taboos because the Chat Bible prompt has no world knowledge. This ticket loads `decomposedWorld` on each turn and injects it into the Chat Bible generation stage using the formatter from CHATWB-001.

## Assumption Reassessment (2026-03-27)

1. `ChatPipelineContext` at `src/llm/chat/chat-pipeline.ts` includes `chatSession`, `targetCharacter`, `interlocutorCharacter`, `recentTurns`, `allTurns`, `latestUserTurn`, and `isSessionResume` — confirmed. It does not yet carry `decomposedWorld`, so the pipeline cannot pass world facts into bible generation.
2. `ChatBibleContext` at `src/llm/chat/chat-bible-generation.ts` includes character profiles, relationship/knowledge state, physical/lead-in context, rolling summary, and recent turns — confirmed. It does not yet carry `decomposedWorld`.
3. `buildChatBibleMessages()` at `src/llm/prompts/chat/chat-bible-prompt.ts` currently renders character, relationship, knowledge, physical, lead-in, summary, and recent-turn sections — confirmed. It does not render any worldbuilding section yet.
4. `src/server/services/chat-service.ts:sendTurn()` currently loads characters and turns, then calls `runChatPipeline()` — confirmed. It already has `loadWorldbuildingById` in `ChatServiceDeps`, but it does not currently reload worldbuilding during `sendTurn()`.
5. `loadWorldbuildingById()` at `src/services/worldbuilding-service.ts` returns `SavedWorldbuilding | null`, and `SavedWorldbuilding` already exposes `decomposedWorld: DecomposedWorld | null` — confirmed.
6. The chat-specific formatter already exists today in `src/llm/prompts/sections/shared/worldbuilding-sections.ts` as the `'CHAT'` consumer of `buildWorldSection()`. This ticket should reuse that public routing function instead of importing an internal helper.
7. `DecomposedWorld` is importable from `src/models/decomposed-world.ts` — confirmed.
8. Current tests already cover the relevant seams:
   - `test/unit/llm/chat/chat-pipeline.test.ts`
   - `test/unit/llm/chat/chat-bible-generation.test.ts`
   - `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts`
   - `test/unit/server/services/chat-service.test.ts`
   The implementation should extend these suites rather than introduce parallel coverage elsewhere.

## Architecture Check

1. The clean architecture remains: service layer reloads persisted worldbuilding, context objects thread it explicitly, and prompt composition uses the existing consumer-aware world section builder. This matches the broader prompt architecture better than inventing a chat-only formatter path.
2. Injecting worldbuilding at the Chat Bible stage is still the right boundary. The bible is the canonical context condensation layer for downstream planner/writer/state-updater stages, so duplicating world sections across later prompts would add token cost and drift risk without architectural upside.
3. `sendTurn()` should reload worldbuilding fresh even though chat creation already validated it. That keeps session storage slim and makes the per-turn pipeline authoritative against current persisted world state.
4. The broader ownership cleanup around world prompt formatting is still real, but it is not required to deliver this ticket cleanly. This ticket should reuse the current public prompt API and avoid cross-cutting refactors.
5. No backwards-compatibility aliasing/shims introduced.

## What to Change

### 1. ChatPipelineContext — add decomposedWorld

In `src/llm/chat/chat-pipeline.ts`, add `readonly decomposedWorld: DecomposedWorld` to `ChatPipelineContext`. Import `DecomposedWorld` from models.

### 2. ChatBibleContext — add decomposedWorld

In `src/llm/chat/chat-bible-generation.ts`, add `readonly decomposedWorld: DecomposedWorld` to `ChatBibleContext`. Import `DecomposedWorld` from models.

### 3. chat-pipeline.ts — pass decomposedWorld to bible generation

In `runChatPipeline()`, pass `decomposedWorld: context.decomposedWorld` to the `generateChatBible()` call (around line 118-127).

### 4. chat-bible-prompt.ts — render world section

In `buildChatBibleMessages()`, add a worldbuilding section to the `userSections` array:
- Import `buildWorldSection` from `worldbuilding-sections.ts`
- Conditionally render: if `context.decomposedWorld.facts.length > 0`, call `buildWorldSection(context.decomposedWorld, 'CHAT')` and insert between character profiles and relationship state
- If no facts, insert `WORLDBUILDING:\n(none provided)` as a signal to the LLM

### 5. chat-service.ts — load worldbuilding on sendTurn

In `sendTurn()`:
- Load worldbuilding alongside characters: `loadWorldbuildingById(session.worldbuildingId)` in the existing `Promise.all` block
- Validate worldbuilding exists and has `decomposedWorld !== null`
- Throw `ChatDomainError` with `RESOURCE_NOT_FOUND` when the worldbuilding record is gone, and `VALIDATION_FAILED` when the record exists but is no longer decomposed
- Pass `decomposedWorld` to `runChatPipeline()` context
- Do not add a new dep seam here: `loadWorldbuildingById` is already in `ChatServiceDeps`

## Files to Touch

- `src/llm/chat/chat-pipeline.ts` (modify) — add `decomposedWorld` to context, pass to bible
- `src/llm/chat/chat-bible-generation.ts` (modify) — add `decomposedWorld` to `ChatBibleContext`
- `src/llm/prompts/chat/chat-bible-prompt.ts` (modify) — render world section in prompt
- `src/server/services/chat-service.ts` (modify) — load worldbuilding in `sendTurn()`
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify) — assert worldbuilding flows into bible generation
- `test/unit/llm/chat/chat-bible-generation.test.ts` (modify) — extend the canonical context fixture with `decomposedWorld`
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` (modify) — cover world section presence and empty-world fallback
- `test/unit/server/services/chat-service.test.ts` (modify) — assert `sendTurn()` reloads worldbuilding and rejects missing/undecomposed records

## Out of Scope

- Injecting worldbuilding into planner, writer, or state updater prompts (Chat Bible curates context for them)
- Modifying the Chat Bible schema/output structure to explicitly surface world facts
- Filtering worldbuilding facts based on conversation progress or topic
- Consolidating `formatDecomposedWorldForPrompt()` / `WorldPromptConsumer` ownership into the prompt layer (tracked separately)

## Acceptance Criteria

### Tests That Must Pass

1. `runChatPipeline()` passes `decomposedWorld` to `generateChatBible()` when bible refresh is triggered
2. `buildChatBibleMessages()` includes worldbuilding section when `decomposedWorld` has facts
3. `buildChatBibleMessages()` includes "(none provided)" fallback when `decomposedWorld` has empty facts
4. `sendTurn()` loads worldbuilding by `session.worldbuildingId` and passes it to pipeline
5. `sendTurn()` throws `ChatDomainError` if worldbuilding is missing or has no `decomposedWorld`
6. Existing targeted suites pass, then lint/typecheck/full test pass

### Invariants

1. Worldbuilding section appears in Chat Bible prompt ONLY — not in planner, writer, or state updater prompts
2. Chat Bible system prompt remains unchanged (the worldbuilding section is user content, not system instructions)
3. Worldbuilding is loaded fresh on each `sendTurn()` call (not cached on session)

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — extend `buildChatBibleMessages()` coverage for world facts and empty-world fallback
2. `test/unit/llm/chat/chat-pipeline.test.ts` — assert `decomposedWorld` is forwarded into bible generation
3. `test/unit/llm/chat/chat-bible-generation.test.ts` — update the canonical context fixture to include `decomposedWorld`
4. `test/unit/server/services/chat-service.test.ts` — assert `sendTurn()` reloads worldbuilding and handles missing/invalid cases

### Commands

1. `npm test -- --runInBand test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/chat/chat-pipeline.test.ts test/unit/llm/chat/chat-bible-generation.test.ts test/unit/server/services/chat-service.test.ts`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completion date: 2026-03-27
- Actual changes:
  - Reloaded `worldbuildingId` inside `sendTurn()` and now fail fast if the record is missing or no longer decomposed.
  - Threaded `decomposedWorld` through `ChatPipelineContext` and `ChatBibleContext`.
  - Added a worldbuilding section to the Chat Bible prompt using the existing `buildWorldSection(context.decomposedWorld, 'CHAT')` path, with an explicit `(none provided)` fallback.
  - Strengthened the existing chat unit tests at the service, pipeline, generation, and prompt seams.
- Deviations from original plan:
  - Reused the existing public chat world-section builder instead of importing an internal `buildWorldSectionForChat()` helper.
  - Reused existing `ChatDomainError` codes (`RESOURCE_NOT_FOUND`, `VALIDATION_FAILED`) instead of introducing `INVALID_PERSISTED_DATA`.
  - Extended existing test suites rather than creating new parallel ones.
- Verification results:
  - `npm test -- --runInBand test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/chat/chat-pipeline.test.ts test/unit/llm/chat/chat-bible-generation.test.ts test/unit/server/services/chat-service.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
