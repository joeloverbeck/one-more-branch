# CHACHASYS-010: Chat Pipeline Orchestrator

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: None
**Deps**: CHACHASYS-001, CHACHASYS-005, CHACHASYS-006, CHACHASYS-007, CHACHASYS-008, CHACHASYS-009

## Problem

The chat pipeline orchestrator coordinates all 5 LLM stages into a single per-turn flow: conditionally refresh bible → plan → write → update state → conditionally summarize. It manages bible refresh triggers, summary triggers, and applies state updates to produce an updated session.

## Assumption Reassessment (2026-03-27)

1. All 5 generation functions exist (from CHACHASYS-005 through CHACHASYS-009).
2. `ChatSession` type supports immutable updates (spread + override pattern).
3. Bible refresh triggers: session start, state updater flag, location change, every 10 turns.
4. Summary triggers: every 8 turns, session resume with >8 turns and no summary.

## Architecture Check

1. Single `runChatPipeline` function — pure orchestration, no direct LLM calls.
2. State update application is pure: clamp valence to [-5, +5], tension to [0, 10], append knowledge entries.
3. Pipeline returns `ChatPipelineResult` which the service layer persists (separation of concerns).

## What to Change

### 1. Create `src/llm/chat/chat-pipeline.ts`

Define interfaces:
```typescript
interface ChatPipelineContext {
  readonly chatSession: ChatSession;
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly recentTurns: readonly ChatTurn[];
  readonly allTurns: readonly ChatTurn[];  // For summary generation
  readonly userMessage: string;
  readonly parsedUserBlocks: readonly ChatBlock[];
  readonly isSessionResume: boolean;
}

interface ChatPipelineResult {
  readonly characterTurn: ChatTurn;
  readonly updatedSession: ChatSession;
  readonly bibleWasRefreshed: boolean;
  readonly summaryWasGenerated: boolean;
}
```

Implement `runChatPipeline(context, apiKey): Promise<ChatPipelineResult>`:

1. **Bible refresh decision**: Refresh if:
   - `isSessionResume === true`
   - `chatSession.chatBible === null` (first turn)
   - `chatSession.turnCount % 10 === 0` (safety net)
   - Previous turn's `stateUpdate?.shouldRefreshChatBible === true`
2. **Conditionally run Chat Bible Curator** → cache result on session
3. **Run Turn Planner** with bible + fingerprint + recent turns + user message
4. **Run Turn Writer** with planner output + fingerprint + bible + recent turns + user message
5. **Run Chat State Updater** with bible + user message + planner output + writer output
6. **Apply state updates** to session:
   - Clamp valence to [-5, +5], tension to [0, 10]
   - Append new knowledge entries (facts, suspicions, secrets)
   - Remove corrected false beliefs
   - Update physical context if location changed
   - Increment turnCount
   - Update updatedAt timestamp
7. **Summary decision**: Generate if:
   - `(updatedSession.turnCount) % 8 === 0`
   - OR `stateUpdate.shouldTriggerSummary === true`
   - OR (`isSessionResume && turnCount > 8 && rollingSummary === null`)
8. **Conditionally run Rolling Summary** → update session's rollingSummary
9. **Assemble ChatTurn** for the character response
10. **Return result**

### 2. Create helper: `src/llm/chat/chat-state-applier.ts`

Pure function:
```typescript
function applyChatStateUpdate(
  session: ChatSession,
  stateUpdate: ChatStateUpdate,
): ChatSession
```

Handles:
- Relationship state: apply valence/tension deltas with clamping, update dynamic if provided
- Knowledge state: append new facts/suspicions/secrets, remove corrected false beliefs
- Physical context: update location/microLocation/distanceBand if changed, update object state
- Turn count increment
- Updated timestamp

## Files to Touch

- `src/llm/chat/chat-pipeline.ts` (new)
- `src/llm/chat/chat-state-applier.ts` (new)

## Out of Scope

- Server routes or services (CHACHASYS-011, CHACHASYS-012)
- Persistence (reading/writing to disk — that's the service layer)
- Progress tracking/SSE (CHACHASYS-012)
- UI/views
- Individual LLM stage implementation (CHACHASYS-005-009)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: bible is refreshed on first turn (chatBible === null)
2. Unit test: bible is refreshed on session resume
3. Unit test: bible is refreshed every 10 turns
4. Unit test: bible is NOT refreshed on normal mid-conversation turns
5. Unit test: summary is generated every 8 turns
6. Unit test: summary is NOT generated on non-trigger turns
7. Unit test: state applier clamps valence to [-5, +5]
8. Unit test: state applier clamps tension to [0, 10]
9. Unit test: state applier appends new knowledge without losing existing
10. Unit test: state applier removes corrected false beliefs
11. Unit test: state applier updates physical context on location change
12. Unit test: state applier does NOT change physical context when no location change
13. Unit test: pipeline returns correctly assembled ChatTurn with writer blocks + turnMeta + plannerOutput + stateUpdate
14. Integration test: full pipeline with all 5 stages mocked runs to completion
15. Existing suite: `npm test` passes

### Invariants

1. User turn is NOT created by the pipeline — only the CHARACTER turn is returned
2. Pipeline never persists anything — it returns results for the service to persist
3. Valence always in [-5, +5], tension always in [0, 10] after state application
4. Knowledge arrays only grow (except false beliefs which can be corrected/removed)
5. Physical context only changes when state updater signals location change
6. Turn count always increments by 1

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` — pipeline orchestration with mocked stages
2. `test/unit/llm/chat/chat-state-applier.test.ts` — pure state application logic
3. `test/integration/chat-pipeline/chat-pipeline.test.ts` — full pipeline integration

### Commands

1. `npm run test:unit -- --testPathPattern='chat-pipeline|chat-state-applier'`
2. `npm run test:integration -- --testPathPattern='chat-pipeline'`
3. `npm run typecheck`
4. `npm test`
