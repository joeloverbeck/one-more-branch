# CHAUIOVE-007: Sidebar Knowledge State and Character Mind accordion sections

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (chatBible/knowledgeState data), CHAUIOVE-006 (accordion infrastructure)

## Problem

The sidebar currently does not display knowledge state details (facts, suspicions, false beliefs, secrets) or character mind data (objectives, emotional state, topics, knowledge boundaries). This ticket adds the Knowledge State (section 3.3) and Character Mind (section 3.4) accordion sections.

## Assumption Reassessment (2026-03-28)

1. `session.knowledgeState` has `knownFacts`, `suspicions`, `falseBeliefs`, `secretsRevealed` — needs verification against chat models.
2. `session.chatBible.characterNow` has `currentObjective`, `immediateNeedFromConversation`, `emotionalState`, `willinessToEngage`, `topicsToAdvance`, `topicsToProtect` — needs verification.
3. `session.chatBible.relationshipNow.whatCharacterBelievesAboutInterlocutor` — needs verification.
4. `session.chatBible.knowledgeNow.secretsKept`, `knowledgeBoundaries` — needs verification.
5. Accordion infrastructure (`.chat-accordion`) exists from CHAUIOVE-006.

## Architecture Check

1. Two new `<details>` sections added to the sidebar, following the same accordion pattern from CHAUIOVE-006.
2. Data comes from template variables set up by CHAUIOVE-001 (`chatBible`, `knowledgeState`).
3. Sections gracefully handle null/undefined data (render "No data available" or hide the section).
4. This ticket should build on the extracted sidebar module from CHAUIOVE-006 and must not add new sidebar rendering branches directly into `20-chat-controller.js`.

## What to Change

### 1. Knowledge State section (3.3)

**Summary line**: `{n} facts, {m} suspicions`

**Expanded**:
- Known facts (bulleted list)
- Suspicions (bulleted, italic styling)
- False beliefs (bulleted, warning-colored when present)
- Secrets revealed (bulleted, when present)

```html
<details class="chat-accordion" data-chat-section="knowledge">
  <summary class="chat-accordion-summary">
    <span data-chat-field="knowledgeSummary">0 facts, 0 suspicions</span>
  </summary>
  <div class="chat-accordion-content">
    <h4>Known Facts</h4>
    <ul data-chat-field="knownFacts">...</ul>
    <h4>Suspicions</h4>
    <ul class="chat-list--italic" data-chat-field="suspicions">...</ul>
    <!-- etc -->
  </div>
</details>
```

### 2. Character Mind section (3.4)

**Summary line**: `Objective text (truncated to ~60 chars)`

**Expanded**:
- Current objective
- Immediate need from conversation
- Emotional state
- Willingness to engage (badge)
- Topics to advance (list)
- Topics to protect (list, with lock icon)
- What character believes about interlocutor (list)
- Secrets kept (list)
- Knowledge boundaries (list)

### 3. Client JS updates

Extend the sidebar helpers from `20b-chat-sidebar.js` to update Knowledge State and Character Mind fields when `chatBible` and `knowledgeState` are present in the POST response.

### 4. CSS

- `.chat-list--italic` for suspicions styling
- `.chat-list--warning` for false beliefs warning color
- Badge styling for `willingnessToEngage`
- Lock icon for protected topics

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — add Knowledge State and Character Mind accordion sections
- `public/js/src/20b-chat-sidebar.js` (modify) — update sidebar rendering for the new sections
- `public/js/src/20-chat-controller.js` (modify only if wiring changes are needed) — keep orchestration thin
- `public/css/styles.css` (modify) — add section-specific styles
- `test/unit/server/views/chat.test.ts` (modify) — add assertions for new sections

## Out of Scope

- Physical Context and Relationship sections (CHAUIOVE-006)
- Conversation and Guardrails sections (CHAUIOVE-008)
- Turn rendering changes (CHAUIOVE-004, CHAUIOVE-005)
- Any server-side changes (data exposure is CHAUIOVE-001)
- Sparkline rendering (CHAUIOVE-006)

## Acceptance Criteria

### Tests That Must Pass

1. Knowledge State section renders with correct summary count when `knowledgeState` is present
2. Knowledge State expanded view shows bulleted lists for facts, suspicions, false beliefs, secrets
3. Character Mind section renders with truncated objective as summary
4. Character Mind expanded view shows all fields from `chatBible.characterNow` and `chatBible.knowledgeNow`
5. Both sections render gracefully when `chatBible` or `knowledgeState` is null (empty state message)
6. `updateSidebar()` correctly updates both sections from POST response
7. Existing suite: `npm test` — no regressions
8. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Accordion pattern consistent with CHAUIOVE-006 (same CSS classes, same `<details>`/`<summary>` structure)
2. `data-chat-field` pattern used for all dynamically-updated fields
3. Sections independently collapsible
4. No data duplication — knowledge state and character mind data rendered from their canonical sources

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: Knowledge State section renders with knowledgeState data
2. `test/unit/server/views/chat.test.ts` — add: Character Mind section renders with chatBible data
3. `test/unit/server/views/chat.test.ts` — add: sections render empty state when data is null

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
