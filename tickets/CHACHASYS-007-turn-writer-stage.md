# CHACHASYS-007: Turn Writer LLM Stage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Turn Writer is the third LLM stage. It takes the planner output, speech fingerprint, bible, and recent turns, then produces the character's actual dialogue and action blocks with delivery tags and turn metadata.

## Assumption Reassessment (2026-03-27)

1. Writer output is `ChatBlock[]` + `TurnMeta` — these types are defined in CHACHASYS-001.
2. The writer must respect the planner's `blockPlan` sequence (e.g., `['ACTION', 'SPEECH', 'ACTION']`).
3. Maximum 2 ACTION blocks and 3 SPEECH blocks per turn (spec constraint).
4. SPEECH blocks include an optional `delivery` field (e.g., 'clipped', 'warm', 'dry').

## Architecture Check

1. Same 3-file pattern: schema + prompt + generation.
2. Writer output includes `blocks` and `turnMeta` — combined into a single response object.
3. The writer does NOT produce the full ChatTurn — that's assembled by the pipeline.

## What to Change

### 1. Create `src/llm/schemas/chat-writer-schema.ts`

- JSON Schema for writer response: `{ blocks: ChatBlock[], turnMeta: TurnMeta }`
- ChatBlock schema: `type` enum (ACTION/SPEECH), optional `delivery` string, `text` string
- TurnMeta schema: `expectsReply` bool, `endsWithQuestion` bool, `visibleEmotion` string, nullable `finalPressure`
- Response transformer: `transformChatWriterResponse(raw: unknown): ChatWriterResult`

### 2. Create `src/llm/prompts/chat/chat-writer-prompt.ts`

Build system and user messages per spec:
- System: write one in-world turn, chat not prose, ACTION concise/visible/non-omniscient, SPEECH carries voice, follow planner's honesty mode/subtext/action plan, respect knowledge boundaries, max 2 ACTION + 3 SPEECH, controlled imperfections, NC-21 content policy
- User sections: TARGET CHARACTER NAME, FULL SPEECH FINGERPRINT, CHAT BIBLE, TURN PLAN, RECENT CHAT TURNS, LATEST USER MESSAGE

### 3. Create `src/llm/chat/chat-writer-generation.ts`

- `generateChatWriterTurn(context: ChatWriterContext, apiKey: string): Promise<ChatWriterResult>`
- Uses `runLlmStage` with stage key `'chatWriter'`
- Define `ChatWriterResult` interface: `{ blocks: readonly ChatBlock[]; turnMeta: TurnMeta }`

## Files to Touch

- `src/llm/schemas/chat-writer-schema.ts` (new)
- `src/llm/prompts/chat/chat-writer-prompt.ts` (new)
- `src/llm/chat/chat-writer-generation.ts` (new)

## Out of Scope

- Pipeline orchestration (CHACHASYS-010)
- Other LLM stages
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)
- Modifying existing writer code (`src/llm/writer-generation.ts`)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates well-formed writer response with ACTION + SPEECH blocks
2. Unit test: schema enforces block type enum (ACTION | SPEECH only)
3. Unit test: schema allows optional `delivery` on SPEECH blocks
4. Unit test: response transformer produces typed ChatWriterResult
5. Unit test: prompt builder includes speech fingerprint section with all sub-fields
6. Unit test: prompt builder includes controlled imperfections directive
7. Unit test: generation function calls `runLlmStage` with `'chatWriter'` key
8. Existing suite: `npm test` passes

### Invariants

1. Content policy block always present in system prompt
2. Block type is strictly 'ACTION' | 'SPEECH'
3. `delivery` field only appears on SPEECH blocks (schema does not enforce this — runtime validation if needed)
4. Writer never produces choices or isEnding (this is chat, not story)

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-writer-schema.test.ts` — schema and transformer
2. `test/unit/llm/prompts/chat/chat-writer-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-writer-generation.test.ts` — generation with mocked runner

### Commands

1. `npm run test:unit -- --testPathPattern='chat-writer'`
2. `npm run typecheck`
3. `npm test`
