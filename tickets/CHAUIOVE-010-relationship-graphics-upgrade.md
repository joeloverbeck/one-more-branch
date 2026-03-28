# CHAUIOVE-010: Upgrade relationship graphics once snapshot history is canonical

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: [tickets/CHACHASYS-019-relationship-snapshot-timeline.md](/home/joeloverbeck/projects/one-more-branch/tickets/CHACHASYS-019-relationship-snapshot-timeline.md), [archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHATUIFIX-003-chat-bible-gauge-values.completed.md)

## Problem

The current valence and tension graphics are serviceable but still minimal:

- the gauges show positions, but not what those positions mean
- the sparkline shows motion, but not significant thresholds or reading aids
- current and previous markers are visible, but the card does not make trend direction legible at a glance

Once the relationship timeline becomes canonical, the UI can present that data more honestly and more readably. Right now the relationship cards still feel like debugging widgets rather than durable narrative UI.

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs:599-630` currently renders a marker-only gauge plus a bare sparkline for valence and tension. Confirmed.
2. `public/css/styles.css:1055-1093` styles only a gradient track, one primary marker, one ghost marker, and a simple sparkline line. There are no threshold labels, semantic zone cues, or trend annotations. Confirmed.
3. `public/js/src/20b-chat-sidebar.js:212-241` renders sparklines as a single polyline with no point emphasis, no semantic thresholds, and no accessible textual summary beyond the raw value fields. Confirmed.
4. The current visuals can be improved, but they should not be further upgraded on top of the rebased-history workaround. Corrected scope: this ticket should depend on canonical snapshot history so the upgraded graphics visualize honest data.

## Architecture Check

1. Relationship graphics should communicate semantics, not just coordinates. The UI should tell the user whether a relationship is hostile, neutral, loyal, calm, strained, or near-breaking rather than requiring them to decode raw numbers alone.
2. The cleaner architecture is a presentation layer over canonical snapshot history:
   - data truth stays in the snapshot timeline
   - the view derives semantic bands, labels, and trend summaries from that canonical data
3. This ticket stays presentation-only. It should not invent new relationship data contracts or pull ownership back into CSS/JS heuristics that belong in the model layer.
4. No backwards-compatibility aliasing or duplicate chart systems should be introduced. Replace the current simple gauge presentation with a more readable one.

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

- `tickets/CHAUIOVE-010-relationship-graphics-upgrade.md` (new)
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

1. Relationship cards render semantic anchors/ticks for valence and tension.
2. Current and previous positions remain visible and visually distinct.
3. Trend direction is legible without reading raw numbers alone.
4. Accessibility text reflects the chart semantics rather than only the raw SVG/gauge elements.
5. Existing suite: `npm test`

### Invariants

1. The upgraded graphics consume canonical snapshot timeline data and do not reintroduce rebased delta history.
2. Relationship cards remain compact and usable in the existing sidebar layout.
3. The presentation remains readable without depending on color alone.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — verify the upgraded relationship card markup includes semantic anchors and accessibility hooks.
2. `test/unit/client/chat-page/controller.test.ts` — verify the client updates trend indicators and chart endpoints from snapshot-derived values.
3. `test/unit/server/public/css.test.ts` — verify the stylesheet includes the new relationship-card selectors and responsive rules.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/public/css.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
