# CHACHASYS-009: Chat Rolling Summary LLM Stage

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Rolling Summary stage compresses older chat turns into a factual summary for long conversation memory management. It runs every 8 turns (or on session resume with >8 turns and no existing summary). The summary focuses on facts, commitments, power dynamics — not sentiment.

## Assumption Reassessment (2026-03-27)

1. `RollingSummaryOutput` type from CHACHASYS-001 defines the output shape.
2. The summary is additive — new summaries incorporate the existing summary plus new turns to compress.
3. This is the simplest of the 5 LLM stages (straightforward compression, no complex reasoning).

## Architecture Check

1. Same 3-file pattern: schema + prompt + generation.
2. Temperature 0.2 (factual compression, not creative).
3. The summary does NOT delete turns — raw turns are preserved in turns.json. The summary is stored in chat.json for use as context in future bible/planner calls.

## What to Change

### 1. Create `src/llm/schemas/chat-summary-schema.ts`

- JSON Schema matching `RollingSummaryOutput` interface
- Response transformer: `transformChatSummaryResponse(raw: unknown): RollingSummaryOutput`

### 2. Create `src/llm/prompts/chat/chat-summary-prompt.ts`

Build system and user messages per spec:
- System: compress turns into factual summary, focus on commitments/lies/confessions/unresolved questions/leverage shifts/exact factual disclosures, do not summarize sentiment, preserve continuity info
- User sections: EXISTING ROLLING SUMMARY, TURNS TO COMPRESS
- Note: No content policy block needed (this is compression, not generation)

### 3. Create `src/llm/chat/chat-summary-generation.ts`

- `generateChatSummary(context: ChatSummaryContext, apiKey: string): Promise<RollingSummaryOutput>`
- Uses `runLlmStage` with stage key `'chatSummarizer'`

## Files to Touch

- `src/llm/schemas/chat-summary-schema.ts` (new)
- `src/llm/prompts/chat/chat-summary-prompt.ts` (new)
- `src/llm/chat/chat-summary-generation.ts` (new)

## Out of Scope

- Summary trigger logic (CHACHASYS-010)
- Pipeline orchestration (CHACHASYS-010)
- Other LLM stages
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates a well-formed RollingSummaryOutput
2. Unit test: response transformer produces typed RollingSummaryOutput
3. Unit test: prompt builder includes existing summary section when provided
4. Unit test: prompt builder omits existing summary section when null
5. Unit test: prompt builder formats turns-to-compress with speaker labels and block text
6. Unit test: generation function uses `'chatSummarizer'` stage key
7. Existing suite: `npm test` passes

### Invariants

1. Summary is always a string (never null in the output — null is only valid in `ChatSession.rollingSummary` before first generation)
2. Raw turns in turns.json are never deleted by this stage
3. Summary focuses on facts, not sentiment (enforced by prompt, not schema)
4. Stage does not modify ChatSession — it returns a result for the pipeline to apply

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-summary-schema.test.ts` — schema and transformer
2. `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-summary-generation.test.ts` — generation with mocked runner

### Commands

1. `npm run test:unit -- --testPathPattern='chat-summary'`
2. `npm run typecheck`
3. `npm test`
