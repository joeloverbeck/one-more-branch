# CHATTURNSAV-001: Defer user turn save until pipeline success

**Status**: PENDING
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

## Architecture Check

1. Deferring the user turn save until after pipeline success is the simplest fix: move the `saveTurn(userTurn)` call to after `runChatPipeline()` completes, saving it just before or alongside the character turn. This eliminates the failure-leaves-orphan problem without adding complexity.
2. No backwards-compatibility aliasing or shims. The change is internal to `chat-service.ts`.
3. Alternative considered: idempotency guard in `saveTurn()` (skip if turnNumber+speaker exists). Rejected because it adds complexity to a generic function and doesn't address the root cause (premature save).

## What to Change

### 1. Move user turn save in `chat-service.ts`

Move `await deps.saveTurn(params.chatId, userTurn)` from before `runChatPipeline()` to after it. Save the user turn only when the pipeline has succeeded, before saving the character turn.

The order after the change should be:
1. Create user turn object (in memory only)
2. Run the full chat pipeline
3. On success: save user turn, save character turn, save session
4. On failure: nothing is persisted, user can cleanly retry

### 2. Verify the user turn is still passed to the pipeline correctly

The pipeline receives the user turn via the `ChatGenerationContext`, not from disk. Confirm that `recentTurns` and `latestUserTurn` are constructed from the in-memory turn object, not loaded from `turns.json`. If the pipeline reads recent turns from disk, the in-memory user turn must be appended to the loaded turns before passing to the pipeline.

### 3. Clean up existing duplicate turns (manual or documented)

Document that the existing `turns.json` with duplicate turns should be manually cleaned (delete the orphaned USER turns, keep only the last USER turn followed by its CHARACTER response). This is a one-time data fix, not a code change.

## Files to Touch

- `src/server/services/chat-service.ts` (modify)

## Out of Scope

- Client-side double-submission prevention (the `inFlight` flag already exists in `app.js`)
- Idempotency guards in `saveTurn()` (not needed with deferred save)
- Retry logic or automatic retry on pipeline failure
- Modifying `chat-repository.ts` or `chat-pipeline.ts`

## Acceptance Criteria

### Tests That Must Pass

1. When `runChatPipeline()` throws, `saveTurn()` must NOT have been called for the user turn
2. When `runChatPipeline()` succeeds, both user turn and character turn are saved in order
3. The pipeline still receives the correct `latestUserTurn` and `recentTurns` (including the current user turn) even though it hasn't been persisted yet
4. Existing suite: `npm test`

### Invariants

1. A user turn must never be persisted to `turns.json` without a corresponding character turn following it (except for the in-flight turn being currently generated)
2. `turns.json` must never contain duplicate `turnNumber` values for the same `speaker`

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — verify saveTurn is not called before pipeline, verify both turns saved on success, verify no save on pipeline failure

### Commands

1. `npm run test:unit -- --testPathPattern="chat-service"`
2. `npm run lint && npm run typecheck && npm test`
