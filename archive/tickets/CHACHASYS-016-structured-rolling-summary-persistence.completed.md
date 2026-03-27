# CHACHASYS-016: Structured Rolling Summary Persistence

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: [specs/character-chat-system.md](/home/joeloverbeck/projects/one-more-branch/specs/character-chat-system.md), [archive/tickets/CHACHASYS-001-data-models.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-001-data-models.md), [archive/tickets/CHACHASYS-002-persistence-layer.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-002-persistence-layer.completed.md), [archive/tickets/CHACHASYS-009-rolling-summary-stage.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-009-rolling-summary-stage.md), [archive/tickets/CHACHASYS-010-chat-pipeline.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHACHASYS-010-chat-pipeline.completed.md)

## Problem

`RollingSummaryOutput` already exists as the structured summary contract, but `ChatSession.rollingSummary` still persists only a lossy `string | null`. That mismatch discards commitments, revelations, unresolved questions, leverage shifts, and emotional trajectory immediately after summary generation.

## Assumption Reassessment (2026-03-27)

1. The summary generator already returns structured `RollingSummaryOutput`, while the persisted `ChatSession.rollingSummary` shape still stores only `string | null`.
2. `runChatPipeline()` currently keeps only `summary.compressedSummary` when updating the session, so the data loss is happening in orchestration/persistence rather than in the summary stage.
3. Active tickets `CHACHASYS-011` through `CHACHASYS-015` still exist, but they do not own the canonical chat-session persistence contract. `CHACHASYS-011` already treats this ticket as the dependency that may define the final `rollingSummary` shape.
4. The character chat spec still reflects the older string-backed `ChatSession.rollingSummary` contract and should be updated when the canonical model changes.
5. Not every downstream chat object should be forced to adopt `RollingSummaryOutput` wholesale. Some prompt-layer contracts intentionally consume formatted summary text rather than the raw persisted object.

## Architecture Check

1. Persisting the full `RollingSummaryOutput` is cleaner than collapsing it to a string because it preserves all already-generated continuity signals in one canonical stored object.
2. The durable chat-session contract should align with the summary-stage output, but prompt-boundary models may still use deliberately formatted text when that is the cleaner interface for a given LLM stage.
3. No backwards-compatibility aliasing, dual-read, or dual-write storage should be introduced. Update the canonical `ChatSession` contract directly and fix fallout at compile time.
4. This ticket should stay narrowly focused on domain and persistence truth plus the prompt-boundary adapters required to consume it safely. It should not redesign the generated `ChatBible` schema unless a direct mismatch forces that change.

## What to Change

### 1. Update chat domain contracts

- Change `ChatSession.rollingSummary` from `string | null` to `RollingSummaryOutput | null`
- Update chat validation helpers and representative fixtures accordingly
- Update [specs/character-chat-system.md](/home/joeloverbeck/projects/one-more-branch/specs/character-chat-system.md) so the spec matches the canonical implemented contract

### 2. Update persistence and pipeline integration

- Update persisted session parsing/validation so `chat.json` stores the full structured rolling summary object
- Update `runChatPipeline()` so it stores the full summary object, not only `compressedSummary`
- Update the rolling-summary prompt boundary types so summarizer inputs can receive the full structured prior summary object
- Add explicit formatting helpers for prompt builders that need text, so structured summaries are rendered intentionally and never via implicit object coercion
- Keep `ChatBible.conversationNow.rollingSummary` string-backed unless a direct mismatch is discovered; it is a curated prompt payload, not the persisted session source of truth

### 3. Propagate contract assumptions

- Update only active chat tickets/spec text that incorrectly claims the persisted session summary is string-backed or otherwise owns this contract
- Keep scope limited to canonical contract propagation, not new UI presentation features

## Files to Touch

- `tickets/CHACHASYS-016-structured-rolling-summary-persistence.md` (new)
- `specs/character-chat-system.md` (modify)
- `src/models/chat/chat-session.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)
- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/llm/chat/chat-bible-generation.ts` (modify)
- `src/llm/chat/chat-summary-generation.ts` (modify)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (modify)
- `src/llm/prompts/chat/chat-summary-prompt.ts` (modify)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify)
- `test/unit/models/chat/chat-models.test.ts` (modify)
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify)
- `test/unit/llm/chat/chat-bible-generation.test.ts` (modify)
- `test/unit/llm/chat/chat-summary-generation.test.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` (modify)
- `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` (modify)

## Out of Scope

- New UI widgets that display structured summary sections separately
- Route or client behavior changes unrelated to the contract update
- Changes to the generated `ChatBible` schema shape unless required by a direct contract mismatch
- Data migration shims or legacy compatibility paths

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `ChatSession` fixtures and validators accept `RollingSummaryOutput | null`
2. Unit test: persisted chat sessions round-trip with a full structured rolling summary object
3. Unit test: chat pipeline stores the full summary object on `updatedSession.rollingSummary`
4. Unit test: chat bible and summarizer prompt formatting render deterministic rolling-summary text from the structured object
5. Existing suite: `npm test` passes

### Invariants

1. `RollingSummaryOutput` remains the canonical persisted rolling-summary contract in the chat-session domain
2. `ChatSession.rollingSummary` and summary-stage output stay type-aligned
3. No string-only alias field is introduced for compatibility
4. Prompt builders that accept structured summaries must format them deliberately rather than accidentally rendering `[object Object]`
5. Prompt-layer models that intentionally use string summaries may keep doing so as formatted derivatives, not as the persisted source of truth

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-models.test.ts` — update model fixtures and runtime validation coverage for structured session summaries
2. `test/unit/persistence/chat-repository.test.ts` — verify session persistence round-trips the full summary object
3. `test/unit/llm/chat/chat-pipeline.test.ts` — verify full summary object is retained on the updated session
4. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — verify structured persisted summaries are formatted into deterministic bible input text
5. `test/unit/llm/prompts/chat/chat-summary-prompt.test.ts` — verify structured prior summaries are formatted into deterministic summarizer input text

### Commands

1. `npm run test:unit -- --testPathPatterns='chat-models|chat-repository|chat-pipeline|chat-bible-generation|chat-summary-generation|chat-bible-prompt|chat-summary-prompt'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed: 2026-03-27
- Actual changes:
  - Updated `ChatSession.rollingSummary` and persisted `chat.json` validation to use `RollingSummaryOutput | null`.
  - Updated `runChatPipeline()` and summarizer input plumbing to retain the full structured summary object instead of collapsing to `compressedSummary`.
  - Added deterministic prompt-formatting helpers so structured summaries are rendered explicitly at prompt boundaries for chat bible generation and summary regeneration.
  - Updated the character chat spec to reflect the canonical persisted contract.
- Deviations from original plan:
  - Kept `ChatBible.conversationNow.rollingSummary` string-backed. That schema is a curated prompt payload, not the persisted source of truth, so forcing it to mirror storage would have coupled two layers unnecessarily.
  - No active downstream chat tickets required edits beyond this ticket/spec reassessment because `CHACHASYS-011` already treats the field as opaque and the remaining active tickets do not own the persistence contract.
- Verification:
  - `npm run test:unit -- --testPathPatterns='chat-models|chat-repository|chat-pipeline|chat-bible-generation|chat-summary-generation|chat-bible-prompt|chat-summary-prompt|chat-state-applier'`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
