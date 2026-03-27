# CHABIBSTASPL-005: Rewire chat pipeline to use two-stage bible generation

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — chat pipeline orchestration
**Deps**: CHABIBSTASPL-001 (types + assembly), CHABIBSTASPL-004 (generation functions), CHABIBSTASPL-006 (stage registry)

## Problem

The chat pipeline currently calls `generateChatBible()` as a single stage. It must be rewired to call `generateChatSceneContext()` then `generateChatCharacterContext()` sequentially, merge the results via `assembleChatBible()`, and report progress through two generation stages instead of one. After rewiring, the old single-stage files can be deleted.

## Assumption Reassessment (2026-03-27)

1. `runChatPipeline()` in `src/llm/chat/chat-pipeline.ts` calls `generateChatBible()` at line ~90-100 inside the `shouldRefreshChatBible()` branch — **confirmed**.
2. Pipeline reports progress via `onGenerationStage?.('CURATING_CHAT_BIBLE')` — **confirmed**.
3. `shouldRefreshChatBible()` logic: refresh on resume, null bible, every 10 turns, or state update flag — **confirmed**.
4. The generated `ChatBible` is stored on `chatSession.chatBible` — **confirmed**.
5. Old files to delete: `src/llm/chat/chat-bible-generation.ts`, `src/llm/schemas/chat-bible-schema.ts`, `src/llm/prompts/chat/chat-bible-prompt.ts` — **confirmed** these exist.
6. Pipeline test at `test/unit/llm/chat/chat-pipeline.test.ts` — **confirmed**.
7. `ChatBibleContext` is constructed inside the pipeline from `ChatPipelineContext` fields — **confirmed**.

## Architecture Check

1. Sequential two-stage call inside the same `shouldRefreshChatBible()` branch is the minimal change. The merge via `assembleChatBible()` means the rest of the pipeline sees the same `ChatBible` type — no ripple effects.
2. No backwards-compatibility aliasing. Old files are deleted, not deprecated.
3. This ticket is the primary owner of eliminating the monolithic chat-bible implementation path. Once the pipeline is rewired, no source file, schema inventory, or prompt doc should continue referencing `generateChatBible`, `CHAT_BIBLE_SCHEMA`, or `buildChatBibleMessages`.

## What to Change

### 1. Rewire `runChatPipeline()` in `src/llm/chat/chat-pipeline.ts`

Replace:
```typescript
onGenerationStage?.('CURATING_CHAT_BIBLE');
const bibleResult = await generateChatBible(bibleContext, apiKey);
chatBible = bibleResult.chatBible;
```

With:
```typescript
onGenerationStage?.('CURATING_CHAT_SCENE');
const sceneResult = await generateChatSceneContext(bibleContext, apiKey);

onGenerationStage?.('CURATING_CHAT_CHARACTER');
const characterResult = await generateChatCharacterContext(bibleContext, sceneResult.sceneContext, apiKey);

chatBible = assembleChatBible(sceneResult.sceneContext, characterResult.characterContext);
```

Update imports to use new generation functions and `assembleChatBible`.
Remove import of `generateChatBible`.

### 2. Delete old single-stage files

- `src/llm/chat/chat-bible-generation.ts`
- `src/llm/schemas/chat-bible-schema.ts`
- `src/llm/prompts/chat/chat-bible-prompt.ts`

### 3. Delete old tests for deleted files

- `test/unit/llm/chat/chat-bible-generation.test.ts`
- `test/unit/llm/schemas/chat-bible-schema.test.ts`
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts`

### 4. Delete/update supporting references to the removed monolithic path

- Remove `CHAT_BIBLE_SCHEMA` from `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts`
- Remove the old prompt-doc contract entry from `test/unit/llm/prompt-doc-alignment.test.ts`
- Delete or replace `prompts/chat-bible-curator-prompt.md` so prompt docs do not point at deleted source files
- Search for any remaining imports or references to `chat-bible-generation`, `chat-bible-schema`, `chat-bible-prompt`, `generateChatBible`, `buildChatBibleMessages`, or `CHAT_BIBLE_SCHEMA` and remove them

### 5. Update pipeline test

Modify `test/unit/llm/chat/chat-pipeline.test.ts`:
- Replace `generateChatBible` mock with `generateChatSceneContext` + `generateChatCharacterContext` mocks
- Verify pipeline calls scene generation first, then character generation with scene output
- Verify `assembleChatBible` is called (or verify the resulting `chatBible` has correct shape)
- Verify two progress stage callbacks (`CURATING_CHAT_SCENE`, `CURATING_CHAT_CHARACTER`) instead of one

## Files to Touch

- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/llm/chat/chat-bible-generation.ts` (delete)
- `src/llm/schemas/chat-bible-schema.ts` (delete)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (delete)
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify)
- `test/unit/llm/chat/chat-bible-generation.test.ts` (delete)
- `test/unit/llm/schemas/chat-bible-schema.test.ts` (delete)
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` (delete)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `prompts/chat-bible-curator-prompt.md` (delete or replace)

## Out of Scope

- Changes to `formatChatBible()` or any downstream prompt formatters (they receive assembled `ChatBible`)
- Changes to chat planner, writer, state updater, or summarizer generation functions
- Changes to `ChatSession` persistence (still stores `ChatBible | null`)
- Changes to `chat-state-applier.ts`
- Changes to the `shouldRefreshChatBible()` logic itself (refresh conditions unchanged)
- Stage registry changes (CHABIBSTASPL-006 — must land first or simultaneously)
- Strict-false fallback (CHABIBSTASPL-007)

## Acceptance Criteria

### Tests That Must Pass

1. Pipeline calls `generateChatSceneContext` when bible refresh is needed.
2. Pipeline calls `generateChatCharacterContext` with the scene context output.
3. Pipeline stores the assembled `ChatBible` on `chatSession.chatBible`.
4. Pipeline reports `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER` progress stages.
5. Pipeline does NOT call `generateChatBible` (function no longer exists).
6. When bible refresh is skipped (not needed), neither scene nor character generation is called.
7. Downstream stages (planner, writer, state updater) still receive a valid `ChatBible`.
8. No TypeScript errors from deleted file imports (`npm run typecheck`).
9. No prompt docs or schema inventory tests reference deleted monolithic chat-bible files.
10. Existing suite: `npm test` passes with no regressions outside deleted test files.

### Invariants

1. `ChatBible` type is unchanged.
2. `ChatSession.chatBible` type is unchanged (`ChatBible | null`).
3. `shouldRefreshChatBible()` logic is unchanged.
4. All downstream consumers (`formatChatBible`, planner prompt, writer prompt, state updater prompt) are NOT modified.
5. `bibleWasRefreshed` flag in `ChatPipelineResult` still works correctly.
6. The repo does not retain both the new split path and the old monolithic implementation path after this ticket lands.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` (modify) — Update mocks for two-stage generation, verify call order and data flow

### Commands

1. `npm test -- --testPathPattern="test/unit/llm/chat/chat-pipeline"`
2. `npm run typecheck && npm run lint && npm test`
