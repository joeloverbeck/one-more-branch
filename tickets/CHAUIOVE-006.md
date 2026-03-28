# CHAUIOVE-006: Sidebar accordion infrastructure with Physical Context and Relationship sections

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (sparkline data), CHAUIOVE-002 (sidebar grid area)

## Problem

The current sidebar is a flat list of fields inside a single `story-card`. The spec calls for six collapsible accordion sections with compact summaries when collapsed and full detail when expanded. This ticket implements the accordion infrastructure plus the first two sections: Physical Context and Relationship (including valence/tension gauges and sparklines).

## Assumption Reassessment (2026-03-28)

1. Current sidebar is `<aside class="story-card" id="chat-sidebar">` with flat `<section>` blocks — confirmed in `chat.ejs:71-108`.
2. `session.physicalContext` has `location`, `microLocation`, `timeOfDay`, `privacy`, `distanceBand`, `characterActivity`, `interactableObjects`, `ambientConditions` — confirmed.
3. `session.relationshipState` has `dynamic`, `valence`, `tension`, `leverage` — confirmed in `chat.ejs:87-93`.
4. Sparkline data will be passed as `sparklineHistory` by CHAUIOVE-001.
5. `updateSidebar()` in `20-chat-controller.js:173` updates fields via `data-chat-field` attributes — confirmed.

## Architecture Check

1. Accordion uses `<details>` / `<summary>` elements — semantic, accessible, no JS library needed.
2. Each section has a `data-chat-section` attribute for targeted updates from `updateSidebar()`.
3. Sparklines are pure CSS/SVG — small inline SVG polylines computed from the `sparklineHistory` array. No charting library.
4. Valence/tension gauges are CSS gradient bars with a marker. Pure CSS, no canvas.

## What to Change

### 1. Accordion structure in sidebar

Replace flat sections with `<details>` elements:
```html
<aside class="chat-sidebar" id="chat-sidebar">
  <details class="chat-accordion" open data-chat-section="physical">
    <summary class="chat-accordion-summary">
      <!-- Compact summary line -->
    </summary>
    <div class="chat-accordion-content">
      <!-- Full content -->
    </div>
  </details>
  <!-- More sections... -->
</aside>
```

### 2. Physical Context section (3.1)

**Summary line**: Location icon + micro-location + time + distance badge
**Expanded**: Full physical context fields (location, micro-location, time, privacy, distance, activity, objects as pills, ambient conditions as bullets)

### 3. Relationship section (3.2)

**Summary line**: Mini inline valence/tension text (e.g., "V: +2 T: 4")
**Expanded**:
- **Valence gauge**: horizontal gradient bar (red → gray → green), marker at current value, numeric label, delta arrow
- **Tension gauge**: horizontal gradient bar (blue → red), marker at current value
- **Sparklines**: inline SVG polylines from `sparklineHistory` data
- **Dynamic** and **Leverage** text fields

### 4. CSS

- `.chat-accordion`, `.chat-accordion-summary`, `.chat-accordion-content` — accordion styling
- `.chat-gauge` — gradient bar with marker
- `.chat-gauge--valence` / `.chat-gauge--tension` — color schemes
- `.chat-sparkline` — inline SVG sizing
- `.chat-pill` — pill tag styling for interactable objects

### 5. Client JS updates

- New function `renderSparkline(container, dataPoints, color)` to create SVG polyline
- New function `renderGauge(container, value, min, max, colorScheme)` to create gauge bar
- Update `updateSidebar()` to also update gauge markers and sparkline data
- Extract sidebar update code into a separate file if `20-chat-controller.js` exceeds ~400 lines: `20b-chat-sidebar.js`

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — replace sidebar content with accordion sections
- `public/js/src/20-chat-controller.js` (modify) — update `updateSidebar()`, add gauge/sparkline render functions
- `public/js/src/20b-chat-sidebar.js` (new, if needed) — sidebar-specific rendering logic
- `public/css/styles.css` (modify) — add accordion, gauge, sparkline, pill CSS
- `test/unit/server/views/chat.test.ts` (modify) — update sidebar assertions

## Out of Scope

- Knowledge State section (CHAUIOVE-007)
- Character Mind section (CHAUIOVE-007)
- Conversation section (CHAUIOVE-008)
- Guardrails section (CHAUIOVE-008)
- Turn rendering changes (CHAUIOVE-004, CHAUIOVE-005)
- Input bar changes (CHAUIOVE-003)
- Any server-side changes beyond what CHAUIOVE-001 provides

## Acceptance Criteria

### Tests That Must Pass

1. Sidebar renders `<details>` accordion elements for Physical Context and Relationship sections
2. Physical Context summary shows location + time + distance when collapsed
3. Relationship section renders valence gauge with correct value positioning
4. Relationship section renders tension gauge with correct value positioning
5. Sparkline SVG is rendered when `sparklineHistory` data is present
6. `data-chat-field` attributes still present for dynamic updates
7. `updateSidebar()` correctly updates gauge markers and field text
8. Existing suite: `npm test` — no regressions
9. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Sidebar is independently scrollable (`overflow-y: auto`)
2. `data-chat-field` update pattern still works for all physical/relationship fields
3. Accordion sections default to expanded (`open` attribute) on initial load
4. Sparklines render gracefully with zero data points (empty SVG, no errors)

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: sidebar uses `<details>` accordion structure
2. `test/unit/server/views/chat.test.ts` — add: Physical Context section renders all fields
3. `test/unit/server/views/chat.test.ts` — add: Relationship section contains gauge elements
4. `test/unit/server/views/chat.test.ts` — add: sparkline container present when sparklineHistory provided

### Commands

1. `npm run test:unit -- --testPathPattern="views/chat"` — targeted view tests
2. `node scripts/concat-client-js.js && npm run test:client` — client JS tests
3. `npm test` — full suite
