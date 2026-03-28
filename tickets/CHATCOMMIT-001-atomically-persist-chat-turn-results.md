# CHATCOMMIT-001: Atomically persist chat turn results

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CHATTURNSAV-001-defer-user-turn-save-until-pipeline-success.md`

## Problem

`chat-service.sendTurn()` still persists a successful turn through three separate writes: user turn, character turn, then session. The recent fix for orphaned user turns removed the main failure mode, but the architecture still allows narrower partial-write states if one of the later writes fails after an earlier one succeeds.

That means chat persistence still does not guarantee that transcript state and session state advance as one atomic unit. For a system that treats a generated chat exchange as one logical commit, that is the wrong boundary.

## Assumption Reassessment (2026-03-28)

1. `src/server/services/chat-service.ts` currently performs three sequential writes after pipeline success: `saveTurn(userTurn)`, `saveTurn(characterTurn)`, then `saveChat(updatedSession)` — CONFIRMED.
2. `src/persistence/chat-repository.ts` already has a shared chat-level lock key via `getChatLockKey(chatId)`, and both session and turn stores use that lock namespace — CONFIRMED.
3. There is no current repository API that atomically persists the transcript turns and updated session together under one repository operation — CONFIRMED.
4. The deferred-save fix in `archive/tickets/CHATTURNSAV-001-defer-user-turn-save-until-pipeline-success.md` solved the duplicate-orphan bug, but it intentionally left the split-write architecture in place — CONFIRMED.
5. The right scope for this ticket is repository/API cleanup plus service adoption. It should not alter prompt, pipeline, or transcript-shaping behavior — CORRECTED SCOPE.

## Architecture Check

1. A single repository operation such as `commitChatTurn(chatId, { userTurn, characterTurn, updatedSession })` is cleaner than coordinating multiple writes from the service layer because it makes the persistence boundary match the domain boundary: one successful exchange commit.
2. This approach is more robust than adding more guards around `saveTurn()` or `saveChat()` because it prevents partial success states instead of merely trying to detect or compensate for them later.
3. The change should replace the split write path, not coexist with compatibility aliases or fallback persistence branches.
4. This also improves extensibility: future chat-commit concerns such as audit metadata, transcript validation, or checkpointing have one canonical repository entry point.

## What to Change

### 1. Add a canonical atomic chat commit repository API

Add a new repository operation in `src/persistence/chat-repository.ts` that:
- acquires the existing chat lock once
- validates `userTurn`, `characterTurn`, and `updatedSession`
- loads existing persisted turns
- appends the two new turns in order
- persists the updated transcript and session within the same locked operation

Prefer a single canonical API for this path, for example:

`commitChatTurn(chatId, { userTurn, characterTurn, updatedSession })`

The API should enforce that:
- `updatedSession.id === chatId`
- `userTurn.speaker === 'USER'`
- `characterTurn.speaker === 'CHARACTER'`
- `characterTurn.turnNumber === userTurn.turnNumber + 1`

### 2. Move `chat-service` to the repository commit boundary

Update `src/server/services/chat-service.ts` so that successful pipeline completion calls the new atomic repository API instead of issuing separate `saveTurn()` and `saveChat()` calls.

The service should remain responsible for:
- building the in-memory user turn
- reconstructing `recentTurns` and `allTurns` for the pipeline
- invoking the pipeline

The repository should become responsible for persisting the successful result as one operation.

### 3. Preserve transcript and session semantics

Do not change:
- how `recentTurns`, `allTurns`, or `latestUserTurn` are constructed for the pipeline
- session `turnCount` semantics
- prompt contracts
- transcript ordering

This ticket is about commit atomicity, not behavior changes in generation or prompt formatting.

### 4. Tighten repository and service tests around atomicity

Add or update tests to verify:
- a successful commit persists both turns and the updated session together
- invalid commit payloads are rejected before partial persistence
- `chat-service` delegates successful persistence through the new canonical repository API
- failures inside the atomic commit do not leave partial transcript/session state behind

## Files to Touch

- `src/persistence/chat-repository.ts` (modify)
- `src/persistence/index.ts` (modify, if export surface changes)
- `src/server/services/chat-service.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)
- `test/unit/server/services/chat-service.test.ts` (modify)

## Out of Scope

- Reworking `runChatPipeline()` or prompt contracts
- Cleaning up historical duplicate transcript data
- Changing chat transcript file format
- Adding backwards-compatibility wrappers that preserve the old split-write call pattern indefinitely
- Cross-process transactional guarantees beyond the existing in-process lock model

## Acceptance Criteria

### Tests That Must Pass

1. A successful chat-turn commit persists the user turn, character turn, and updated session as one repository operation
2. If commit validation or write fails, no partial transcript/session state is left behind
3. `chat-service.sendTurn()` no longer coordinates persistence through separate `saveTurn()`/`saveChat()` success writes
4. Existing suite: `npm test`

### Invariants

1. A successful chat exchange is persisted through exactly one canonical repository commit path
2. Persisted chat transcript state and persisted chat session state must never represent different logical turns after a successful commit attempt returns

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/chat-repository.test.ts` — verify the new atomic commit API persists transcript and session together and rejects invalid commit payloads without partial writes
2. `test/unit/server/services/chat-service.test.ts` — verify `sendTurn()` delegates persistence through the atomic commit path and no longer performs split success writes

### Commands

1. `npm run test:unit -- --testPathPatterns=chat-repository|chat-service`
2. `npm run lint && npm run typecheck && npm test`
