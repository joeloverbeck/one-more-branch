# CHAUIOVE-009: Post-turn dynamic updates for sidebar and conversation pane

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-002 (layout), CHAUIOVE-003 (input bar), CHAUIOVE-004 (turn rendering), CHAUIOVE-005 (inner world), CHAUIOVE-006 (sidebar accordion + gauges), CHAUIOVE-007 (knowledge/mind sections), CHAUIOVE-008 (conversation/guardrails sections)

## Problem

After all the visual components are in place, the client-side `submitTurn()` flow needs to correctly: (1) append both user and character turns with the new rendering (tag bars, expandable inner world), (2) update all six sidebar accordion sections including gauges and sparklines, (3) update the API key lock icon state, (4) auto-scroll the conversation pane, and (5) handle loading state in the compact input bar. This is the integration ticket that wires everything together.

## Assumption Reassessment (2026-03-28)

1. `submitTurn()` in `20-chat-controller.js:197` calls the POST endpoint and receives `data.userTurn`, `data.characterTurn`, `data.updatedSession` — confirmed.
2. `appendTurn()` at line 144 appends a turn and scrolls into view — confirmed, but needs update for new rendering.
3. Sidebar updates no longer live in `20-chat-controller.js`; the current architecture already delegates sidebar rendering to `public/js/src/20b-chat-sidebar.js`, and `20-chat-controller.js` only orchestrates calls into it.
4. The POST response does not include `updatedChatBible`; current route tests explicitly assert that this alias is absent. The canonical post-turn source for sidebar data is `data.updatedSession.chatBible`.
5. `loadingSession.withProgress()` handles spinner and progress — confirmed.
6. `chatBible.conversationNow.rollingSummary` is currently the UI-facing rolling-summary string. Any deeper contract cleanup between that field and `updatedSession.rollingSummary` belongs in a separate architecture ticket, not in this integration ticket.

## Architecture Check

1. This is an integration/wiring ticket — no new visual components, just connecting the POST response data to the renderers built in prior tickets.
2. By the time this ticket lands, turn rendering should live in `20a-chat-turn-renderer.js` and sidebar rendering should live in `20b-chat-sidebar.js`. This ticket should integrate those modules, not grow `20-chat-controller.js`.
3. The key change is coordinating the existing helpers so post-turn updates refresh: knowledge state counts/lists, character mind fields, conversation fields, guardrails, gauges, and sparklines, all from `data.updatedSession`.
4. `appendTurn()` must call the extracted turn-renderer helpers from CHAUIOVE-004/005.
5. Loading state moves from the old `chat-loading-indicator` to inline display near the send button in the compact input bar.
6. No alias response fields should be introduced. If a helper needs chat-bible data, it should read `updatedSession.chatBible`, not a parallel `updatedChatBible` payload.

## What to Change

### 1. Expand `updateSidebar()` for all accordion sections

After a successful POST response, the sidebar helpers must update:
- Physical Context fields (existing, minor updates)
- Relationship fields + gauge marker repositioning + sparkline append
- Knowledge State counts and lists (from `data.updatedSession.knowledgeState`)
- Character Mind fields (from `data.updatedSession.chatBible?.characterNow` etc.)
- Conversation fields (from `data.updatedSession.chatBible?.conversationNow`)
- Guardrails fields (from `data.updatedSession.chatBible`)
- Accordion summary lines (counts, truncated text)

### 2. Update `appendTurn()` auto-scroll target

Ensure auto-scroll targets the `.chat-conversation` container's scroll position, not `scrollIntoView` on the turn element (which might scroll the whole page if the layout is misconfigured).

### 3. Loading state in input bar

During `loadingSession.withProgress()`:
- Send button shows spinner
- Textarea becomes `readonly`
- Progress status text appears inline near the send button or below the input bar
- On completion, restore normal state

### 4. Sparkline data point append

After POST response, extract the new valence/tension values and append to the in-memory sparkline data array, then re-render the sparkline SVG.

### 5. Lock icon state

After successful API key usage in `submitTurn()`, ensure the lock icon shows "locked" (filled) state.

## Files to Touch

- `public/js/src/20-chat-controller.js` (modify) — orchestrate submit flow, call extracted renderer/sidebar helpers, manage loading state
- `public/js/src/20a-chat-turn-renderer.js` (modify, if exists) — append-turn rendering helpers used after POST success
- `public/js/src/20b-chat-sidebar.js` (modify) — sidebar update functions, gauge/sparkline refresh
- `public/css/styles.css` (modify) — loading state styles for input bar

## Out of Scope

- EJS template changes (all done in prior tickets)
- Server-side route changes (CHAUIOVE-001)
- New CSS layout or component design (prior tickets)
- New accordion sections or turn rendering features
- Canonicalizing the duplicate rolling-summary representations between `updatedSession.rollingSummary` and `updatedSession.chatBible.conversationNow.rollingSummary` (handled by a dedicated follow-up architecture ticket)

## Acceptance Criteria

### Tests That Must Pass

1. After `submitTurn()`, both user turn and character turn are appended with correct new markup (tag bar, inner world)
2. After `submitTurn()`, all six sidebar sections update with data from POST response
3. Gauge markers reposition correctly after sidebar update
4. Sparkline appends new data point after each turn
5. Loading state: send button shows spinner, textarea is readonly during generation
6. Conversation pane auto-scrolls to the latest turn after append
7. Lock icon updates to filled state after successful API key use
8. Existing suite: `npm test` — no regressions
9. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. No page-level scroll occurs during or after turn submission
2. Sidebar accordion sections retain their open/closed state across turn submissions
3. Error display still works (turn errors shown in `#chat-turn-error`)
4. `shouldSendResumeFlag` logic unchanged
5. `inFlight` guard prevents double-submission
6. Post-turn sidebar data comes from `updatedSession` only; no `updatedChatBible` alias is introduced

## Test Plan

### New/Modified Tests

1. Client-side tests: after simulated turn submission, verify sidebar fields updated
2. Client-side tests: verify auto-scroll targets `.chat-conversation` container
3. Client-side tests: verify loading state toggles on send button and textarea
4. `test/unit/server/routes/chat.test.ts` — keep/strengthen the contract assertion that the JSON response does not introduce `updatedChatBible`

### Commands

1. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
2. `npm test` — full suite
3. `npm run lint` — ensure no lint errors in modified JS
