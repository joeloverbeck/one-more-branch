# CHAUIOVE-006: Sidebar accordion infrastructure with Physical Context and Relationship sections

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHAUIOVE-001 (sparkline data), CHAUIOVE-002 (sidebar grid area)

## Problem

The current sidebar is a flat list of fields inside a single `story-card`. The spec calls for six collapsible accordion sections with compact summaries when collapsed and full detail when expanded. This ticket implements the accordion infrastructure plus the first two sections: Physical Context and Relationship (including valence/tension gauges and sparklines).

## Assumption Reassessment (2026-03-28)

1. Current sidebar is already `<aside class="chat-sidebar" id="chat-sidebar">` with flat `.chat-sidebar__section` blocks after CHAUIOVE-002; this ticket now replaces that flat chat-specific sidebar with accordion sections.
2. `session.physicalContext` has `location`, `microLocation`, `timeOfDay`, `privacy`, `distanceBand`, `characterActivity`, `interactableObjects`, `ambientConditions` — confirmed.
3. `session.relationshipState` has `dynamic`, `valence`, `tension`, `leverage` — confirmed in the current template sidebar block and route payloads.
4. The live route/template contract already passes relationship trend data as `chatUiBootstrap.relationshipHistory`, built in `src/server/routes/chat.ts` via `buildChatRelationshipHistory()`. There is no `sparklineHistory` field in the current code, so this ticket should build on `relationshipHistory` instead of inventing a second alias.
5. `updateSidebar()` currently lives in `public/js/src/20-chat-controller.js` and updates text-only DOM nodes via `data-chat-field` attributes. Gauge and sparkline rendering are not implemented yet.
6. The current sidebar contains three sections: Physical Context, Relationship State, and Lead-In. This ticket only converts the first two to accordion sections. Lead-In stays flat and intact for now unless a later ticket explicitly redesigns it.

## Architecture Check

1. Accordion uses `<details>` / `<summary>` elements — semantic, accessible, no JS library needed.
2. Each section has a `data-chat-section` attribute for targeted updates from `updateSidebar()`.
3. Sparklines are pure CSS/SVG — small inline SVG polylines computed from `chatUiBootstrap.relationshipHistory`. No charting library.
4. Valence/tension gauges are CSS gradient bars with a marker. Pure CSS, no canvas.
5. Sidebar rendering/update logic should move into `public/js/src/20b-chat-sidebar.js` in this ticket. Because client JS is concatenated alphabetically and `20-chat-controller.js` loads before `20b-chat-sidebar.js`, the extracted sidebar API must register on `window` and be invoked only at runtime (after `DOMContentLoaded`), not through static module imports.
6. The route bootstrap seam (`chatUiBootstrap`) is already the right place for sidebar-only derived data. It is more robust to keep relationship-history derivation server-owned and reuse that payload for initial sparkline render than to recompute history from DOM state on the client.

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
- **Sparklines**: inline SVG polylines from `chatUiBootstrap.relationshipHistory`
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
- Move sidebar-specific rendering/update logic into `20b-chat-sidebar.js`
- Keep `20-chat-controller.js` limited to orchestration and calls into sidebar helpers
- Update sidebar helpers to also update gauge markers and sparkline data
- Read initial history from `#chat-ui-bootstrap` instead of inventing additional inline data attributes

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify) — replace sidebar content with accordion sections
- `public/js/src/20-chat-controller.js` (modify) — delegate sidebar work to the extracted sidebar helpers
- `public/js/src/20b-chat-sidebar.js` (new) — sidebar-specific rendering, gauges, sparklines, and DOM updates
- `public/css/styles.css` (modify) — add accordion, gauge, sparkline, pill CSS
- `test/unit/server/views/chat.test.ts` (modify) — update sidebar assertions

## Out of Scope

- Knowledge State section (CHAUIOVE-007)
- Character Mind section (CHAUIOVE-007)
- Conversation section (CHAUIOVE-008)
- Guardrails section (CHAUIOVE-008)
- Lead-In section redesign beyond preserving its current content and update hook
- Turn rendering changes (CHAUIOVE-004, CHAUIOVE-005)
- Input bar changes (CHAUIOVE-003)
- Any server-side changes beyond the already-present `chatUiBootstrap.relationshipHistory` payload

## Acceptance Criteria

### Tests That Must Pass

1. Sidebar renders `<details>` accordion elements for Physical Context and Relationship sections
2. Physical Context summary shows location + time + distance when collapsed
3. Relationship section renders valence gauge with correct value positioning
4. Relationship section renders tension gauge with correct value positioning
5. Sparkline SVG is rendered when `chatUiBootstrap.relationshipHistory` data is present
6. `data-chat-field` attributes still present for dynamic updates
7. `updateSidebar()` correctly updates gauge markers and field text
8. Existing suite: `npm test` — no regressions
9. `npm run test:client` — client tests pass after regenerating `app.js`

### Invariants

1. Sidebar is independently scrollable (`overflow-y: auto`)
2. `data-chat-field` update pattern still works for all physical/relationship fields
3. Accordion sections default to expanded (`open` attribute) on initial load
4. Sparklines render gracefully with zero data points (empty SVG, no errors)
5. The sidebar helper is safe under the concatenated global-script architecture and does not require ES module loading or reordered client bundles

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — update: sidebar uses `<details>` accordion structure
2. `test/unit/server/views/chat.test.ts` — add: Physical Context section renders all fields
3. `test/unit/server/views/chat.test.ts` — add: Relationship section contains gauge elements
4. `test/unit/server/views/chat.test.ts` — add: sparkline container present when `relationshipHistory` is provided
5. `test/unit/client/chat-page/controller.test.ts` — update: sidebar orchestration delegates to extracted helper and updates gauges/sparklines after turn submission

### Commands

1. `npx jest --selectProjects client test/unit/client/chat-page/controller.test.ts --runInBand` — targeted client verification
2. `npm run concat:js && npm run test:client` — client JS tests
3. `npm test` — full suite

## Outcome

- Completion date: 2026-03-28
- Actual changes:
  - Replaced the flat Physical Context and Relationship sidebar blocks with semantic accordion sections in `src/server/views/pages/chat.ejs`.
  - Added a dedicated client sidebar runtime in `public/js/src/20b-chat-sidebar.js` for gauges, sparklines, pill/bullet rendering, and relationship-history state management.
  - Reduced `public/js/src/20-chat-controller.js` to orchestration for sidebar updates instead of owning sidebar DOM mutation directly.
  - Added/updated server view and client controller tests to cover accordion markup, bootstrap-driven sparkline rendering, gauge updates, and structured physical-context rendering.
  - Regenerated `public/js/app.js`.
- Deviations from the original plan:
  - Reused the existing `chatUiBootstrap.relationshipHistory` contract instead of introducing a separate `sparklineHistory` alias.
  - Preserved the existing Lead-In sidebar section as-is rather than partially redesigning it in this ticket.
  - Kept relationship history derivation server-owned and let the client append subsequent points locally after turn submission.
- Verification results:
  - `npm run concat:js`
  - `npm run test:client`
  - `npm test`
  - `npm run lint`
