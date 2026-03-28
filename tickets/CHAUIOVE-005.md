# CHAUIOVE-005: Expandable "Character's Inner World" panel on character turns

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (data must be available), CHAUIOVE-004 (turn rendering structure)

## Problem

Character turns contain extremely rich psychology data (`plannerOutput`, `turnMeta`, `stateUpdate`) that is currently not rendered. The spec calls for a collapsible "Character's Inner World" panel below each character turn, containing Internal Self-Check, Emotional Layer, Response Strategy, Action Plan, Turn Impact, and State Changes sub-sections.

## Assumption Reassessment (2026-03-28)

1. `turn.plannerOutput` contains `internalSelfCheck`, `surfaceEmotion`, `suppressedEmotion`, `subtext`, `responseGoal`, `mustAddress`, `mustAvoid`, `targetLength`, `actionPlan`, `expectedImpact`, `speechAct`, `honestyMode` — needs verification against planner schema.
2. `turn.turnMeta` contains `visibleEmotion`, `finalPressure`, `expectsReply`, `endsWithQuestion` — needs verification against turn meta model.
3. `turn.stateUpdate` contains `summaryDelta`, `relationshipShifts`, knowledge changes, conversation updates, physical changes — needs verification against state update model.
4. Turn data is available both server-side (EJS) and in the POST response JSON for client-side rendering — confirmed.

## Architecture Check

1. The expandable panel is a `<details>` / `<summary>` element or a custom toggle — `<details>` is semantically correct and requires no JS for basic expand/collapse.
2. Sub-sections within the panel use simple heading + content structure. No nested accordions needed.
3. The panel renders empty/hidden when `plannerOutput` is null (user turns always have null plannerOutput).
4. This ticket should extend the extracted turn-renderer module from CHAUIOVE-004 rather than add more markup-building branches back into `20-chat-controller.js`.
5. Large change but contained to rendering code — no server logic changes.

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
- What I want, What I know, What I'm hiding, How honest am I — labeled paragraphs

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
- Summary delta, relationship shifts, knowledge changes, conversation update, physical changes

### 3. Update both render paths

- EJS template: add `<details>` block inside the character turn loop
- Client JS `20a-chat-turn-renderer.js`: extend turn rendering helpers with inner-world markup when `turn.plannerOutput` exists

### 4. CSS

- `.chat-inner-world`: collapsed by default, subtle border, muted background
- `.chat-inner-world-content`: padding, section headings, list styles
- Sub-section-specific styling for badges, side-by-side layout, icon indicators

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — add expandable panel inside character turn loop
- `public/js/src/20a-chat-turn-renderer.js` (modify) — update turn rendering helpers to include the inner world panel
- `public/js/src/20-chat-controller.js` (modify) — keep orchestration only; consume renderer helpers
- `public/css/styles.css` (modify) — add `.chat-inner-world` and sub-section styles
- `test/unit/server/views/chat.test.ts` (modify) — verify inner world panel renders for character turns

## Out of Scope

- Sidebar accordion sections (CHAUIOVE-007 through CHAUIOVE-009)
- Tag bar styling (CHAUIOVE-004 — already done)
- Input bar changes (CHAUIOVE-003)
- Layout grid changes (CHAUIOVE-002)
- Any server-side or LLM changes
- Interactive features within the panel (e.g., filtering, search)

## Acceptance Criteria

### Tests That Must Pass

1. Character turns with `plannerOutput` render a `<details class="chat-inner-world">` element
2. User turns do NOT render the inner world panel
3. Internal Self-Check section renders all four fields when present in `plannerOutput.internalSelfCheck`
4. Emotional Layer renders `surfaceEmotion` and `suppressedEmotion` side-by-side
5. State Changes section renders `stateUpdate.summaryDelta` when present
6. Panel gracefully handles missing/null sub-fields (renders section only when data exists)
7. Existing suite: `npm test` — no regressions
8. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Panels are collapsed by default (no `open` attribute on `<details>`)
2. Turn message content and tag bar from CHAUIOVE-004 unchanged
3. `appendTurn()` and auto-scroll still work
4. No performance degradation with many turns (inner world content is in collapsed DOM)

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — add: character turn with plannerOutput renders inner world panel
2. `test/unit/server/views/chat.test.ts` — add: character turn without plannerOutput omits inner world panel
3. `test/unit/server/views/chat.test.ts` — add: user turn never renders inner world panel
4. `test/unit/server/views/chat.test.ts` — add: inner world panel contains Internal Self-Check section

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
