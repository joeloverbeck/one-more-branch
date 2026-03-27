# CHABIBSTASPL-004: Create generation functions for ChatSceneContext and ChatCharacterContext

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABIBSTASPL-001 (types), CHABIBSTASPL-002 (schemas), CHABIBSTASPL-003 (prompts)

## Problem

Each new LLM stage needs a generation function that wires together the prompt builder, schema, and `runLlmStage()` call — following the same pattern as the existing `generateChatBible()`.

## Assumption Reassessment (2026-03-28)

1. `generateChatBible(context, apiKey, options?)` lives in `src/llm/chat/chat-bible-generation.ts` — **confirmed**.
2. It calls `buildChatBibleMessages(context)` then `runLlmStage()` with `stageModel: 'chatBible'`, `promptType: 'chatBible'`, schema `CHAT_BIBLE_SCHEMA`, parser `parseChatBibleResponse` — **confirmed**.
3. `ChatBibleGenerationResult` wraps the parsed output — **confirmed**.
4. All other chat generation functions (`generateChatTurnPlan`, `generateChatWriterTurn`, etc.) follow the same small `build prompt -> runLlmStage -> return parsed payload` pattern — **confirmed**.
5. Test at `test/unit/llm/chat/chat-bible-generation.test.ts` mocks `runLlmStage` and verifies prompt wiring / return shape — **confirmed**.
6. The split groundwork already exists: `ChatSceneContext`, `ChatCharacterContext`, validators, schemas, prompt builders, and `assembleChatBible()` are already implemented — **confirmed**.
7. `LLM_STAGE_KEYS` currently includes `'chatBible'` but not `'chatSceneContext'` or `'chatCharacterContext'` — **confirmed**.
8. That registry gap is not just a later runtime concern: `runLlmStage()` requires `stageModel: LlmStage`, and `PromptType` is derived from the same union. Without adding the new keys now, the new generation functions would require an unsafe cast or would fail `tsc` — **ticket scope corrected**.
9. `chat-pipeline.ts` still depends on `generateChatBible()` and `CURATING_CHAT_BIBLE` — **confirmed**. This ticket should stay additive and not rewire the pipeline yet.
10. The repository also enforces full default-model coverage for every registered `LlmStage` via `test/unit/config/stage-model-config-coverage.test.ts`. Adding stage keys therefore also requires adding matching `llm.models` entries in `configs/default.json` — **confirmed during validation**.

## Architecture Check

1. The split itself is architecturally better than the current monolithic `chatBible` generation because the codebase has already committed to split scene-grounding from character-synthesis at the model/schema/prompt layer. Adding the missing generation functions completes that separation with small, focused units.
2. Introducing a new abstraction just for these two functions is not justified. The existing codebase intentionally uses one explicit generation function per stage, and these should match that pattern.
3. The registry typing fix belongs in this ticket. Deferring it would force either type assertions or temporarily broken compilation, both of which are worse than a minimal, explicit registry update.
4. No backwards-compatibility aliasing. These are additive functions; `generateChatBible` remains in place until the later pipeline-rewiring ticket removes it cleanly.

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

### 3. Register the new stage keys for type-safe generation calls

Update `src/config/llm-stage-registry.ts` to add:

- `'chatSceneContext'`
- `'chatCharacterContext'`

This keeps `runLlmStage()` and prompt logging type-safe without casts. It does **not** imply pipeline rewiring or metadata changes yet.

### 4. Add default model entries for the new LLM stages

Update `configs/default.json` so `llm.models` includes:

- `chatSceneContext`
- `chatCharacterContext`

This is required by the repo's stage-config coverage invariant once the new stage keys are registered.

## Files to Touch

- `src/llm/chat/chat-scene-context-generation.ts` (new)
- `src/llm/chat/chat-character-context-generation.ts` (new)
- `src/config/llm-stage-registry.ts` (additive stage-key update)
- `configs/default.json` (additive stage-model entries)
- `test/unit/llm/chat/chat-scene-context-generation.test.ts` (new)
- `test/unit/llm/chat/chat-character-context-generation.test.ts` (new)

## Out of Scope

- Deleting `chat-bible-generation.ts` (happens in CHABIBSTASPL-005)
- Pipeline rewiring (CHABIBSTASPL-005)
- Generation-stage metadata / engine-stage rewiring (`CURATING_CHAT_SCENE`, `CURATING_CHAT_CHARACTER`) and removal of `chatBible`
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
7. `LLM_STAGE_KEYS` includes `chatSceneContext` and `chatCharacterContext`, so the new generation functions compile without casts.
8. `configs/default.json` includes model entries for `chatSceneContext` and `chatCharacterContext`, satisfying stage-config coverage.
9. Relevant targeted tests pass. `npm run typecheck`, `npm run lint`, and `npm test` pass.

### Invariants

1. `generateChatBible` is unchanged (still exists, still exported, still used until CHABIBSTASPL-005).
2. Both new functions follow the identical `buildMessages → runLlmStage → return` pattern used by all other chat generation functions.
3. No temporary aliasing, duplicate stage names, or type assertions are introduced to bridge the missing registry keys.
4. Stage registration remains consistent with config coverage; no registered stage is left without a default model entry.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-scene-context-generation.test.ts` — Mock `runLlmStage`, verify prompt builder call, verify schema/stageModel, verify return shape
2. `test/unit/llm/chat/chat-character-context-generation.test.ts` — Mock `runLlmStage`, verify prompt builder call with scene context, verify schema/stageModel, verify return shape
3. No existing tests should require behavior changes because the pipeline still uses `generateChatBible()`.

### Commands

1. `npm test -- --runInBand --testPathPatterns="test/unit/llm/chat/chat-(scene|character)-context-generation\.test\.ts"`
2. `npm run typecheck && npm run lint && npm test`

## Outcome

- **Completion date**: 2026-03-28
- **What actually changed**: Added `generateChatSceneContext()` and `generateChatCharacterContext()` with matching unit tests; registered `chatSceneContext` and `chatCharacterContext` in `LLM_STAGE_KEYS`; added default `llm.models` entries for both new stages in `configs/default.json`.
- **Deviations from original plan**: The original ticket assumed stage-key registration could stay in a later ticket and did not account for `configs/default.json` coverage. Both had to move into this ticket to keep the implementation type-safe and to satisfy the repo's stage-config invariant. Pipeline rewiring was intentionally left untouched.
- **Verification results**:
  - `npm test -- --runInBand --testPathPatterns="test/unit/llm/chat/chat-(scene|character)-context-generation\.test\.ts"` ✅
  - `npm test -- --runInBand --testPathPatterns="test/unit/config/stage-model-config-coverage\.test\.ts"` ✅
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm test -- --runInBand` ✅
