# CHAUIOVE-008: Sidebar Conversation and Guardrails accordion sections

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (chatBible data), CHAUIOVE-006 (accordion infrastructure)

## Problem

The sidebar does not display conversation dynamics (active threads, commitments, sensitive topics, pressure) or response guardrails/constraints from the chat bible. This ticket adds the Conversation (section 3.5) and Guardrails & Constraints (section 3.6) accordion sections.

## Assumption Reassessment (2026-03-28)

1. `session.chatBible` is already exposed to the UI through `chatUiBootstrap.chatBible` on initial render and through `updatedSession.chatBible` after `POST /chat/:chatId/turn`.
2. `chatBible.conversationNow` already contains the UI-facing conversation fields: `rollingSummary`, `activeThreads`, `commitments`, `sensitiveTopics`, and `lastTurnPressure`.
3. `session.rollingSummary` also exists, but its type is `RollingSummaryOutput | null`, not a plain sidebar-ready string. For this sidebar section, the canonical display source should remain `chatBible.conversationNow.rollingSummary` to avoid introducing a second UI contract or alias.
4. `chatBible.continuityGuardrails` and `chatBible.responseConstraints` already exist on the validated `ChatBible` model.
5. Accordion infrastructure already exists in `src/server/views/pages/chat.ejs`, `public/css/styles.css`, and `public/js/src/20b-chat-sidebar.js`; the sidebar currently has four accordion sections (Physical Context, Relationship, Knowledge State, Character Mind), so this ticket should add the final two rather than introducing a new accordion system.

## Architecture Check

1. Two final `<details>` sections should complete the existing sidebar accordion (six total sections across CHAUIOVE-006, -007, and -008).
2. The current architecture is already the right one to extend: the template owns static structure and initial bootstrap render, `public/js/src/20b-chat-sidebar.js` owns post-turn sidebar rendering, and `public/js/src/20-chat-controller.js` stays thin and orchestration-only.
3. The conversation section should read from the canonical UI-facing conversation contract (`chatBible.conversationNow`). Do not introduce backwards-compatibility aliases between `session.rollingSummary` and `chatBible.conversationNow.rollingSummary`; if those ever diverge, the correct fix is upstream contract alignment, not duplicated sidebar fallback logic.
4. Empty-state behavior should remain explicit and stable. The new sections should always render so the sidebar structure stays predictable, but each field/list should show a neutral empty label when data is absent.
5. This change is more beneficial than preserving the current architecture without these sections because it completes the existing, already-clean sidebar information architecture instead of scattering conversation/guardrail state into ad hoc widgets or controller-owned DOM writes.

## What to Change

### 1. Conversation section (3.5)

**Summary line**: `{n} threads, {m} commitments`

**Expanded**:
- Active threads (list)
- Commitments (list)
- Sensitive topics (list)
- Last turn pressure (text)
- Rolling summary (text from `chatBible.conversationNow.rollingSummary`, when available)

### 2. Guardrails & Constraints section (3.6)

**Summary line**: `{n} guardrails, {m} constraints`

**Expanded**:
- Continuity guardrails (bulleted list)
- Response constraints (bulleted list)

### 3. Client JS updates

Extend `20b-chat-sidebar.js` to update Conversation and Guardrails fields from `updatedSession.chatBible`. Keep all list rendering and summary derivation inside the sidebar module instead of adding bespoke DOM writes to `20-chat-controller.js`.

### 4. CSS

Minimal — reuses existing accordion and list styles from CHAUIOVE-006.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — add Conversation and Guardrails accordion sections
- `public/js/src/20b-chat-sidebar.js` (modify) — update sidebar rendering
- `public/js/src/20-chat-controller.js` (modify only if wiring changes are needed) — keep orchestration thin
- `public/css/styles.css` (modify) — minor additions if needed
- `test/unit/server/views/chat.test.ts` (modify) — add assertions for new sections
- `test/unit/client/chat-page/controller.test.ts` (modify) — add sidebar refresh assertions for the new sections

## Out of Scope

- Physical Context and Relationship sections (CHAUIOVE-006)
- Knowledge State and Character Mind sections (CHAUIOVE-007)
- Turn rendering changes (CHAUIOVE-004, CHAUIOVE-005)
- Input bar changes (CHAUIOVE-003)
- Any server-side or LLM changes

## Acceptance Criteria

### Tests That Must Pass

1. Conversation section renders with thread and commitment counts in summary
2. Conversation expanded view shows active threads, commitments, sensitive topics, last turn pressure
3. Rolling summary renders from `chatBible.conversationNow.rollingSummary` when present, with an explicit empty state when absent
4. Guardrails section renders with guardrail and constraint counts in summary
5. Guardrails expanded view shows bulleted lists for guardrails and constraints
6. Both sections render stable empty states when `chatBible` is null
7. `ChatSidebar.update()` correctly updates both sections from `updatedSession.chatBible`
8. Existing targeted server view and client controller tests pass
9. Existing suite: `npm test` — no regressions
10. `npm run test:client` — client tests pass after regenerating `app.js`
11. `npm run lint` — lint passes

### Invariants

1. Accordion pattern consistent with CHAUIOVE-006 and CHAUIOVE-007
2. `data-chat-field` pattern used for all dynamically-updated fields
3. All six sidebar sections now present and independently collapsible
4. Sidebar remains independently scrollable when all sections are expanded
5. Conversation summary/detail fields come from one canonical UI source: `chatBible.conversationNow`

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: Conversation section renders with chatBible.conversationNow data
2. `test/unit/server/views/chat.test.ts` — add: Guardrails section renders with chatBible guardrails/constraints
3. `test/unit/server/views/chat.test.ts` — add: sections render empty state when chatBible is null
4. `test/unit/client/chat-page/controller.test.ts` — add: `ChatSidebar.update()` refreshes Conversation and Guardrails after a turn response

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts` — targeted view tests
2. `npm run test:unit -- --runTestsByPath test/unit/client/chat-page/controller.test.ts` — targeted client controller tests
3. `npm run concat:js && npm run test:client` — client JS tests
4. `npm run lint` — lint
5. `npm test` — full suite

## Outcome

- Completion date: 2026-03-28
- What changed:
  - Added the final two sidebar accordion sections in `src/server/views/pages/chat.ejs`: Conversation and Guardrails & Constraints.
  - Extended `public/js/src/20b-chat-sidebar.js` so post-turn sidebar refreshes now update conversation summaries, rolling summary, pressure text, conversation lists, and guardrail/constraint lists.
  - Extended view and client controller tests to cover populated and empty sidebar states for the new sections, then regenerated `public/js/app.js`.
- Deviations from the original plan:
  - Kept the conversation sidebar bound to the canonical UI-facing `chatBible.conversationNow` contract instead of introducing any fallback or alias to `session.rollingSummary`.
  - Reused the existing accordion/list styles without adding new CSS because the current sidebar styling already covers the new sections cleanly.
  - Left `public/js/src/20-chat-controller.js` unchanged because the existing orchestration boundary was already correct.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts`
  - `npm run concat:js`
  - `npm run test:unit -- --runTestsByPath test/unit/client/chat-page/controller.test.ts`
  - `npm run test:client`
  - `npm run lint`
  - `npm test`
