# CHACHASYS-010: Chat Pipeline Orchestrator

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: None
**Deps**: Existing chat models, chat LLM generators, chat persistence primitives

## Problem

The chat pipeline orchestrator must coordinate the existing per-turn chat stages into a single flow for one completed character reply: conditionally refresh bible -> plan -> write -> update state -> conditionally summarize. It decides when bible refresh and rolling summary should run, applies the state update to the in-memory session, and returns data for the service layer to persist.

## Assumption Reassessment (2026-03-27)

1. The stage generators already exist in `src/llm/chat/`:
   - `generateChatBible`
   - `generateChatTurnPlan`
   - `generateChatWriterTurn`
   - `generateChatStateUpdate`
   - `generateChatSummary`
2. The character chat spec describes a 4-stage per-turn pipeline plus optional rolling summarization. Summary is not a core turn-production stage; it is a conditional post-step.
3. `ChatSession` supports immutable updates, but its persisted shape is narrower than this ticket originally assumed:
   - `rollingSummary` is currently `string | null`, not `RollingSummaryOutput | null`
   - there is no persisted field for commitments, threats, open questions, resolved questions, or object-state history
4. The orchestrator should not accept raw `userMessage` plus `parsedUserBlocks` and reconstruct a USER turn internally. That blurs service-layer and pipeline responsibilities and creates ambiguity around `turnNumber` and `timestamp`.
5. The clean boundary is: the service layer parses and persists the USER turn first, then passes the canonical `latestUserTurn` into the pipeline.
6. Bible refresh can only react to prior known state, not to the location change detected later in the same turn. In practice, location changes matter because the previous turn's `stateUpdate.shouldRefreshChatBible` flag can force the next-turn refresh.
7. Summary generation should store `summary.compressedSummary` in `ChatSession.rollingSummary` for now, because that is the current persisted contract. The richer summary payload is generated but not retained by the session model in this ticket.
8. The original dependency references `CHACHASYS-001` and `CHACHASYS-005` through `CHACHASYS-009`, but those ticket files are not present in `tickets/`. This implementation must rely on the codebase as the source of truth rather than nonexistent ticket chain links.

## Architecture Check

1. A single `runChatPipeline` function is still the right shape, but it should orchestrate the existing generator functions directly. The original phrase "no direct LLM calls" was too strict and misleading, because the orchestrator's job is specifically to sequence those stage wrappers.
2. State application should be a separate pure helper. That keeps trigger logic and session mutation isolated and easy to test.
3. The orchestrator should return a `ChatPipelineResult` for persistence by the service layer. It must not write to disk, create the USER turn, or own route concerns.
4. The state applier must only update fields that actually exist on `ChatSession`. It must not invent storage for conversation bookkeeping or object history.
5. Avoid backwards-compatibility shims and aliases. Use the existing canonical chat types and function names directly.

## What to Change

### 1. Create `src/llm/chat/chat-pipeline.ts`

Define interfaces:

```typescript
interface ChatPipelineContext {
  readonly chatSession: ChatSession;
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly recentTurns: readonly ChatTurn[];
  readonly allTurns: readonly ChatTurn[];
  readonly latestUserTurn: ChatTurn; // Canonical persisted USER turn
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

1. Validate the pipeline boundary assumptions:
   - `latestUserTurn.speaker` must be `USER`
   - the pipeline must not fabricate a USER turn from raw strings
2. **Bible refresh decision**: refresh if:
   - `isSessionResume === true`
   - `chatSession.chatBible === null`
   - `chatSession.turnCount > 0 && chatSession.turnCount % 10 === 0`
   - the latest prior CHARACTER turn requested it via `stateUpdate?.shouldRefreshChatBible === true`
3. **Conditionally run Chat Bible Curator** and cache the result on the updated in-memory session
4. **Run Turn Planner** with chat bible + target character + recent turns + `latestUserTurn`
5. **Run Turn Writer** with planner output + target character + chat bible + recent turns + `latestUserTurn`
6. **Run Chat State Updater** with chat bible + `latestUserTurn` + planner output + writer output
7. **Assemble the CHARACTER turn** from writer output + planner output + state update
   - `speaker` must be `CHARACTER`
   - `turnNumber` must advance from the latest known transcript turn, not from `turnCount`
8. **Apply state updates** to the session:
   - clamp valence to `[-5, +5]`
   - clamp tension to `[0, 10]`
   - append new knowledge entries
   - remove corrected false beliefs
   - update physical context if `locationChanged === true`
   - increment `turnCount` by 1
   - update `updatedAt`
9. **Summary decision**: generate if:
   - `updatedSession.turnCount % 8 === 0`
   - or `stateUpdate.shouldTriggerSummary === true`
   - or `isSessionResume && updatedSession.turnCount > 8 && updatedSession.rollingSummary === null`
10. **Conditionally run Rolling Summary** and store `summary.compressedSummary` on `updatedSession.rollingSummary`
11. Return `ChatPipelineResult`

Implementation notes:

- Use the existing stage wrappers in `src/llm/chat/`; do not bypass them.
- Summary input should be derived from `allTurns` plus the new `characterTurn`, because the summarizer expects transcript turns rather than raw prompt fragments.
- Keep orchestration logic small and explicit. Do not add speculative abstraction layers around stage execution.

### 2. Create helper: `src/llm/chat/chat-state-applier.ts`

Pure function:

```typescript
function applyChatStateUpdate(
  session: ChatSession,
  stateUpdate: ChatStateUpdate,
  updatedAt?: string
): ChatSession
```

Handles:

- Relationship state: apply valence/tension deltas with clamping and update dynamic if provided
- Knowledge state: append new facts, suspicions, and revealed secrets without losing existing entries
- Knowledge state: remove corrected false beliefs
- Physical context: update location, micro-location, and distance band only when `locationChanged === true`
- Turn count increment
- Updated timestamp

Non-goals for the applier in this ticket:

- Do not attempt to persist `conversationUpdate` fields anywhere; `ChatSession` has no storage for them yet
- Do not attempt to mutate `interactableObjects` from `objectStateChanges`; the state update schema is descriptive, not structured enough for safe object-list mutation

## Files to Touch

- `src/llm/chat/chat-pipeline.ts` (new)
- `src/llm/chat/chat-state-applier.ts` (new)
- `src/llm/index.ts` (export new chat pipeline helpers if needed)

## Out of Scope

- Server routes or services
- Persistence writes or read orchestration
- Progress tracking or SSE
- UI or views
- Individual LLM stage implementation
- Widening `ChatSession.rollingSummary` from `string | null` to `RollingSummaryOutput | null`
- Adding new persisted chat-session fields for commitments, threats, questions, or object-state history

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: bible is refreshed on first turn (`chatBible === null`)
2. Unit test: bible is refreshed on session resume
3. Unit test: bible is refreshed every 10 completed character turns
4. Unit test: bible is refreshed when the latest prior CHARACTER turn requested it
5. Unit test: bible is not refreshed on a normal mid-conversation turn
6. Unit test: summary is generated every 8 completed character turns
7. Unit test: summary is generated when `stateUpdate.shouldTriggerSummary === true`
8. Unit test: summary is not generated on non-trigger turns
9. Unit test: state applier clamps valence to `[-5, +5]`
10. Unit test: state applier clamps tension to `[0, 10]`
11. Unit test: state applier appends new knowledge without losing existing entries
12. Unit test: state applier removes corrected false beliefs
13. Unit test: state applier updates physical context on location change
14. Unit test: state applier does not change physical context when no location change is signaled
15. Unit test: pipeline returns a correctly assembled CHARACTER `ChatTurn` with writer blocks + turnMeta + plannerOutput + stateUpdate
16. Unit test: pipeline stores `summary.compressedSummary` into `updatedSession.rollingSummary`
17. Unit test: pipeline rejects a non-USER `latestUserTurn`
18. Existing suite: `npm test` passes

### Invariants

1. The pipeline does not create or persist the USER turn
2. The pipeline never writes to disk
3. Valence always ends in `[-5, +5]`
4. Tension always ends in `[0, 10]`
5. Knowledge arrays only grow, except corrected false beliefs which may be removed
6. Physical context only changes when the state updater signals `locationChanged`
7. `turnCount` increments by exactly 1 per completed character reply
8. `ChatSession.rollingSummary` remains a string-backed field in this ticket; only `compressedSummary` is persisted

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` — pipeline orchestration and trigger logic with mocked stages
2. `test/unit/llm/chat/chat-state-applier.test.ts` — pure state application logic

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-pipeline|chat-state-applier'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-27
- What actually changed:
  - Added `runChatPipeline()` in `src/llm/chat/chat-pipeline.ts`
  - Added pure session mutation helper `applyChatStateUpdate()` in `src/llm/chat/chat-state-applier.ts`
  - Exported the new helpers from `src/llm/index.ts`
  - Added unit coverage for orchestration triggers, character-turn assembly, summary persistence, and state application invariants
- Deviations from the original plan:
  - The ticket was corrected to accept a canonical `latestUserTurn` instead of raw user text plus parsed blocks
  - Summary persistence stores only `compressedSummary` because `ChatSession.rollingSummary` remains `string | null`
  - The planned mocked integration test was replaced with focused unit coverage because the orchestrator still has no persistence or route integration boundary
  - The stale Jest CLI flag was corrected from `--testPathPattern` to `--testPathPatterns`
- Verification results:
  - `npm run test:unit -- --testPathPatterns='chat-pipeline|chat-state-applier'`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
