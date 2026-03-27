# CHACHASYS-005: Chat Bible Curator LLM Stage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (chat data models), CHACHASYS-004 (stage registration)

## Problem

The Chat Bible Curator is the first conditional LLM stage in the chat pipeline. It produces a focused `ChatBible` brief that synthesizes character profiles, physical context, relationship state, knowledge state, and conversation history for downstream chat stages.

## Assumption Reassessment (2026-03-27)

1. Existing chat domain models already exist under `src/models/chat/`, including `ChatBible`, `ChatSession`, `ChatTurn`, and runtime validators in `src/models/chat/chat-validation.ts`. This ticket must build on those types instead of redefining them.
2. Stage registration already exists: `chatBible` is already present in [`src/config/llm-stage-registry.ts`](/home/joeloverbeck/projects/one-more-branch/src/config/llm-stage-registry.ts), and model/token/temperature config entries already exist in `configs/default.json`.
3. Existing LLM generation pattern is still correct: schema module defines OpenRouter JSON Schema plus parser, prompt module builds `ChatMessage[]`, and generation module wraps `runLlmStage()` from [`src/llm/llm-stage-runner.ts`](/home/joeloverbeck/projects/one-more-branch/src/llm/llm-stage-runner.ts).
4. `content-policy.ts` exports the `CONTENT_POLICY` constant. There is no `getContentPolicyBlock()` helper in this repo.
5. The repo already treats chat payload validation as a model concern (`isChatBible` et al.), so the stage parser should reuse those validators instead of duplicating field-by-field parsing logic.

## Architecture Check

1. Follow the established three-part pattern:
   - `src/llm/schemas/chat-bible-schema.ts`
   - `src/llm/prompts/chat/chat-bible-prompt.ts`
   - `src/llm/chat/chat-bible-generation.ts`
2. The current architecture is sound for this stage. A dedicated schema + prompt + generation wrapper is cleaner and more extensible than trying to fold chat-bible behavior into generic chat orchestration early.
3. The parser should validate the full shape through existing chat model validators, so the source of truth for `ChatBible` invariants remains centralized in the chat model layer.
4. No backward-compatibility or aliasing work is needed. This is additive infrastructure for an already-registered stage key.
5. Prompt markdown documentation is not part of this ticket implementation because repository rules require explicit confirmation before prompt-doc updates. If we want complete prompt-pipeline documentation parity, that should be a follow-up ticket.

## What to Change

### 1. Create `src/llm/schemas/chat-bible-schema.ts`

- JSON Schema definition matching the existing `ChatBible` interface in `src/models/chat/chat-bible.ts`
- Export parser function: `parseChatBibleResponse(raw: unknown): ChatBible`
- Reuse existing runtime validation (`isChatBible`) rather than maintaining a second independent shape checker
- Use `anyOf` for nullable fields (`rollingSummary`, `lastTurnPressure`) for Anthropic/Bedrock compatibility

### 2. Create `src/llm/prompts/chat/chat-bible-prompt.ts`

Build system and user messages per spec:
- System: curating brief, physical context mandatory, knowledge boundaries, compress for next 1-3 turns, NC-21 content policy
- User sections: TARGET CHARACTER DECOMPOSITION, INTERLOCUTOR CHARACTER PROFILE, RELATIONSHIP STATE, KNOWLEDGE STATE, PHYSICAL CONTEXT, PRE-CHAT LEAD-IN, OLDER CHAT SUMMARY, RECENT CHAT TURNS
- Format recent turns explicitly enough that downstream chat stages can preserve action/speech boundaries and turn ownership

### 3. Create `src/llm/chat/chat-bible-generation.ts`

- `generateChatBible(context: ChatBibleContext, apiKey: string): Promise<ChatBible>`
- Uses `runLlmStage` with stage key `'chatBible'`
- Passes schema and prompt builder
- Returns transformed `ChatBible`

### 4. Add or strengthen targeted tests

- Cover the schema shape and parser behavior
- Cover prompt composition, including `CONTENT_POLICY` and the required user sections
- Cover generation wrapper behavior with mocked `runLlmStage`
- Add the new schema to the Anthropic compatibility suite so nullable-field handling cannot silently regress

## Files to Touch

- `src/llm/schemas/chat-bible-schema.ts` (new)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (new)
- `src/llm/chat/chat-bible-generation.ts` (new)
- `test/unit/llm/schemas/chat-bible-schema.test.ts` (new)
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` (new)
- `test/unit/llm/chat/chat-bible-generation.test.ts` (new)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (modify)

## Out of Scope

- Pipeline orchestration (CHACHASYS-010)
- Bible refresh trigger logic (CHACHASYS-010)
- Other LLM stages (CHACHASYS-006 through CHACHASYS-009)
- Server routes or UI
- Chat persistence/models/validators already delivered by earlier chat-system work
- Prompt documentation markdown files (follow-up only; requires explicit confirmation per repo rules)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema declares the expected `ChatBible` structure
2. Unit test: parser accepts a well-formed `ChatBible` payload and rejects malformed payloads
3. Unit test: prompt builder includes content policy block in system message
4. Unit test: prompt builder includes all required user message sections
5. Unit test: generation function calls `runLlmStage` with correct stage key and parameters
6. Existing suite: targeted unit tests and typecheck pass

### Invariants

1. `CONTENT_POLICY` is always included in the system prompt
2. Nullable schema fields use `anyOf` branches, not mixed nullable enums/types
3. Parser accepts only payloads that satisfy the existing chat model validator
4. Generation function is pure async with no side effects beyond the LLM call and existing prompt/response logging inside `runLlmStage`

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-bible-schema.test.ts` — schema validation and transformer tests
2. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — prompt builder output structure
3. `test/unit/llm/chat/chat-bible-generation.test.ts` — generation function with mocked stage runner
4. `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` — include `CHAT_BIBLE_SCHEMA`

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-bible|anthropic-schema-compatibility'`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-27
- What changed:
  - Added `src/llm/schemas/chat-bible-schema.ts` with a strict OpenRouter schema and `parseChatBibleResponse()`
  - Added `src/llm/prompts/chat/chat-bible-prompt.ts` to build the chat-bible system/user messages
  - Added `src/llm/chat/chat-bible-generation.ts` with a typed `ChatBibleContext` and `generateChatBible()`
  - Added focused unit tests for schema/parser, prompt composition, and generation-wrapper behavior
  - Added `CHAT_BIBLE_SCHEMA` to the Anthropic compatibility suite
- Deviations from the original plan:
  - The parser reuses the existing chat model validator (`isChatBible`) instead of maintaining a second bespoke transformer
  - `generateChatBible()` returns `{ chatBible, rawResponse }` to match existing LLM wrapper patterns in this repo instead of returning only `ChatBible`
  - Prompt markdown docs were not changed; that remains a follow-up because repo rules require explicit confirmation before prompt-doc updates
- Verification:
  - `npm run test:unit -- --testPathPatterns='chat-bible|anthropic-schema-compatibility'`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
