# CHAUIOVE-010: Upgrade relationship graphics over the canonical snapshot timeline

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: [archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md)

## Problem

The current valence and tension graphics are serviceable but still minimal:

- the gauges show positions, but not what those positions mean
- the sparkline shows motion, but not significant thresholds or reading aids
- current and previous markers are visible, but the card does not make trend direction legible at a glance

The relationship timeline is now canonical in the route/model layer, but the UI still presents it like a debugging widget rather than durable narrative UI. The cards show positions and motion, yet they still undersell what the values mean and whether the relationship is warming, cooling, tightening, or easing.

## Assumption Reassessment (2026-03-28)

1. `src/server/routes/chat.ts` already builds `relationshipTimeline` with `buildChatRelationshipTimeline(turns)` and passes it through the bootstrap payload. Confirmed. This ticket no longer depends on future canonicalization work.
2. `src/server/views/pages/chat.ejs:606-640` currently renders a marker-only gauge plus a bare sparkline for valence and tension. Confirmed.
3. `public/css/styles.css:1016-1099` styles a gradient track, one primary marker, one ghost marker, and a simple sparkline line. There are no semantic anchors, threshold bands, or explicit trend affordances. Confirmed.
4. `public/js/src/20b-chat-sidebar.js:150-240` renders gauges and sparklines from canonical timeline data, but only as coordinates. It does not derive semantic labels, trend chips, or richer accessibility text from that timeline. Confirmed.
5. Existing automated coverage already exercises this seam in `test/unit/server/views/chat.test.ts`, `test/unit/client/chat-page/controller.test.ts`, `test/unit/server/public/css.test.ts`, and `test/unit/models/chat/chat-relationship-history.test.ts`. The ticket should extend those tests rather than invent new ownership seams.

## Architecture Check

1. Relationship graphics should communicate semantics, not just coordinates. The UI should tell the user whether a relationship is hostile, neutral, loyal, calm, strained, or near-breaking rather than requiring them to decode raw numbers alone.
2. The cleaner architecture is a presentation layer over canonical snapshot history:
   - data truth stays in the snapshot timeline and current relationship state
   - the UI derives semantic bands, labels, and trend summaries from that canonical data
3. This ticket stays presentation-only. It should not introduce new relationship persistence contracts, alternate timeline builders, or duplicate ownership paths.
4. No backwards-compatibility aliasing or parallel chart systems should be introduced. Replace the current simple gauge presentation with a single clearer presentation.
5. Ideal-direction note: if the implementation needs non-trivial semantic mapping logic, keep it small and deterministic. Do not turn this ticket into a broad charting abstraction. Prefer a narrow relationship-visual semantics seam over generic UI framework code.

## What to Change

### 1. Add semantic reference cues to the gauges

Upgrade the valence and tension cards so users can read the scales without memorizing numeric bounds.

Requirements:

- valence gauge includes semantic anchors such as `Hostile`, `Neutral`, `Loyal`
- tension gauge includes semantic anchors such as `Calm`, `Strained`, `Breaking`
- key threshold ticks or bands are visually obvious but not noisy
- the current value remains the primary focal point

### 2. Make trend direction more legible

Improve the cards so the user can immediately understand whether the relationship is warming, cooling, tightening, or easing.

Possible acceptable elements:

- directional arrow or trend chip beside the delta badge
- highlighted end-point dot on the sparkline
- subtle area fill or stronger current-segment emphasis
- visually distinct positive vs negative valence movement treatment

Choose one coherent presentation rather than stacking every possible flourish.

### 3. Improve accessibility and text support

Add textual support so the graphics are understandable beyond color/position alone.

Requirements:

- meaningful `aria-label` or `aria-describedby` text for the charts
- a short semantic summary near each metric, for example "strained but improving" or "high pressure and rising", if that can be derived deterministically from snapshot values/deltas
- do not rely on color alone to communicate state change

### 4. Keep the visuals compact and aligned with the existing chat sidebar

The card should feel intentionally designed, not oversized dashboard chrome.

Requirements:

- preserve sidebar density on desktop
- remain readable on mobile
- avoid tooltip-only interactions as the primary way to understand the chart

## Files to Touch

- `tickets/CHAUIOVE-010-relationship-graphics-upgrade.md` (modify)
- `src/server/views/pages/chat.ejs` (modify)
- `public/css/styles.css` (modify)
- `public/js/src/20b-chat-sidebar.js` (modify)
- `public/js/app.js` (regenerated)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (modify)
- `test/unit/server/public/css.test.ts` (modify)

## Out of Scope

- Changing relationship generation or persistence contracts
- Interactive tooltips, drill-down modals, or per-turn click exploration
- Redesigning the entire chat sidebar
- Adding third-party charting libraries

## Acceptance Criteria

### Tests That Must Pass

1. Relationship cards render semantic anchors/ticks for valence and tension from canonical timeline/current-state data.
2. Current and previous positions remain visible and visually distinct.
3. Trend direction is legible without reading raw numbers alone.
4. Accessibility text reflects chart semantics and trend meaning rather than only raw numeric/SVG elements.
5. Existing suite: `npm test`

### Invariants

1. The upgraded graphics consume the existing canonical snapshot timeline data and do not introduce a second history path.
2. Relationship cards remain compact and usable in the existing sidebar layout.
3. The presentation remains readable without depending on color alone.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — verify the upgraded relationship card markup includes semantic anchors, semantic summaries, and accessibility hooks.
2. `test/unit/client/chat-page/controller.test.ts` — verify the client derives trend indicators, summaries, and chart endpoints from canonical timeline values and still falls back correctly when timeline data is absent.
3. `test/unit/server/public/css.test.ts` — verify the stylesheet includes the new relationship-visual selectors and compact/mobile layout rules.
4. `test/unit/models/chat/chat-relationship-history.test.ts` — keep existing canonical-history coverage as a guardrail for the presentation-layer assumptions this ticket relies on.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand test/unit/models/chat/chat-relationship-history.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/public/css.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`

## Outcome

- Completion date: 2026-03-28
- What changed: Upgraded the chat relationship cards to render semantic summaries, trend chips, semantic anchor labels, richer gauge/sparkline accessibility text, and sparkline endpoint emphasis over the existing canonical relationship timeline. Tightened the server-view, client-controller, and stylesheet tests around those semantics.
- Deviations from original plan: No new model or route contract work was needed because canonical relationship timeline ownership already existed. The implementation stayed presentation-only and intentionally avoided introducing a broader chart abstraction.
- Verification results: `npm run test:unit -- --coverage=false --runInBand test/unit/models/chat/chat-relationship-history.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/public/css.test.ts`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test` all passed.
