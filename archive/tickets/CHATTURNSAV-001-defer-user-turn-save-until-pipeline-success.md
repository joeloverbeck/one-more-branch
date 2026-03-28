# CHATTURNSAV-001: Defer user turn save until pipeline success

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None

## Problem

When a user sends a message in chat, the user turn is saved to `turns.json` immediately (before the LLM pipeline runs). If the pipeline fails, the user turn persists but the session `turnCount` is not incremented. On retry, a new user turn with the same `turnNumber` is appended, creating duplicates.

**Evidence**: The sole existing chat in `chats/*/turns.json` contains 3 USER turns all with `turnNumber: 1` (timestamps spanning ~2.5 hours of retries) before the first CHARACTER response.

**Root cause**: In `chat-service.ts`, `saveTurn(chatId, userTurn)` is called at line ~235, before `runChatPipeline()`. The pipeline can fail at any stage (scene context, character context, planner, writer, state updater, summary), but the user turn is already on disk.

## Assumption Reassessment (2026-03-28)

1. User turn is saved at line ~235 of `chat-service.ts` before `runChatPipeline()` — CONFIRMED by code read.
2. `saveTurn()` in `chat-repository.ts` always appends to the turns array with no deduplication — CONFIRMED.
3. `session.turnCount` is only incremented inside `applyChatStateUpdate()` which runs after successful pipeline completion — CONFIRMED.
4. The route handler catches `LLMError` and returns 500 without rolling back the saved user turn — CONFIRMED.
5. `turns.json` in the existing chat contains 3 duplicate USER turns with `turnNumber: 1` — CONFIRMED by reading the file.
6. The pipeline context currently depends on the just-saved user turn being present in both `recentTurns` and `allTurns`, because `chat-service.ts` persists first and only then loads transcript state — CONFIRMED.
7. Prompt builders render `RECENT CHAT TURNS` and `LATEST USER TURN` separately, but existing pipeline tests still model `recentTurns`/`allTurns` as including the latest user turn. This ticket must preserve current pipeline inputs unless a broader prompt-contract cleanup is explicitly taken on — CONFIRMED.

## Architecture Check

1. Deferring the user turn save until after pipeline success is better than the current behavior because it restores the core invariant: a failed generation must not mutate persisted chat history.
2. The implementation cannot simply move `saveTurn(userTurn)` lower. Today the pipeline receives `recentTurns` and `allTurns` that already include the persisted user turn. After deferral, `chat-service.ts` must reconstruct those arrays in memory by loading prior turns and appending `userTurn` before invoking the pipeline.
3. The cleaner long-term architecture would be an atomic chat-turn commit that persists the user turn, character turn, and updated session together under one chat-level transaction/lock. That is a better end state than the current split writes, but it is larger than this ticket and not required to fix the duplicate-orphan bug.
4. Alternative considered: idempotency guard in `saveTurn()` (skip if turnNumber+speaker exists). Rejected because it adds complexity to a generic append primitive and still permits partially-persisted failed turns.

## What to Change

### 1. Move user turn save in `chat-service.ts`

Move `await deps.saveTurn(params.chatId, userTurn)` from before `runChatPipeline()` to after it. Save the user turn only when the pipeline has succeeded, before saving the character turn.

The order after the change should be:
1. Create user turn object (in memory only)
2. Load persisted transcript state
3. Reconstruct pipeline transcript inputs in memory by appending the in-memory `userTurn`
4. Run the full chat pipeline
5. On success: save user turn, save character turn, save session
6. On failure: nothing is persisted, user can cleanly retry

### 2. Preserve current pipeline transcript semantics

Preserve the current `ChatPipelineContext` contract as exercised by tests:
- `latestUserTurn` is the in-memory user turn
- `allTurns` includes prior persisted turns plus the in-memory user turn
- `recentTurns` mirrors the recent tail of that transcript and still includes the in-memory user turn

This ticket does **not** change prompt/pipeline contracts. It only changes when persistence happens.

### 3. Clean up existing duplicate turns (manual or documented)

Document that the existing `turns.json` with duplicate turns should be manually cleaned (delete the orphaned USER turns, keep only the last USER turn followed by its CHARACTER response). This is a one-time data fix, not a code change.

## Files to Touch

- `src/server/services/chat-service.ts` (modify)

## Out of Scope

- Client-side double-submission prevention (the `inFlight` flag already exists in `app.js`)
- Idempotency guards in `saveTurn()` (not needed with deferred save)
- Retry logic or automatic retry on pipeline failure
- Reworking persistence into an atomic `commitChatTurn` repository API
- Modifying `chat-repository.ts` or `chat-pipeline.ts`

## Acceptance Criteria

### Tests That Must Pass

1. When `runChatPipeline()` throws, `saveTurn()` must NOT have been called for the user turn
2. When `runChatPipeline()` succeeds, both user turn and character turn are saved in order
3. The pipeline still receives the correct `latestUserTurn`, `recentTurns`, and `allTurns`, with `recentTurns`/`allTurns` including the current user turn even though it has not been persisted yet
4. Relevant unit tests, lint, typecheck, and the full test suite pass

### Invariants

1. A user turn must never be persisted to `turns.json` without a corresponding character turn following it (except for the in-flight turn being currently generated)
2. `turns.json` must never contain duplicate `turnNumber` values for the same `speaker`

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — verify the pipeline runs before persistence, verify both turns save on success in order, verify no turns save on pipeline failure, and verify the in-memory transcript passed to the pipeline still includes the latest user turn

### Commands

1. `npm run test:unit -- --testPathPatterns=chat-service`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completed: 2026-03-28
- Actual changes:
  - Deferred user-turn persistence in `chat-service.ts` until after successful pipeline completion.
  - Preserved current pipeline semantics by reconstructing `recentTurns` and `allTurns` in memory with the in-flight user turn before invoking the pipeline.
  - Strengthened `chat-service` unit coverage for persistence ordering, pipeline-failure non-persistence, and transcript-context reconstruction.
- Deviations from original plan:
  - The ticket originally implied the pipeline only needed `latestUserTurn` separately from persisted transcript state. Code and tests showed that `recentTurns` and `allTurns` also had to continue including the latest in-flight user turn, so the implementation explicitly preserved that contract.
  - The focused test command in the original ticket used the obsolete Jest `--testPathPattern` flag and was corrected to `--testPathPatterns`.
- Verification:
  - `npm run test:unit -- --testPathPatterns=chat-service`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
