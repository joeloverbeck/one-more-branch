# CHACHASYS-006: Turn Planner LLM Stage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Turn Planner is the second LLM stage in the per-turn pipeline. It receives the cached bible, speech fingerprint, recent turns, and the latest user message, then produces a structured plan for the character's response including speech act, honesty mode, subtext, action plan, and expected impact.

## Assumption Reassessment (2026-03-27)

1. `TurnPlannerOutput` type defined in CHACHASYS-001 with all nested types (SpeechAct, HonestyMode, ActionPlanItem, etc.).
2. Existing planner patterns in `src/llm/planner-generation.ts` — follow similar generation structure but with chat-specific context.
3. `StandaloneDecomposedCharacter` provides `speechFingerprint` field with catchphrases, vocabulary, verbal tics, etc.

## Architecture Check

1. Same 3-file pattern: schema + prompt + generation.
2. Planner output is stored on the `ChatTurn` for debugging/observability but not shown to the user.
3. The planner's `blockPlan` field tells the writer the sequence of ACTION/SPEECH blocks to produce.

## What to Change

### 1. Create `src/llm/schemas/chat-planner-schema.ts`

- JSON Schema matching `TurnPlannerOutput` interface
- `SpeechAct` enum (10 values), `HonestyMode` enum (4 values), `ActionPlanKind` enum (5 values)
- Response transformer: `transformChatPlannerResponse(raw: unknown): TurnPlannerOutput`

### 2. Create `src/llm/prompts/chat/chat-planner-prompt.ts`

Build system and user messages per spec:
- System: plan one turn, respect decision pattern/conflicts/false beliefs/knowledge boundaries, physical reality as constraints, internal self-check, NC-21 content policy
- User sections: CHAT BIBLE, TARGET CHARACTER SPEECH FINGERPRINT, RECENT CHAT TURNS, LATEST USER MESSAGE

### 3. Create `src/llm/chat/chat-planner-generation.ts`

- `generateChatTurnPlan(context: ChatPlannerContext, apiKey: string): Promise<TurnPlannerOutput>`
- Uses `runLlmStage` with stage key `'chatPlanner'`

## Files to Touch

- `src/llm/schemas/chat-planner-schema.ts` (new)
- `src/llm/prompts/chat/chat-planner-prompt.ts` (new)
- `src/llm/chat/chat-planner-generation.ts` (new)

## Out of Scope

- Pipeline orchestration (CHACHASYS-010)
- Other LLM stages
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)
- Modifying existing planner code (`src/llm/planner-generation.ts`)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates a well-formed TurnPlannerOutput
2. Unit test: schema enforces SpeechAct enum to 10 valid values
3. Unit test: schema enforces HonestyMode enum to 4 valid values
4. Unit test: response transformer produces typed TurnPlannerOutput
5. Unit test: prompt builder includes content policy in system message
6. Unit test: prompt builder renders all 4 user message sections
7. Unit test: generation function calls `runLlmStage` with `'chatPlanner'` key
8. Existing suite: `npm test` passes

### Invariants

1. Content policy block always present in system prompt
2. Schema uses `anyOf` for nullable fields (`suppressedEmotion`, `questionBack`)
3. `blockPlan` array only allows 'ACTION' | 'SPEECH' values
4. `expectedImpact.relationshipDeltaHint` constrained to -2..+2
5. `expectedImpact.tensionDeltaHint` constrained to -2..+2

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-planner-schema.test.ts` — schema validation and transformer
2. `test/unit/llm/prompts/chat/chat-planner-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-planner-generation.test.ts` — generation with mocked runner

### Commands

1. `npm run test:unit -- --testPathPattern='chat-planner'`
2. `npm run typecheck`
3. `npm test`
