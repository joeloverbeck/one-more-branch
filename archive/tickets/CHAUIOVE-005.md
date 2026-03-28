# CHAUIOVE-005: Expandable "Character's Inner World" panel on character turns

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (data must be available), CHAUIOVE-004 (turn rendering structure)

## Problem

Character turns contain extremely rich psychology data (`plannerOutput`, `turnMeta`, `stateUpdate`) that is currently not rendered. The spec calls for a collapsible "Character's Inner World" panel below each character turn, containing Internal Self-Check, Emotional Layer, Response Strategy, Action Plan, Turn Impact, and State Changes sub-sections.

## Assumption Reassessment (2026-03-28)

1. `turn.plannerOutput` is already strongly modeled in `src/models/chat/chat-turn-plan.ts`. The relevant fields are:
   - `internalSelfCheck.whatDoIWant`, `whatDoIKnow`, `whatAmIHiding`, `howHonestAmI`
   - `responseGoal`, `speechAct`, `honestyMode`
   - `surfaceEmotion`, `suppressedEmotion`, `subtext`
   - `mustAddress`, `mustAvoid`
   - `actionPlan[].kind`, `actionPlan[].text`, `actionPlan[].changesPhysicalState`
   - `targetLength`, `expectedImpact.relationshipDeltaHint`, `expectedImpact.tensionDeltaHint`, `expectedImpact.revealsSecret`
   - `blockPlan` and `questionBack` also exist but are out of scope for this ticket.
2. `turn.turnMeta` is already modeled in `src/models/chat/chat-turn.ts` and contains exactly `visibleEmotion`, `finalPressure`, `expectsReply`, and `endsWithQuestion`.
3. `turn.stateUpdate` is already modeled in `src/models/chat/chat-state-update.ts`. The relevant fields are:
   - `summaryDelta`
   - `relationshipShifts[].shiftDescription`, `suggestedValenceChange`, `suggestedTensionChange`, `suggestedNewDynamic`
   - `knowledgeChanges.newKnownFacts`, `newSuspicions`, `falseBeliefsCorrected`, `secretsRevealed`
   - `conversationUpdate.commitmentsMade`, `threatsMade`, `questionsOpened`, `questionsResolved`
   - `physicalStateUpdate.locationChanged`, `newLocation`, `newMicroLocation`, `newDistanceBand`, `objectStateChanges`
   - `shouldRefreshChatBible` and `shouldTriggerSummary` exist but are not part of the inner-world panel.
4. Turn data is available both server-side (EJS) and in the POST response JSON for client-side rendering.
5. The current client render split already routes appended turns through `public/js/src/20a-chat-turn-renderer.js`; `20-chat-controller.js` is orchestration and should stay that way unless a small integration change is strictly necessary.
6. Existing coverage is broader than originally listed. The ticket must treat server-view tests, client controller tests, and stylesheet selector coverage as part of the relevant safety net.

## Architecture Check

1. The expandable panel is a `<details>` / `<summary>` element or a custom toggle — `<details>` is semantically correct and requires no JS for basic expand/collapse.
2. Sub-sections within the panel use simple heading + content structure. No nested accordions needed.
3. The panel renders empty/hidden when `plannerOutput` is null (user turns always have null plannerOutput).
4. This ticket should extend the extracted turn-renderer module from CHAUIOVE-004 rather than add more markup-building branches back into `20-chat-controller.js`.
5. The server-rendered EJS markup and the client renderer must stay structurally aligned. Favor small shared helper-style patterns in each render path over inventing alias fields or fallback schema translation.
6. No server logic or schema changes are justified here; this remains a presentation-layer ticket.

## What to Change

### 1. Expandable panel structure

Below the tag bar on each character turn:
```html
<details class="chat-inner-world">
  <summary>Character's Inner World</summary>
  <div class="chat-inner-world-content">
    <!-- Sub-sections -->
  </div>
</details>
```

### 2. Sub-sections (all from `plannerOutput` / `turnMeta` / `stateUpdate`)

**Internal Self-Check** (`plannerOutput.internalSelfCheck`):
- What I want (`whatDoIWant`), What I know (`whatDoIKnow`), What I'm hiding (`whatAmIHiding`), How honest am I (`howHonestAmI`) — labeled paragraphs

**Emotional Layer**:
- Surface emotion + Suppressed emotion (side-by-side) — from `plannerOutput`
- Subtext — from `plannerOutput.subtext`

**Response Strategy**:
- Response goal, Must address (bulleted), Must avoid (bulleted), Target length

**Action Plan**:
- `plannerOutput.actionPlan` items with `kind` labels, `changesPhysicalState` icon

**Turn Impact**:
- `turnMeta.finalPressure`, `expectsReply` badge, `endsWithQuestion` badge
- `plannerOutput.expectedImpact`: relationship/tension delta hints, reveals secret

**State Changes** (`stateUpdate`):
- Summary delta
- Relationship shifts (`shiftDescription`, suggested deltas, suggested new dynamic)
- Knowledge changes (`newKnownFacts`, `newSuspicions`, `falseBeliefsCorrected`, `secretsRevealed`)
- Conversation update (`commitmentsMade`, `threatsMade`, `questionsOpened`, `questionsResolved`)
- Physical changes (`locationChanged`, `newLocation`, `newMicroLocation`, `newDistanceBand`, `objectStateChanges`)

### 3. Update both render paths

- EJS template: add `<details>` block inside the character turn loop
- Client JS `20a-chat-turn-renderer.js`: extend turn rendering helpers with inner-world markup when character-turn data contains any inner-world content
- `20-chat-controller.js`: only touch if integration glue is needed; do not move render responsibilities back into the controller

### 4. CSS

- `.chat-inner-world`: collapsed by default, subtle border, muted background
- `.chat-inner-world-content`: padding, section headings, list styles
- Sub-section-specific styling for badges, side-by-side layout, icon indicators

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — add expandable panel inside character turn loop
- `public/js/src/20a-chat-turn-renderer.js` (modify) — update turn rendering helpers to include the inner world panel
- `public/js/src/20-chat-controller.js` (optional, minimal only) — keep orchestration only if any integration adjustment is required
- `public/css/styles.css` (modify) — add `.chat-inner-world` and sub-section styles
- `test/unit/server/views/chat.test.ts` (modify) — verify inner world panel renders for character turns
- `test/unit/client/chat-page/controller.test.ts` (modify) — verify appended character turns render the same inner-world structure
- `test/unit/server/public/css.test.ts` (modify) — verify new selectors are covered at stylesheet level

## Out of Scope

- Sidebar accordion sections (CHAUIOVE-007 through CHAUIOVE-009)
- Tag bar styling (CHAUIOVE-004 — already done)
- Input bar changes (CHAUIOVE-003)
- Layout grid changes (CHAUIOVE-002)
- Any server-side or LLM changes
- Interactive features within the panel (e.g., filtering, search)
- Introducing alias data shapes, compatibility shims, or alternate field names to match the spec text

## Acceptance Criteria

### Tests That Must Pass

1. Character turns with `plannerOutput` render a `<details class="chat-inner-world">` element
2. User turns do NOT render the inner world panel
3. Internal Self-Check section renders all four modeled fields from `plannerOutput.internalSelfCheck`
4. Emotional Layer renders `surfaceEmotion` and `suppressedEmotion` using the actual planner field names, while omitting `suppressedEmotion` when null
5. State Changes section renders `stateUpdate.summaryDelta` and can render the modeled nested groups without renaming them
6. Panel gracefully handles sparse data: render the panel only when at least one inner-world subsection has content, and render subsection rows only when their backing data exists
7. Existing suite: `npm test` — no regressions
8. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Panels are collapsed by default (no `open` attribute on `<details>`)
2. Turn message content and tag bar from CHAUIOVE-004 unchanged
3. `appendTurn()` and auto-scroll still work
4. `20-chat-controller.js` remains an orchestration layer and does not regain direct string-building responsibility
5. No performance degradation with many turns beyond rendering the additional collapsed DOM

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: character turn with plannerOutput renders inner world panel
2. `test/unit/server/views/chat.test.ts` — add: sparse/missing planner fields only render supported rows and no empty shell for user turns
3. `test/unit/client/chat-page/controller.test.ts` — add: appended character turn renders inner world details and preserves auto-scroll path
4. `test/unit/client/chat-page/controller.test.ts` — add: appended character turn with no inner-world data omits the panel
5. `test/unit/server/public/css.test.ts` — add: stylesheet includes inner-world selectors

### Commands

1. `npm run test:unit -- --runInBand test/unit/server/views/chat.test.ts test/unit/server/public/css.test.ts` — targeted server rendering/style tests
2. `node scripts/concat-client-js.js && npm run test:client -- --runInBand test/unit/client/chat-page/controller.test.ts` — client JS tests
3. `npm test` — full suite

## Outcome

- Completed on 2026-03-28.
- Added the expandable "Character's Inner World" panel to both SSR and client-appended character turns, using the existing canonical chat field names from the current planner, turn-meta, and state-update models.
- Kept `20-chat-controller.js` unchanged. The original ticket assumed it would likely need touching, but the cleaner architecture was to keep render responsibility in `20a-chat-turn-renderer.js` and avoid pushing markup construction back into the controller.
- Added matching stylesheet support and strengthened coverage across server view rendering, client appended-turn rendering, and stylesheet selector presence.
- Verification:
  - `node scripts/concat-client-js.js`
  - `npm run test:client -- --runInBand test/unit/client/chat-page/controller.test.ts`
  - `npm test`
  - `npm run lint`
