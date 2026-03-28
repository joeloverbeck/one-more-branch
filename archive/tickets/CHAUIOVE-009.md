# CHAUIOVE-009: Post-turn dynamic updates for sidebar and conversation pane

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (layout), CHAUIOVE-003 (input bar), CHAUIOVE-004 (turn rendering), CHAUIOVE-005 (inner world), CHAUIOVE-006 (sidebar accordion + gauges), CHAUIOVE-007 (knowledge/mind sections), CHAUIOVE-008 (conversation/guardrails sections)

## Problem

The repo already ships the broad post-turn integration this ticket originally described: `submitTurn()` appends rendered turns, delegates sidebar updates to `window.ChatSidebar`, toggles the API key state, and uses the compact input bar loading session. The remaining defect is narrower and architectural: post-turn scrolling still relies on `scrollIntoView()` on the last turn element, which is coupled to page scrolling instead of the `.chat-conversation` container. That makes the chat pane less robust than the surrounding layout architecture and leaves a gap in regression coverage for container-scoped scrolling.

## Assumption Reassessment (2026-03-28)

1. `submitTurn()` in `public/js/src/20-chat-controller.js` already calls the POST endpoint and consumes `data.userTurn`, `data.characterTurn`, and `data.updatedSession` — confirmed.
2. `appendTurn()` already uses `window.ChatTurnRenderer.buildTurnHtml()` and updates the turn count — confirmed. The rendering integration described by the original ticket is already present and covered by client tests.
3. Sidebar updates already live in `public/js/src/20b-chat-sidebar.js`; `20-chat-controller.js` only orchestrates the update call — confirmed.
4. The POST response does not include `updatedChatBible`; route tests explicitly assert that this alias is absent. The canonical post-turn source for sidebar data is `data.updatedSession.chatBible` — confirmed.
5. `loadingSession.withProgress()` already handles overlay/progress display and the controller already toggles textarea `readOnly` plus button disabled state — confirmed.
6. Gauge and sparkline updates are already implemented in `window.ChatSidebar.update()` using session relationship state plus cached history/bootstrap history — confirmed.
7. The concrete discrepancy is scrolling: `appendTurn()` still calls `lastTurn.scrollIntoView({ block: 'end' })`, which is weaker than scrolling the `.chat-conversation` container directly and does not match the intended chat-app architecture.

## Architecture Check

1. The desirable architecture is already mostly in place: turn rendering lives in `20a-chat-turn-renderer.js`, sidebar rendering lives in `20b-chat-sidebar.js`, and `20-chat-controller.js` stays an orchestrator.
2. The most robust change is to keep that module split intact and fix scrolling surgically inside the controller. No new alias payloads, no re-expansion of controller responsibilities, and no rewrites of the sidebar/renderer modules.
3. Scrolling should be container-owned. The conversation pane is the scrolling surface; appended turn elements should not decide page-level scroll behavior.
4. Existing broad integration behavior is already valuable and tested. Reworking it further in this ticket would be churn, not architectural improvement.
5. No backwards-compatibility aliases should be introduced. Any future data-contract cleanup should continue to consolidate on canonical fields, not duplicate them.

## What to Change

### 1. Replace element `scrollIntoView()` with container scrolling

After each appended turn, scroll the `.chat-conversation` container itself to its bottom (`scrollTop = scrollHeight` or equivalent container-scoped logic). Do not use `scrollIntoView()` on the last turn element.

### 2. Add explicit regression coverage for container-scoped scrolling

Strengthen the client controller tests so they prove:
- the conversation container receives the scroll update
- `scrollIntoView()` is not used for post-turn scrolling
- existing post-turn rendering/sidebar/loading behavior still passes unchanged

### 3. Preserve the existing architecture

Do not redesign sidebar updates, renderer integration, or route payloads in this ticket unless tests expose a real defect. The existing modular split is the cleaner architecture and should be preserved.

## Files to Touch

- `public/js/src/20-chat-controller.js` (modify) — switch post-turn auto-scroll from element `scrollIntoView()` to conversation-container scrolling
- `test/unit/client/chat-page/controller.test.ts` (modify) — add regression coverage for container scrolling while keeping existing integration assertions
- `public/js/app.js` (generated) — regenerate after source change

## Out of Scope

- EJS template changes
- Server-side route changes
- New CSS layout or component design
- New accordion sections or turn rendering features
- Reworking already-passing sidebar/renderer integration without a demonstrated defect
- Canonicalizing any broader rolling-summary/data-contract cleanup beyond the current canonical `updatedSession.chatBible.conversationNow.rollingSummary` UI path

## Acceptance Criteria

### Tests That Must Pass

1. After `submitTurn()`, the conversation container scrolls to its own bottom after appending turns.
2. Post-turn scrolling does not call `scrollIntoView()` on turn elements.
3. Existing post-turn rendering/sidebar/loading behavior remains green in client tests.
4. The route contract still does not introduce `updatedChatBible`.
5. `npm run test:client` passes after regenerating `public/js/app.js`.
6. Relevant server/unit and lint suites pass with no regressions.

### Invariants

1. No page-level scroll helper is used during post-turn append; the conversation pane owns scrolling.
2. Sidebar accordion sections retain their open/closed state across turn submissions.
3. Error display still works (turn errors shown in `#chat-turn-error`).
4. `shouldSendResumeFlag` logic remains unchanged.
5. `inFlight` guard still prevents double-submission.
6. Post-turn sidebar data comes from `updatedSession` only; no `updatedChatBible` alias is introduced.

## Test Plan

### New/Modified Tests

1. Modify `test/unit/client/chat-page/controller.test.ts` to verify `.chat-conversation.scrollTop` is driven to the container `scrollHeight` after submit.
2. Modify `test/unit/client/chat-page/controller.test.ts` to verify `scrollIntoView()` is not used for post-turn scrolling.
3. Keep the existing client integration assertions that already cover rendering, sidebar updates, loading state, lock state, gauges, and sparklines.
4. Keep the existing `test/unit/server/routes/chat.test.ts` contract assertion that the JSON response does not introduce `updatedChatBible`.

### Commands

1. `node scripts/concat-client-js.js`
2. `npm run test:client -- --runInBand test/unit/client/chat-page/controller.test.ts`
3. `npm run test:unit -- --runInBand test/unit/server/routes/chat.test.ts test/unit/server/views/chat.test.ts`
4. `npm run lint`

## Outcome

- Completed: 2026-03-28
- Actual changes:
  - Reassessed the ticket against the live codebase and corrected stale assumptions before implementation.
  - Updated `public/js/src/20-chat-controller.js` so post-turn auto-scroll is owned by the `.chat-conversation` container instead of `scrollIntoView()` on the appended turn element.
  - Strengthened `test/unit/client/chat-page/controller.test.ts` to assert container-scoped scrolling and verify `scrollIntoView()` is not used.
  - Regenerated `public/js/app.js`.
- Deviations from the original plan:
  - The original ticket assumed broad post-turn integration work remained. In the current codebase, that integration was already implemented and covered by tests.
  - No sidebar, renderer, route, or CSS changes were necessary once the assumptions were corrected.
- Verification:
  - `node scripts/concat-client-js.js`
  - `npm run test:client -- --runInBand test/unit/client/chat-page/controller.test.ts`
  - `npm run test:unit -- --runInBand test/unit/server/routes/chat.test.ts test/unit/server/views/chat.test.ts`
  - `npm run lint`
