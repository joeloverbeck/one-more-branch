# CHAUIOVE-007: Sidebar Knowledge State and Character Mind accordion sections

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (chatBible/knowledgeState data), CHAUIOVE-006 (accordion infrastructure)

## Problem

The sidebar currently does not display knowledge state details (facts, suspicions, false beliefs, secrets) or character mind data (objectives, emotional state, topics, knowledge boundaries). This ticket adds the Knowledge State (section 3.3) and Character Mind (section 3.4) accordion sections.

## Assumption Reassessment (2026-03-28)

1. `session.knowledgeState` is already a validated `ChatKnowledgeState` with `knownFacts`, `suspicions`, `falseBeliefs`, and `secretsRevealed`. This is the canonical source for the Knowledge State sidebar section and is already exposed through `chatUiBootstrap`.
2. `session.chatBible` is already a validated `ChatBible | null` and is exposed through `chatUiBootstrap` on initial render and through `updatedSession` after `POST /chat/:chatId/turn`.
3. `session.chatBible.characterNow` contains `currentObjective`, `immediateNeedFromConversation`, `emotionalState`, `willingnessToEngage`, `topicsToAdvance`, and `topicsToProtect`. The ticket previously misspelled `willingnessToEngage`.
4. `session.chatBible.relationshipNow.whatCharacterBelievesAboutInterlocutor` exists and belongs in Character Mind, alongside `chatBible.knowledgeNow.secretsKept` and `chatBible.knowledgeNow.knowledgeBoundaries`.
5. `session.chatBible.knowledgeNow` overlaps intentionally with `session.knowledgeState` by repeating `knownFacts`, `suspicions`, `falseBeliefs`, and `secretsRevealed`. To avoid dueling sources in the UI, this ticket must keep Knowledge State owned by `session.knowledgeState` and use Character Mind only for the character-specific fields that do not already have a dedicated section.
6. Accordion infrastructure already exists in `src/server/views/pages/chat.ejs`, `public/css/styles.css`, and `public/js/src/20b-chat-sidebar.js`. There is no existing Knowledge or Character Mind sidebar section yet.

## Architecture Check

1. Two new `<details>` sections should be added to the existing sidebar, following the current `chat-accordion` pattern already used for Physical Context and Relationship.
2. Initial render should read from `chatUiBootstrap.chatBible` and `chatUiBootstrap.knowledgeState`, not directly from ad hoc template locals.
3. Dynamic updates should remain centralized in `public/js/src/20b-chat-sidebar.js` via `ChatSidebar.update(page, updatedSession)`. `20-chat-controller.js` should continue to orchestrate only.
4. Empty-state behavior should be explicit and stable. The sections should render even when data is absent so the sidebar structure remains predictable, but individual lists/fields should show a neutral empty label instead of branching the layout away.
5. The proposed architecture is beneficial relative to the current implementation because it preserves the existing split of responsibilities:
   - template owns static structure and initial bootstrap render
   - `ChatSidebar` owns post-turn DOM updates
   - `20-chat-controller.js` stays thin
6. No aliases or backwards-compatibility shims should be introduced. If a field name or responsibility is wrong, fix the call sites/tests to the canonical contract.

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

This section should not duplicate `knownFacts`, `suspicions`, `falseBeliefs`, or `secretsRevealed`; those already belong to the Knowledge State section.

### 3. Client JS updates

Extend the sidebar helpers from `20b-chat-sidebar.js` to update Knowledge State and Character Mind fields from `updatedSession.knowledgeState` and `updatedSession.chatBible`. The implementation should keep list rendering and summary derivation inside the sidebar module instead of adding bespoke DOM writes to `20-chat-controller.js`.

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
- `test/unit/client/chat-page/controller.test.ts` (modify) — add client-side sidebar update assertions for the new sections
- `test/unit/server/routes/chat.test.ts` (modify only if bootstrap/response contract assertions need tightening)

## Out of Scope

- Physical Context and Relationship sections (CHAUIOVE-006)
- Conversation and Guardrails sections (CHAUIOVE-008)
- Turn rendering changes (CHAUIOVE-004, CHAUIOVE-005)
- Any server-side changes (data exposure is CHAUIOVE-001)
- Sparkline rendering (CHAUIOVE-006)

## Acceptance Criteria

### Tests That Must Pass

1. Knowledge State section renders with the correct summary count from `chatUiBootstrap.knowledgeState`.
2. Knowledge State expanded view shows lists for facts, suspicions, false beliefs, and secrets revealed.
3. Character Mind section renders with an objective-based summary derived from `chatUiBootstrap.chatBible.characterNow.currentObjective`.
4. Character Mind expanded view shows the non-duplicated character-mind fields from `chatBible.characterNow`, `chatBible.relationshipNow`, and `chatBible.knowledgeNow`.
5. Both sections render stable empty states when `chatUiBootstrap.chatBible` is `null` or the relevant arrays are empty.
6. `ChatSidebar.update()` correctly updates both sections from `updatedSession`.
7. Existing targeted suites pass: server view tests plus client controller tests.
8. Existing repository verification passes after regenerating `public/js/app.js`: lint, relevant tests, and full regression suite requested by the user.

### Invariants

1. Accordion pattern stays consistent with the current sidebar implementation (same `<details>`/`<summary>` structure and `chat-accordion` classes).
2. Summary text and scalar fields use the existing `data-chat-field` pattern where that keeps updates simple.
3. List containers use the existing sidebar rendering helpers rather than ad hoc innerHTML scattered across controllers.
4. Sections remain independently collapsible.
5. No cross-section duplication of the four mutable knowledge arrays; they render from their canonical source in Knowledge State.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: Knowledge State section renders from bootstrap knowledge data
2. `test/unit/server/views/chat.test.ts` — add: Character Mind section renders from bootstrap chat bible data without duplicating knowledge arrays
3. `test/unit/server/views/chat.test.ts` — add: both sections render empty states when bootstrap data is null/empty
4. `test/unit/client/chat-page/controller.test.ts` — add: `ChatSidebar.update()` path refreshes both sections after a turn response

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `npm run test:unit -- --testPathPattern="chat-page/controller"` — targeted client controller tests
3. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
4. `npm run lint` — lint
5. `npm test` — full suite

## Outcome

- **Completion date**: 2026-03-28
- **What changed**: Added Knowledge State and Character Mind accordion sections to the chat sidebar, wired initial render from `chatUiBootstrap`, extended `ChatSidebar` to refresh both sections from `updatedSession`, and added styles plus view/client regression coverage for populated and empty states.
- **Deviation from original plan**: Kept `20-chat-controller.js` unchanged and centered all sidebar update logic in `public/js/src/20b-chat-sidebar.js`. Also tightened the architectural boundary so Character Mind does not duplicate `knownFacts`, `suspicions`, `falseBeliefs`, or `secretsRevealed`. The targeted Jest commands in the original ticket used the deprecated `--testPathPattern` flag; verification used `--runTestsByPath` / `--testPathPatterns` instead.
- **Verification**: `npm run concat:js`; `npm run test:unit -- --runTestsByPath test/unit/server/views/chat.test.ts`; `npm run test:unit -- --runTestsByPath test/unit/client/chat-page/controller.test.ts`; `npm run test:client`; `npm run lint`; `npm test`.
