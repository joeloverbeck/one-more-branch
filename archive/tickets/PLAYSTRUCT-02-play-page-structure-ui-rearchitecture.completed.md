# PLAYSTRUCT-02: Re-architect play-page structure presentation around page history and next objective

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None; server/view-model and UI composition only
**Deps**: `tickets/PLAYSTRUCT-01-structure-display-contract-and-state-semantics.md`, `tickets/README.md`, `archive/specs/analyst-insights-modal.completed.md`

## Problem

The current `/play` structure UI places act-end architecture, current-milestone completion criteria, and page identity in a single expandable block. This makes `Exit Reversal` appear like an immediate milestone rule when it is actually an act-end horizon, and it obscures the difference between “what this page just did” and “what the next scene must accomplish.”

The result is a UI that is technically populated with real data but semantically misleading.

## Assumption Reassessment (2026-03-18)

1. `src/server/views/pages/play.ejs` currently renders a single `act-structure-details` block containing act objective, stakes, milestone objective, act question, milestone exit condition, and exit reversal together.
2. `public/js/src/09-controllers.js` rebuilds the same mixed block after AJAX choice responses, so the ambiguity exists both on initial load and after navigation.
3. `src/server/utils/view-helpers.ts#getActDisplayInfo()` is already page-scoped. It derives act/milestone identity from `page.pageActIndex` and `page.pageMilestoneIndex`, not from next-target generation state.
4. `src/server/utils/view-helpers.ts#getMilestoneInfo()` is a separate helper. It already models milestone-conclusion banner semantics independently from `actDisplayInfo`.
5. `page.accumulatedStructureState.currentActIndex` / `currentMilestoneIndex` already persist the next active structure target, so a true next-target UI can be derived explicitly without guessing from page-scoped display data.
6. `public/js/src/05c-analyst-insights.js` currently consumes `actDisplayInfo` directly for structure-tab copy. That is workable but not ideal architecture; the modal should consume the same semantically separated structure payload as the main page instead of reaching into a mixed object.

## Architecture Check

1. The current route-level split between `actDisplayInfo` and `milestoneInfo` is better than the original ticket assumed, but the UI layer still collapses multiple semantics into one mixed panel.
2. The clean long-term architecture is to introduce a dedicated play-structure view model for `/play`, with separate sections for:
   - page history / current page placement
   - next active milestone target
   - act trajectory
3. `milestoneInfo` should remain the dedicated concluded-state banner contract. The new structure view model should complement it, not duplicate it.
4. No backwards-compatibility aliasing/shims introduced. Update route payloads, template rendering, fixtures, and client re-render paths to use the new structure view model directly. If existing tests or helpers break because they still expect `actDisplayInfo` for the structure panel, update them rather than preserving the old mixed contract.

## What to Change

### 1. Introduce an explicit play-structure view model

Add a dedicated helper/type for `/play` structure presentation instead of reusing `actDisplayInfo` as a UI bag of fields. The new view model should separate:

- `pageStructure`
  - page act / milestone identity derived from `page.pageActIndex` / `page.pageMilestoneIndex`
- `nextStructureTarget`
  - next active act / milestone identity derived from `page.accumulatedStructureState`
  - target milestone objective
  - target milestone exit criteria
- `actTrajectory`
  - act objective
  - stakes
  - act question
  - act-end reversal

The exact type names can vary, but the information architecture must separate:

- page history
- upcoming generation target
- act-level trajectory

`milestoneInfo` remains the separate banner for “what just resolved”.

### 2. Redesign the primary play-page structure summary

Replace the single mixed structure panel with distinct sections/cards built from the new structure view model. The UI must make it obvious when the page belongs to milestone `1.1` while the next scene target is already `1.2`.

### 3. Rename player-facing labels for semantic clarity

At minimum:

- `Exit Reversal` -> `Act-End Reversal`
- Use `Milestone Exit Criteria` consistently for milestone completion across the play page and Story Insights

Avoid labels that imply a single undifferentiated “current structure” object.

### 4. Align Story Insights with the new structure model

Story Insights should consume the same separated structure payload used by the page instead of reaching into `actDisplayInfo`.

If the modal shows act trajectory fields, those should live in a separate subsection from milestone completion gauges or next-target milestone criteria.

### 5. Preserve extensibility for future debug/recap surfaces

The UI composition should be modular enough that future surfaces can reuse:

- page history card
- next-target card
- act trajectory card

without duplicating markup logic between server render and client-side updates.

## Files to Touch

- `src/server/utils/view-helpers.ts` (modify)
- `src/server/views/pages/play.ejs` (modify)
- `public/js/src/09-controllers.js` (modify)
- `public/js/src/05c-analyst-insights.js` (modify)
- `public/js/src/04c-act-indicator.js` (modify if needed for new container semantics)
- `public/css/styles.css` (modify)
- `test/unit/server/utils/view-helpers.test.ts` (modify)
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
2. A milestone-concluding page can show both the concluded-milestone banner and the next-target structure card without contradictory labels.
3. Server render and AJAX re-render use the same structure semantics and labels.
4. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. Page history must remain derived from persisted page indices, not from accumulated next-target state.
2. Next-target milestone data must remain derived from accumulated structure state, not inferred from the current page card.
3. Act-level fields must never be rendered as if they are milestone completion criteria.
4. Client-side incremental updates must rebuild the same semantic structure as the initial server render.

## Test Plan

### New/Modified Tests

1. `test/unit/server/utils/view-helpers.test.ts` — assert the new play-structure view model separates page history, next target, and act trajectory correctly, including divergence cases.
2. `test/unit/server/views/play.test.ts` — assert separate structure sections and label semantics.
3. `test/unit/client/play-page/choice-click.test.ts` — assert AJAX updates preserve section boundaries after milestone advancement.
4. `test/unit/client/play-page/analyst-insights.test.ts` — verify the modal consumes the separated structure payload and keeps milestone criteria distinct from act trajectory.
5. `test/unit/client/fixtures/html-fixtures.ts` — update fixtures to match the re-architected structure UI contract.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/views/play.test.ts test/unit/client/play-page/choice-click.test.ts test/unit/client/play-page/analyst-insights.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- Completion date: 2026-03-18
- What changed:
  - Replaced the mixed `/play` structure panel with a dedicated `playStructureInfo` view model that separates page history from the next active structure target.
  - Updated the server render, AJAX choice response, client re-render path, and Story Insights context to consume the new structure payload.
  - Reworked the structure UI into explicit `This Page`, `Next Objective`, and `Act Arc` cards and aligned labels to `Milestone Exit Criteria` / `Act-End Reversal`.
  - Added regression coverage for page-vs-next-target divergence and for the new modal/page semantics.
- Deviations from the original plan:
  - Kept `milestoneInfo` as the separate concluded-state banner instead of folding resolved-state messaging into the new structure cards.
  - Kept `getActDisplayInfo()` as an internal page-scoped helper for existing semantics/tests, but removed the old mixed route/view payload in favor of `playStructureInfo`.
- Verification:
  - `npm run concat:js`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/views/play.test.ts test/unit/server/routes/play.test.ts test/unit/client/play-page/choice-click.test.ts test/unit/client/play-page/analyst-insights.test.ts`
  - `npm run test:unit -- --coverage=false`
  - `npm run typecheck`
  - `npm run lint`
