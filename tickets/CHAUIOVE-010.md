# CHAUIOVE-010: Canonicalize chat rolling-summary ownership

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — chat pipeline, models/validation, route/view contracts, prompt formatters
**Deps**: CHAUIOVE-001 (chat bible exposure), CHAUIOVE-008 (conversation sidebar), CHAUIOVE-009 (post-turn integration)

## Problem

The chat stack currently carries rolling-summary data in two different places:

1. `session.rollingSummary`, typed as `RollingSummaryOutput | null`
2. `chatBible.conversationNow.rollingSummary`, typed as `string | null`

That duplication creates an architectural smell:
- UI code must know which representation is canonical for display
- pipeline code must keep two related fields in sync
- future features can drift into reading or writing different sources

This ticket should establish one canonical ownership model for rolling summary data and remove the duplicate representation or reduce it to a deterministic derived projection with one-way ownership.

## Assumption Reassessment (2026-03-28)

1. `ChatSession.rollingSummary` currently stores structured summary data via `RollingSummaryOutput | null` — confirmed in `src/models/chat/chat-session.ts`.
2. `ChatBibleConversationNow.rollingSummary` currently stores a plain string summary for prompts/UI — confirmed in `src/models/chat/chat-bible.ts`.
3. The chat pipeline currently passes `context.chatSession.rollingSummary` into scene-context generation while prompt formatters/UI also read `chatBible.conversationNow.rollingSummary` — confirmed in `src/llm/chat/chat-pipeline.ts` and `src/llm/prompts/chat/chat-prompt-formatters.ts`.
4. The current UI correctly treats `chatBible.conversationNow.rollingSummary` as the canonical display string, but that is a local workaround, not a clean domain model.
5. No active ticket currently owns this contract cleanup. `CHAUIOVE-009` is an integration ticket and should consume the canonical contract chosen here rather than inventing aliases.

## Architecture Check

1. One canonical owner is cleaner than parallel fields because every layer can answer a single question: where does rolling-summary truth live?
2. No backwards-compatibility shims or alias fields should be introduced. If a field is redundant, remove it and update all callers/tests to the canonical contract.
3. The preferred direction is to keep the rich structured data canonical in the session domain model, then derive any UI/prompt-friendly string projection from that single source. That preserves extensibility without forcing the rest of the system to parse lossy strings back into structure.
4. If the chat bible still needs a rolling-summary string inside `conversationNow` for prompt composition, it should be a deterministic projection derived from the canonical session summary, with ownership documented and enforced in code/tests.

## What to Change

### 1. Choose and document canonical ownership

Decide the final contract and apply it consistently across models, validation, pipeline code, and route/view usage. The expectation is:
- `session.rollingSummary` remains canonical
- any conversation-level summary string becomes derived, not independently owned

### 2. Remove ambiguous duplicate ownership

Update the chat pipeline and any model builders so only one layer owns rolling-summary truth. If `chatBible.conversationNow.rollingSummary` remains, make it explicitly derived from the canonical session summary at assembly time and eliminate any code path that treats it as separately authored state.

### 3. Update prompt and UI consumers

Adjust prompt formatters, sidebar consumers, and any other readers so they consume the canonical/derived contract without fallback branching or alias logic.

### 4. Tighten tests around the invariant

Add tests that fail if the two representations drift or if a second ownership path is reintroduced.

## Files to Touch

- `src/models/chat/chat-session.ts` (modify) — canonical ownership documentation/types if needed
- `src/models/chat/chat-bible.ts` (modify) — remove or mark derived rolling-summary field as appropriate
- `src/models/chat/chat-validation.ts` (modify) — validation aligned to the canonical contract
- `src/llm/chat/chat-pipeline.ts` (modify) — stop treating both fields as independent state
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify) — consume canonical/derived summary cleanly
- `src/llm/chat/chat-generation-context.ts` (modify if needed) — align summary ownership
- `src/server/views/pages/chat.ejs` (modify if UI contract changes) — read the canonical/derived field without aliasing
- `public/js/src/20b-chat-sidebar.js` (modify if UI contract changes) — same constraint as above
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify) — verify canonical ownership and non-drift
- `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` (modify) — verify prompt rendering under the new contract
- `test/unit/models/chat/chat-models.test.ts` (modify) — verify model invariants
- `test/unit/server/views/chat.test.ts` (modify if the UI-facing field changes)
- `test/unit/client/chat-page/controller.test.ts` (modify if the UI-facing field changes)

## Out of Scope

- New chat UI features
- Visual redesign of the sidebar
- Non-chat summary systems elsewhere in the app

## Acceptance Criteria

### Tests That Must Pass

1. The chat domain has one documented canonical rolling-summary owner.
2. No route, prompt, or UI consumer depends on parallel independently-authored rolling-summary fields.
3. If a conversation-level summary string remains, tests prove it is derived deterministically from the canonical summary source.
4. Existing chat UI/sidebar behavior remains correct after the contract cleanup.
5. Existing suite: `npm test`
6. `npm run lint`

### Invariants

1. Rolling-summary truth has a single owner in the chat domain model.
2. No alias path such as `updatedChatBible` or duplicate authored summary strings is introduced to preserve legacy callers.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/chat/chat-pipeline.test.ts` — prove canonical rolling-summary ownership and prevent drift between session/chat-bible representations.
2. `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` — verify prompt output still renders the correct rolling-summary text from the canonical source.
3. `test/unit/models/chat/chat-models.test.ts` — enforce the final model/validation invariant.
4. `test/unit/server/views/chat.test.ts` and/or `test/unit/client/chat-page/controller.test.ts` — verify the chat UI still renders the summary correctly after the contract cleanup.

### Commands

1. `npm run test:unit -- --testPathPatterns=chat`
2. `npm run test:client`
3. `npm run lint`
4. `npm test`
