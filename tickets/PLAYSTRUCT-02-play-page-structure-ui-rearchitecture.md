# PLAYSTRUCT-02: Re-architect play-page structure presentation around page history and next objective

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None beyond consuming the new display contract from PLAYSTRUCT-01
**Deps**: `tickets/PLAYSTRUCT-01-structure-display-contract-and-state-semantics.md`, `tickets/README.md`, `archive/specs/analyst-insights-modal.completed.md`

## Problem

The current `/play` structure UI places act-end architecture, current-milestone completion criteria, and page identity in a single expandable block. This makes `Exit Reversal` appear like an immediate milestone rule when it is actually an act-end horizon, and it obscures the difference between “what this page just did” and “what the next scene must accomplish.”

The result is a UI that is technically populated with real data but semantically misleading.

## Assumption Reassessment (2026-03-18)

1. `src/server/views/pages/play.ejs` currently renders a single `act-structure-details` block containing act objective, stakes, milestone objective, act question, milestone exit condition, and exit reversal together.
2. `public/js/src/09-controllers.js` rebuilds the same mixed block after AJAX choice responses, so the ambiguity exists both on initial load and after navigation.
3. Current Story Insights rendering in `public/js/src/05c-analyst-insights.js` correctly treats `Milestone Exit Criteria` as milestone-scoped, but nearby page UI does not establish that distinction. The corrected scope of this ticket is to redesign the structure surfaces so they reveal the underlying architecture honestly, not to tweak wording in isolated labels only.

## Architecture Check

1. The clean UI architecture is to render separate surfaces for separate semantics: page history, next-active milestone, and act trajectory. This is cleaner than keeping one expandable block and trying to explain it with tooltips or parenthetical copy.
2. No backwards-compatibility aliasing/shims introduced. This ticket should consume the explicit payload from PLAYSTRUCT-01 and remove reliance on the old mixed `actDisplayInfo` mental model.

## What to Change

### 1. Redesign the primary play-page structure summary

Replace the single mixed structure panel with distinct sections, for example:

- `This Page`
  - page act / milestone identity
  - if applicable, resolved milestone or act-complete result
- `Next Objective`
  - next active milestone name
  - milestone objective
  - milestone completion condition
- `Act Arc`
  - act objective
  - stakes
  - act question
  - act-end reversal

The exact visual design can vary, but the information architecture must separate:

- page history
- upcoming generation target
- act-level trajectory

### 2. Rename player-facing labels for semantic clarity

At minimum:

- `Exit Reversal` -> `Act-End Reversal`
- `Milestone Exit Condition` or `Milestone Exit Criteria` should be used consistently for milestone completion

Avoid labels that imply a single undifferentiated “current structure” object.

### 3. Align Story Insights with the new structure model

Story Insights should present milestone completion logic as milestone-scoped and may optionally reference act trajectory, but should not rely on a mixed structure object.

If the modal shows act trajectory fields, those should live in a separate subsection from milestone completion gauges.

### 4. Preserve extensibility for future debug/recap surfaces

The UI composition should be modular enough that future surfaces can reuse:

- page history card
- next-target card
- act trajectory card

without duplicating markup logic between server render and client-side updates.

## Files to Touch

- `src/server/views/pages/play.ejs` (modify)
- `public/js/src/09-controllers.js` (modify)
- `public/js/src/05c-analyst-insights.js` (modify)
- `public/css/styles.css` (modify)
- `test/unit/server/views/play.test.ts` (modify)
- `test/unit/client/play-page/choice-click.test.ts` (modify)
- `test/unit/client/play-page/analyst-insights.test.ts` (modify)
- `test/unit/client/fixtures/html-fixtures.ts` (modify)

## Out of Scope

- Rewriting the overall play-page layout unrelated to structure semantics
- Story generation logic changes
- Prompt contract changes except where necessary to reflect new UI copy in tests/docs

## Acceptance Criteria

### Tests That Must Pass

1. The play page visually separates page history, next milestone objective, and act trajectory.
2. A milestone-concluding page can show both “what just resolved” and “what comes next” without contradictory labels.
3. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. Act-level fields must never be rendered as if they are milestone completion criteria.
2. Client-side incremental updates must rebuild the same semantic structure as the initial server render.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/play.test.ts` — assert separate structure sections and label semantics.
2. `test/unit/client/play-page/choice-click.test.ts` — assert AJAX updates preserve section boundaries after milestone advancement.
3. `test/unit/client/play-page/analyst-insights.test.ts` — verify modal wording and grouping remain semantically distinct.
4. `test/unit/client/fixtures/html-fixtures.ts` — update fixtures to match the re-architected structure UI contract.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/views/play.test.ts test/unit/client/play-page/choice-click.test.ts test/unit/client/play-page/analyst-insights.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`

