# CHABIBSTASPL-004: Create generation functions for ChatSceneContext and ChatCharacterContext

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABIBSTASPL-001 (types), CHABIBSTASPL-002 (schemas), CHABIBSTASPL-003 (prompts)

## Problem

Each new LLM stage needs a generation function that wires together the prompt builder, schema, and `runLlmStage()` call — following the same pattern as the existing `generateChatBible()`.

## Assumption Reassessment (2026-03-27)

1. `generateChatBible(context, apiKey, options?)` lives in `src/llm/chat/chat-bible-generation.ts` — **confirmed**.
2. It calls `buildChatBibleMessages(context)` then `runLlmStage()` with `stageModel: 'chatBible'`, `promptType: 'chatBible'`, schema `CHAT_BIBLE_SCHEMA`, parser `parseChatBibleResponse` — **confirmed**.
3. `ChatBibleGenerationResult` wraps the parsed output — **confirmed**.
4. All other chat generation functions (`generateChatTurnPlan`, `generateChatWriterTurn`, etc.) follow the identical pattern — **confirmed**.
5. Test at `test/unit/llm/chat/chat-bible-generation.test.ts` mocks `runLlmStage` — **confirmed**.
6. `LLM_STAGE_KEYS` currently includes `'chatBible'` but not `'chatSceneContext'` or `'chatCharacterContext'` — **confirmed** (new stage keys are added in CHABIBSTASPL-006).

## Architecture Check

1. Two small generation functions following the exact same pattern as existing chat generation functions. No new abstractions or patterns introduced.
2. No backwards-compatibility aliasing. These are new functions; the old `generateChatBible` stays until CHABIBSTASPL-005.

## What to Change

### 1. Create scene context generation function

New file `src/llm/chat/chat-scene-context-generation.ts`:

```typescript
interface ChatSceneContextGenerationResult {
  readonly sceneContext: ChatSceneContext;
  readonly rawResponse: string;
}

async function generateChatSceneContext(
  context: ChatBibleContext,
  apiKey: string,
  options?: GenerationOptions
): Promise<ChatSceneContextGenerationResult>
```

- Calls `buildChatSceneContextMessages(context)`
- Calls `runLlmStage()` with `stageModel: 'chatSceneContext'`, `promptType: 'chatSceneContext'`, schema `CHAT_SCENE_CONTEXT_SCHEMA`, parser `parseChatSceneContextResponse`
- Returns `{ sceneContext, rawResponse }`

### 2. Create character context generation function

New file `src/llm/chat/chat-character-context-generation.ts`:

```typescript
interface ChatCharacterContextGenerationResult {
  readonly characterContext: ChatCharacterContext;
  readonly rawResponse: string;
}

async function generateChatCharacterContext(
  context: ChatBibleContext,
  sceneContext: ChatSceneContext,
  apiKey: string,
  options?: GenerationOptions
): Promise<ChatCharacterContextGenerationResult>
```

- Calls `buildChatCharacterContextMessages(context, sceneContext)`
- Calls `runLlmStage()` with `stageModel: 'chatCharacterContext'`, `promptType: 'chatCharacterContext'`, schema `CHAT_CHARACTER_CONTEXT_SCHEMA`, parser `parseChatCharacterContextResponse`
- Returns `{ characterContext, rawResponse }`

**Note**: The new `stageModel` keys (`chatSceneContext`, `chatCharacterContext`) are registered in CHABIBSTASPL-006. For this ticket's tests, mock `runLlmStage` so the stage key doesn't need to resolve.

## Files to Touch

- `src/llm/chat/chat-scene-context-generation.ts` (new)
- `src/llm/chat/chat-character-context-generation.ts` (new)

## Out of Scope

- Deleting `chat-bible-generation.ts` (happens in CHABIBSTASPL-005)
- Pipeline rewiring (CHABIBSTASPL-005)
- Stage registry changes — `chatSceneContext` and `chatCharacterContext` stage keys (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Changes to any existing generation functions

## Acceptance Criteria

### Tests That Must Pass

1. `generateChatSceneContext` calls `buildChatSceneContextMessages` with the provided context.
2. `generateChatSceneContext` calls `runLlmStage` with `stageModel: 'chatSceneContext'` and `CHAT_SCENE_CONTEXT_SCHEMA`.
3. `generateChatSceneContext` returns `{ sceneContext, rawResponse }` from the parsed LLM output.
4. `generateChatCharacterContext` calls `buildChatCharacterContextMessages` with context AND scene context.
5. `generateChatCharacterContext` calls `runLlmStage` with `stageModel: 'chatCharacterContext'` and `CHAT_CHARACTER_CONTEXT_SCHEMA`.
6. `generateChatCharacterContext` returns `{ characterContext, rawResponse }` from the parsed LLM output.
7. Existing suite: `npm test` passes. `npm run typecheck` passes.

### Invariants

1. `generateChatBible` is unchanged (still exists, still exported, still used until CHABIBSTASPL-005).
2. Both new functions follow the identical `buildMessages → runLlmStage → return` pattern used by all other chat generation functions.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-scene-context-generation.test.ts` — Mock `runLlmStage`, verify prompt builder call, verify schema/stageModel, verify return shape
2. `test/unit/llm/chat/chat-character-context-generation.test.ts` — Mock `runLlmStage`, verify prompt builder call with scene context, verify schema/stageModel, verify return shape

### Commands

1. `npm test -- --testPathPattern="test/unit/llm/chat/chat-(scene|character)-context-generation"`
2. `npm run typecheck && npm run lint && npm test`
