# CHABIBSTASPL-005: Verify and finalize two-stage chat bible pipeline wiring

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Maybe — only if verification exposes a real gap
**Deps**: None for verification; split architecture appears already landed

## Problem

This ticket originally assumed the chat pipeline was still using the old monolithic `generateChatBible()` stage and needed to be rewired. That assumption is now stale. The split architecture is already present in the codebase. The remaining work is to verify that the implementation is coherent, that tests cover the architectural invariants that matter, and that the ticket is updated to match reality before archival.

## Assumption Reassessment (2026-03-28)

1. `runChatPipeline()` in `src/llm/chat/chat-pipeline.ts` already uses `generateChatSceneContext()` followed by `generateChatCharacterContext()` and merges the results with `assembleChatBible()` — **confirmed**.
2. Pipeline progress already reports `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER` via `runGenerationStage()` — **confirmed**.
3. `shouldRefreshChatBible()` logic still refreshes on resume, null bible, every 10 turns, or the latest prior character turn's `shouldRefreshChatBible` flag — **confirmed**.
4. `ChatBible` assembly already lives in `src/models/chat/chat-bible.ts` and preserves the downstream `ChatBible` shape — **confirmed**.
5. The old monolithic files and their direct tests are already gone:
   - `src/llm/chat/chat-bible-generation.ts`
   - `src/llm/schemas/chat-bible-schema.ts`
   - `src/llm/prompts/chat/chat-bible-prompt.ts`
   - matching unit tests — **confirmed absent**.
6. Registry/config/generated stage metadata already expose `chatSceneContext`, `chatCharacterContext`, `CURATING_CHAT_SCENE`, and `CURATING_CHAT_CHARACTER` — **confirmed**.
7. `test/unit/llm/chat/chat-pipeline.test.ts` already covers most split-pipeline behavior, including stage events and assembled bible persistence — **confirmed**.
8. A repository search found no live source, test, prompt, or generated artifact still referencing `generateChatBible`, `CHAT_BIBLE_SCHEMA`, `buildChatBibleMessages`, `chat-bible-generation`, `chat-bible-schema`, or `chat-bible-prompt` outside historical ticket/spec text — **confirmed**.

## Architecture Reassessment

1. The current split architecture is materially better than the old monolithic path. It keeps downstream consumers stable via `assembleChatBible()` while reducing schema complexity at the LLM boundary.
2. Keeping the split stages and a single assembled `ChatBible` for downstream use is the right boundary. It is cleaner and more extensible than propagating two partial context types throughout planner/writer/state-update code.
3. No backwards-compatibility aliasing should be reintroduced. The monolithic path is already removed and should stay removed.
4. The only worthwhile remaining work here is verification and test hardening around the sequence and reuse invariants, not more architectural churn.

## Updated Scope

### In Scope

1. Verify the current split implementation matches the intended architecture.
2. Add or strengthen tests only if they protect an important invariant that is not already covered.
3. Run the relevant tests plus `typecheck` and `lint`.
4. Mark the ticket completed and archive it with an Outcome section if verification passes.

### Out of Scope

1. Re-implementing the split pipeline that already exists.
2. Rewriting downstream consumers to operate on partial scene/character contexts.
3. Reintroducing any compatibility alias for the removed monolithic path.
4. Broad refactors unrelated to a concrete verification failure.

## Acceptance Criteria

1. Verification confirms the pipeline still refreshes via scene stage then character stage before assembling `ChatBible`.
2. Verification confirms refresh-skip behavior reuses the existing assembled `ChatBible`.
3. Verification confirms downstream stages continue to receive a valid `ChatBible`.
4. Verification confirms stage progress emits `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER`.
5. If a missing invariant is identified, a focused test is added to lock it down.
6. `npm run typecheck`, `npm run lint`, and the relevant test suites pass.
7. Ticket content is updated to reflect what was actually true in the codebase before archival.

## Test Plan

### Candidate Test Work

1. `test/unit/llm/chat/chat-pipeline.test.ts` — add coverage only if needed for:
   - explicit scene-before-character sequencing
   - reuse of existing `chatBible` when refresh is skipped

### Commands

1. `npm run test:unit -- --testPathPatterns=test/unit/llm/chat/chat-pipeline.test.ts`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- **Completed**: 2026-03-28
- **What actually changed**: Reassessed the ticket against the live codebase, corrected stale assumptions and scope, added one focused pipeline regression test for refresh-skip `chatBible` reuse, and verified the split chat-bible architecture with tests, `typecheck`, and `lint`.
- **Deviation from original plan**: The original ticket expected a pending pipeline rewrite and deletion pass. In reality, the split pipeline, stage metadata, and monolithic-path removal were already implemented before this pass. No production code changes were needed.
- **Verification**:
  - `npm run test:unit -- --testPathPatterns=test/unit/llm/chat/chat-pipeline.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
