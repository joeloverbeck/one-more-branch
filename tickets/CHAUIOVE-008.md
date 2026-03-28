# CHAUIOVE-008: Sidebar Conversation and Guardrails accordion sections

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (chatBible data), CHAUIOVE-006 (accordion infrastructure)

## Problem

The sidebar does not display conversation dynamics (active threads, commitments, sensitive topics, pressure) or response guardrails/constraints from the chat bible. This ticket adds the Conversation (section 3.5) and Guardrails & Constraints (section 3.6) accordion sections.

## Assumption Reassessment (2026-03-28)

1. `session.chatBible.conversationNow` has `activeThreads`, `commitments`, `sensitiveTopics`, `lastTurnPressure` — needs verification against chat bible model.
2. `session.rollingSummary` exists on session — needs verification.
3. `session.chatBible.continuityGuardrails` and `session.chatBible.responseConstraints` — needs verification.
4. Accordion infrastructure (`.chat-accordion`) exists from CHAUIOVE-006.

## Architecture Check

1. Two final `<details>` sections complete the sidebar accordion (6 total sections across CHAUIOVE-006, -007, -008).
2. Same pattern as previous sections — summary line when collapsed, full detail when expanded.
3. Data comes from `chatBible` template variable set by CHAUIOVE-001.
4. Follow the sidebar ownership boundary established in CHAUIOVE-006: section rendering and post-turn updates belong in `20b-chat-sidebar.js`, not in `20-chat-controller.js`.

## What to Change

### 1. Conversation section (3.5)

**Summary line**: `{n} threads, {m} commitments`

**Expanded**:
- Active threads (list)
- Commitments (list)
- Sensitive topics (list)
- Last turn pressure (text)
- Rolling summary (text, when available)

### 2. Guardrails & Constraints section (3.6)

**Summary line**: `{n} guardrails, {m} constraints`

**Expanded**:
- Continuity guardrails (bulleted list)
- Response constraints (bulleted list)

### 3. Client JS updates

Extend `20b-chat-sidebar.js` to update Conversation and Guardrails fields when `chatBible` is present in the POST response.

### 4. CSS

Minimal — reuses existing accordion and list styles from CHAUIOVE-006.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — add Conversation and Guardrails accordion sections
- `public/js/src/20b-chat-sidebar.js` (modify) — update sidebar rendering
- `public/js/src/20-chat-controller.js` (modify only if wiring changes are needed) — keep orchestration thin
- `public/css/styles.css` (modify) — minor additions if needed
- `test/unit/server/views/chat.test.ts` (modify) — add assertions for new sections

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
3. Rolling summary renders when present, hidden when absent
4. Guardrails section renders with guardrail and constraint counts in summary
5. Guardrails expanded view shows bulleted lists for guardrails and constraints
6. Both sections render gracefully when `chatBible` is null
7. `updateSidebar()` correctly updates both sections from POST response
8. Existing suite: `npm test` — no regressions
9. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Accordion pattern consistent with CHAUIOVE-006 and CHAUIOVE-007
2. `data-chat-field` pattern used for all dynamically-updated fields
3. All six sidebar sections now present and independently collapsible
4. Sidebar remains independently scrollable when all sections are expanded

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: Conversation section renders with chatBible.conversationNow data
2. `test/unit/server/views/chat.test.ts` — add: Guardrails section renders with chatBible guardrails/constraints
3. `test/unit/server/views/chat.test.ts` — add: sections render empty state when chatBible is null

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
