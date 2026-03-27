# CHACHASYS-008: Chat State Updater LLM Stage

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-001 (data models), CHACHASYS-004 (stage registration)

## Problem

The Chat State Updater is the fourth LLM stage. After the writer produces the character's turn, this stage extracts state changes: relationship shifts, knowledge changes, conversation updates, physical state updates, and signals for bible refresh or summary generation.

## Assumption Reassessment (2026-03-27)

1. `ChatStateUpdate` type from CHACHASYS-001 defines the full output shape with all nested interfaces.
2. State updates are applied to the `ChatSession` by the pipeline orchestrator (CHACHASYS-010), not by this stage.
3. The state updater receives the pre-turn bible, user message, planner output, and writer output.

## Architecture Check

1. Same 3-file pattern: schema + prompt + generation.
2. This stage is intentionally conservative (temperature 0.2) — it extracts facts, not generates prose.
3. The `shouldRefreshChatBible` and `shouldTriggerSummary` booleans are signals consumed by the pipeline.

## What to Change

### 1. Create `src/llm/schemas/chat-state-updater-schema.ts`

- JSON Schema matching `ChatStateUpdate` interface
- Nested schemas for relationship shifts, knowledge changes, conversation updates, physical state updates
- Response transformer: `transformChatStateUpdateResponse(raw: unknown): ChatStateUpdate`

### 2. Create `src/llm/prompts/chat/chat-state-updater-prompt.ts`

Build system and user messages per spec:
- System: extract only actual state changes, track relationship shifts when meaningful, track knowledge asymmetry, track commitments/threats/questions, track physical changes only if shown, signal bible/summary refresh, NC-21 content policy
- User sections: PRE-TURN CHAT BIBLE, LATEST USER MESSAGE, TURN PLAN, FINAL WRITTEN TURN

### 3. Create `src/llm/chat/chat-state-updater-generation.ts`

- `generateChatStateUpdate(context: ChatStateUpdaterContext, apiKey: string): Promise<ChatStateUpdate>`
- Uses `runLlmStage` with stage key `'chatStateUpdater'`

## Files to Touch

- `src/llm/schemas/chat-state-updater-schema.ts` (new)
- `src/llm/prompts/chat/chat-state-updater-prompt.ts` (new)
- `src/llm/chat/chat-state-updater-generation.ts` (new)

## Out of Scope

- Applying state updates to ChatSession (CHACHASYS-010)
- Pipeline orchestration (CHACHASYS-010)
- Other LLM stages
- Server routes or UI
- Prompt documentation markdown files (CHACHASYS-015)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: schema validates a ChatStateUpdate with all fields populated
2. Unit test: schema validates minimal ChatStateUpdate (empty arrays, no location change)
3. Unit test: response transformer handles nullable fields (`newLocation`, `newMicroLocation`, `newDistanceBand`)
4. Unit test: prompt builder includes all 4 user message sections
5. Unit test: prompt builder includes content policy in system message
6. Unit test: generation function uses `'chatStateUpdater'` stage key
7. Existing suite: `npm test` passes

### Invariants

1. Content policy block always present in system prompt
2. `suggestedValenceChange` constrained to -2..+2
3. `suggestedTensionChange` constrained to -2..+2
4. `shouldRefreshChatBible` and `shouldTriggerSummary` are always boolean (never nullable)
5. Stage does not modify any state — it only returns a description of changes

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-state-updater-schema.test.ts` — schema and transformer
2. `test/unit/llm/prompts/chat/chat-state-updater-prompt.test.ts` — prompt structure
3. `test/unit/llm/chat/chat-state-updater-generation.test.ts` — generation with mocked runner

### Commands

1. `npm run test:unit -- --testPathPattern='chat-state-updater'`
2. `npm run typecheck`
3. `npm test`
