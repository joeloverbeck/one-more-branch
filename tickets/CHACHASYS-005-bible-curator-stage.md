# CHACHASYS-005: Chat Bible Curator LLM Stage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Chat Bible Curator is the first conditional LLM stage in the chat pipeline. It produces a comprehensive brief (`ChatBible`) that synthesizes character profiles, physical context, relationship state, and conversation history into a focused context document for downstream stages.

## Assumption Reassessment (2026-03-27)

1. Existing LLM generation pattern: schema file defines JSON Schema + response transformer, prompt file builds system/user messages, generation file calls `runLlmStage` from `llm-stage-runner.ts`.
2. `content-policy.ts` provides `getContentPolicyBlock()` for injection into system prompts.
3. `ChatBible` type from CHACHASYS-001 defines the output shape.

## Architecture Check

1. Follow existing pattern: `schemas/chat-bible-schema.ts` + `prompts/chat/chat-bible-prompt.ts` + `chat/chat-bible-generation.ts`.
2. Schema uses `response_format` JSON Schema structured output (OpenRouter standard).
3. No backward-compatibility concerns — entirely new code.

## What to Change

### 1. Create `src/llm/schemas/chat-bible-schema.ts`

- JSON Schema definition matching the `ChatBible` interface
- Response transformer function: `transformChatBibleResponse(raw: unknown): ChatBible`
- Use `anyOf` pattern for nullable fields (Anthropic/Bedrock compatibility)

### 2. Create `src/llm/prompts/chat/chat-bible-prompt.ts`

Build system and user messages per spec:
- System: curating brief, physical context mandatory, knowledge boundaries, compress for 1-3 turns, NC-21 content policy
- User sections: TARGET CHARACTER DECOMPOSITION, INTERLOCUTOR CHARACTER PROFILE, RELATIONSHIP STATE, PHYSICAL CONTEXT, PRE-CHAT LEAD-IN, OLDER CHAT SUMMARY, RECENT CHAT TURNS

### 3. Create `src/llm/chat/chat-bible-generation.ts`

- `generateChatBible(context: ChatBibleContext, apiKey: string): Promise<ChatBible>`
- Uses `runLlmStage` with stage key `'chatBible'`
- Passes schema and prompt builder
- Returns transformed `ChatBible`

## Files to Touch

- `src/llm/schemas/chat-bible-schema.ts` (new)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (new)
- `src/llm/chat/chat-bible-generation.ts` (new)

## Out of Scope

- Pipeline orchestration (CHACHASYS-010)
- Bible refresh trigger logic (CHACHASYS-010)
- Other LLM stages (CHACHASYS-006 through CHACHASYS-009)
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates a well-formed ChatBible object
2. Unit test: response transformer converts raw JSON to typed ChatBible
3. Unit test: prompt builder includes content policy block in system message
4. Unit test: prompt builder includes all 7 user message sections
5. Unit test: generation function calls `runLlmStage` with correct stage key and parameters
6. Existing suite: `npm test` passes

### Invariants

1. Content policy block is always included in system prompt
2. Schema uses `anyOf` for nullable enum fields (not mixed nullable form)
3. Generation function is pure async — no side effects beyond the LLM call
4. All string arrays in schema are `readonly` in the TypeScript output

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-bible-schema.test.ts` — schema validation and transformer tests
2. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — prompt builder output structure
3. `test/unit/llm/chat/chat-bible-generation.test.ts` — generation function with mocked stage runner

### Commands

1. `npm run test:unit -- --testPathPattern='chat-bible'`
2. `npm run typecheck`
3. `npm test`
