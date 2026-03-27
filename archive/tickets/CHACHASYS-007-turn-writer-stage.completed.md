# CHACHASYS-007: Turn Writer LLM Stage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (chat data models), CHACHASYS-004 (stage registration)

## Problem

The Turn Writer is the third chat LLM stage. It receives the planner output plus the chat bible, the target character's speech fingerprint, recent turns, and the latest user turn, then renders the target character's visible reply as chat blocks plus turn metadata.

## Assumption Reassessment (2026-03-27)

1. The canonical chat types already exist in `src/models/chat/`, not in a future ticket-only namespace. `ChatBlock`, `TurnMeta`, `TurnPlannerOutput`, and their runtime guards live there now.
2. The established chat-stage pattern is already in production for `chatBible` and `chatPlanner`: `src/llm/chat/*-generation.ts`, `src/llm/prompts/chat/*-prompt.ts`, and `src/llm/schemas/*-schema.ts`.
3. `chatWriter` is already registered as an LLM stage and already has explicit model/temperature slots in config. This ticket should not add aliases or alternative names.
4. Existing generation functions return both the typed parsed payload and `rawResponse`. The writer stage should follow that contract for consistency and logging/debuggability.
5. The spec's block-level constraints are stronger than the ticket originally framed. The stage should enforce at least these invariants in code after parsing:
   - block types are only `ACTION` or `SPEECH`
   - `delivery` is only allowed on `SPEECH`
   - no more than 2 `ACTION` blocks
   - no more than 3 `SPEECH` blocks
   - the visible block sequence must exactly match `turnPlan.blockPlan`
6. The planner should remain the sole authority for intent and structure. The writer should not be given broad extra planning inputs that let it silently override the planner.

## Architecture Check

1. Keep the same 3-file pattern as the existing chat stages:
   - schema/parser
   - prompt builder
   - generation wrapper
2. Preserve the current chat module layout:
   - generation: `src/llm/chat/chat-writer-generation.ts`
   - prompt: `src/llm/prompts/chat/chat-writer-prompt.ts`
   - schema: `src/llm/schemas/chat-writer-schema.ts`
3. Keep the writer result narrow and composable:
   - parsed writer payload: `{ blocks, turnMeta }`
   - generation result: `{ writerTurn, rawResponse }`
4. Enforce context-coupled invariants in the generation layer, not in the JSON schema:
   - schema validates shape
   - parser validates runtime type
   - generation validates planner alignment and stage rules tied to `context.turnPlan`
5. Do not make the writer construct the final `ChatTurn`. Pipeline orchestration remains responsible for turn assembly.

## What to Change

### 1. Create `src/llm/schemas/chat-writer-schema.ts`

- Add a strict JSON Schema for the writer payload: `{ blocks: ChatBlock[], turnMeta: TurnMeta }`
- Reuse the canonical chat block and turn-meta contracts from `src/models/chat`
- Export `parseChatWriterResponse(raw: unknown): ChatWriterTurn`
- Throw an `LLMError` when the raw payload does not match the expected structural contract

### 2. Create `src/llm/prompts/chat/chat-writer-prompt.ts`

Build the messages defined by the spec while preserving planner authority:
- System prompt:
  - write exactly one in-world turn
  - chat, not prose
  - action is concise, visible, non-omniscient
  - speech carries voice
  - follow planner honesty mode, subtext, and action plan
  - respect physical reality, knowledge boundaries, and secrets
  - bounded, reply-shaped output
  - max 2 action blocks, max 3 speech blocks
  - controlled imperfections are allowed when they serve characterization
  - include the content policy block
- User sections:
  - `TARGET CHARACTER NAME`
  - `FULL SPEECH FINGERPRINT`
  - `CHAT BIBLE`
  - `TURN PLAN`
  - `RECENT CHAT TURNS`
  - `LATEST USER TURN`

### 3. Create `src/llm/chat/chat-writer-generation.ts`

- Add `ChatWriterContext`
- Add `ChatWriterTurn` for the parsed payload: `{ blocks: readonly ChatBlock[]; turnMeta: TurnMeta }`
- Add `ChatWriterGenerationResult`: `{ writerTurn: ChatWriterTurn; rawResponse: string }`
- Implement `generateChatWriterTurn(context: ChatWriterContext, apiKey: string, options?)`
- Use `runLlmStage` with:
  - `stageModel: 'chatWriter'`
  - `promptType: 'chatWriter'`
  - `schema: CHAT_WRITER_SCHEMA`
  - `parseResponse: parseChatWriterResponse`
- After parsing, validate writer-stage invariants against `context.turnPlan`

### 4. Add prompt documentation

- Create `prompts/chat-turn-writer-prompt.md`
- Document the source file, section layout, planner-to-writer authority boundary, and writer output contract

## Files to Touch

- `src/llm/schemas/chat-writer-schema.ts` (new)
- `src/llm/prompts/chat/chat-writer-prompt.ts` (new)
- `src/llm/chat/chat-writer-generation.ts` (new)
- `prompts/chat-turn-writer-prompt.md` (new)

## Out of Scope

- Pipeline orchestration and turn assembly
- Chat Bible, Turn Planner, State Updater, or Summarizer implementation
- Server routes or UI
- Changing legacy page-writer architecture outside the chat pipeline
- Broad refactors to the chat model layer unless the writer stage exposes a small, concrete gap worth fixing in the same pass

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema/parser accepts a well-formed writer payload with `ACTION` and `SPEECH` blocks
2. Unit test: schema/parser rejects invalid block types
3. Unit test: schema/parser rejects malformed `turnMeta`
4. Unit test: prompt builder includes all required sections, including full speech fingerprint
5. Unit test: prompt builder includes controlled-imperfections guidance and the content policy block
6. Unit test: generation function calls `runLlmStage` with `chatWriter`
7. Unit test: generation rejects a writer payload whose block sequence diverges from `turnPlan.blockPlan`
8. Unit test: generation rejects `delivery` on `ACTION` blocks
9. Unit test: generation rejects over-limit action or speech block counts
10. Relevant targeted suites pass
11. `npm run typecheck` passes
12. `npm run lint` passes

### Invariants

1. Content policy block is always present in the system prompt
2. `ChatBlock.type` is strictly `ACTION | SPEECH`
3. `delivery` is permitted only on `SPEECH`
4. Writer output must preserve the planner's ordered `blockPlan`
5. Writer returns only visible turn content plus `turnMeta`, never hidden planning or final persisted turn assembly

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-writer-schema.test.ts`
   - validates schema parsing and malformed payload rejection
2. `test/unit/llm/prompts/chat/chat-writer-prompt.test.ts`
   - validates prompt structure and writer-specific instructions
3. `test/unit/llm/chat/chat-writer-generation.test.ts`
   - validates stage runner wiring and post-parse invariant enforcement

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns='chat-writer|chat-planner|chat-bible'`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completed: 2026-03-27
- What changed:
  - Added `chatWriter` schema, prompt builder, and generation wrapper using the existing chat-stage architecture
  - Enforced writer-stage invariants in code after parsing: planner block-plan alignment, `delivery` restricted to `SPEECH`, and action/speech block caps
  - Added prompt documentation plus alignment coverage for the new prompt source
  - Extracted shared chat prompt formatting for the bible formatter to avoid duplicating serialization logic between planner and writer
  - Exported `isTurnMeta` from the chat runtime validators so writer parsing could reuse canonical contracts instead of introducing local aliases
- Deviations from the original plan:
  - The implementation returns `{ writerTurn, rawResponse }` to match the established chat-stage generation contract rather than returning only the parsed payload
  - The pass included small supporting refactors and meta-test updates that the original ticket did not call out, because they were required for clean integration and long-term maintainability
  - The generation layer now enforces planner-coupled invariants instead of leaving them as prompt-only expectations
- Verification:
  - `npm run test:unit -- --runInBand --runTestsByPath test/unit/llm/chat/chat-bible-generation.test.ts test/unit/llm/chat/chat-planner-generation.test.ts test/unit/llm/chat/chat-writer-generation.test.ts test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/prompts/chat/chat-planner-prompt.test.ts test/unit/llm/prompts/chat/chat-writer-prompt.test.ts test/unit/llm/schemas/chat-bible-schema.test.ts test/unit/llm/schemas/chat-planner-schema.test.ts test/unit/llm/schemas/chat-writer-schema.test.ts`
  - `npm run test:unit -- --runInBand --runTestsByPath test/unit/llm/schemas/chat-writer-schema.test.ts test/unit/llm/prompts/chat/chat-writer-prompt.test.ts test/unit/llm/chat/chat-writer-generation.test.ts test/unit/llm/schemas/anthropic-schema-compatibility.test.ts test/unit/llm/prompt-doc-alignment.test.ts`
  - `npm run typecheck`
  - `npm run lint`
