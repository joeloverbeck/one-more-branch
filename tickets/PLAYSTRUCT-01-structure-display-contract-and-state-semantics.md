# PLAYSTRUCT-01: Separate play-page structure display contracts from generation state semantics

**Status**: PENDING
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — server view helpers, play route response contracts, client data contract for page transitions
**Deps**: `tickets/README.md`, `archive/specs/story-architecture-generation-spec-v2.md`, `archive/specs/analyst-insights-modal.completed.md`

## Problem

The current `/play` contract overloads one UI-facing object, `actDisplayInfo`, with two different meanings:

1. historical page labeling (`page.pageActIndex`, `page.pageMilestoneIndex`)
2. forward-looking generation context (`accumulatedStructureState.currentActIndex`, `currentMilestoneIndex`)

This makes milestone/act presentation confusing on milestone-concluding pages. A page can truthfully belong to milestone `1.1` while the next generation step is already milestone `1.2`, but the current contract does not make that distinction explicit. As a result, act-end fields like `exitReversal` are shown next to current-milestone completion fields without a clean semantic boundary.

## Assumption Reassessment (2026-03-18)

1. Current play-page rendering derives `actDisplayInfo` from `page.pageActIndex` / `page.pageMilestoneIndex` in `src/server/utils/view-helpers.ts`, not from `accumulatedStructureState`.
2. Planner/lorekeeper continuation prompts derive active structure context from `accumulatedStructureState.currentActIndex` / `currentMilestoneIndex` via `buildSharedStructureContext()` in `src/llm/prompts/sections/planner/continuation-context.ts` and `src/llm/prompts/lorekeeper-prompt.ts`.
3. Mismatch confirmed: persisted page JSON for the investigated story shows `pageMilestoneIndex: 0` while `accumulatedStructureState.currentMilestoneIndex: 1`, so current UI and next-generation context are intentionally out of phase on milestone-concluding pages. The corrected scope of this ticket is to make that distinction first-class in the server/client contract rather than trying to infer it ad hoc in the UI.

## Architecture Check

1. The clean approach is to introduce explicit, separate display models for page-scoped structure and next-active generation structure, rather than extending `actDisplayInfo` with more conditional flags or UI-only booleans. This keeps view semantics honest and reusable across server render, AJAX updates, Story Insights, and future recap/debug surfaces.
2. No backwards-compatibility aliasing/shims introduced. This ticket should replace the overloaded `actDisplayInfo` contract with clearly named structures and update all consumers in the same pass.

## What to Change

### 1. Introduce explicit structure-display view models

Define dedicated server-side display contracts that separate:

- page-scoped structure position
  - the act/milestone this page belongs to
  - the act-level architecture relevant to interpreting this page historically
- next-active structure context
  - the act/milestone the next generation step will target
  - the milestone completion contract and trajectory context for upcoming generation

The model names should reflect semantics, for example:

- `PageStructureDisplay`
- `NextStructureTargetDisplay`
- `StructureDisplayPayload`

Do not keep `actDisplayInfo` as a generic bucket with optional meaning. The payload should make it impossible for consumers to confuse page history with next-active generation state.

### 2. Centralize structure-display assembly in view helpers

Replace the current helper shape in `src/server/utils/view-helpers.ts` with builders that:

- derive page-scoped display strictly from persisted page indices
- derive next-active display from `page.accumulatedStructureState`
- expose milestone completion / act trajectory fields under their correct scope
- expose transition metadata when the page concluded a milestone or advanced an act

Transition metadata should be explicit enough for the UI to say things like:

- `This page resolved milestone 1.1`
- `Next active milestone: 1.2`

without recomputing hidden state in the browser.

### 3. Update route and AJAX contracts

Update `src/server/routes/play.ts` so both full-page render and `POST /play/:storyId/choice` return the same structure-display payload shape.

The route contract should be the source of truth for all play-page structure presentation. Avoid client-side derivation from unrelated fields.

### 4. Reconcile milestone banner / display semantics

Ensure milestone-concluded pages can simultaneously represent:

- the page’s historical milestone slot
- any concluded milestone banner
- the next-active target for future generation

without collapsing these into a single “current milestone” label.

This may require updating helper names and tests around `milestoneInfo` so the page contract reads coherently.

## Files to Touch

- `src/server/utils/view-helpers.ts` (modify)
- `src/server/utils/index.ts` (modify)
- `src/server/routes/play.ts` (modify)
- `src/server/views/pages/play.ejs` (modify)
- `public/js/src/09-controllers.js` (modify)
- `public/js/src/05c-analyst-insights.js` (modify)
- `test/unit/server/utils/view-helpers.test.ts` (modify)
- `test/unit/server/routes/play.test.ts` (modify)
- `test/unit/client/play-page/choice-click.test.ts` (modify)
- `test/unit/client/play-page/analyst-insights.test.ts` (modify)
- `test/unit/server/views/play.test.ts` (modify)

## Out of Scope

- Cosmetic CSS-only restyling without contract cleanup
- Prompt wording changes unrelated to display-state semantics
- Story data regeneration

## Acceptance Criteria

### Tests That Must Pass

1. A page that concludes a milestone can expose both page-scoped milestone labeling and next-active milestone targeting without ambiguity.
2. GET and POST play-route payloads expose the same structure-display contract shape.
3. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. Page-scoped structure display must be derived from persisted page indices, never inferred from next-generation state.
2. Next-active generation display must be derived from accumulated structure state, never inferred from page milestone labels.

## Test Plan

### New/Modified Tests

1. `test/unit/server/utils/view-helpers.test.ts` — verify separate page-scoped and next-active structure payloads, especially on milestone-concluding pages.
2. `test/unit/server/routes/play.test.ts` — verify GET render locals and POST JSON return the new payload consistently.
3. `test/unit/client/play-page/choice-click.test.ts` — verify client updates structure UI correctly across milestone transitions.
4. `test/unit/client/play-page/analyst-insights.test.ts` — verify insights consume the new structure payload without scope confusion.
5. `test/unit/server/views/play.test.ts` — verify template references the new contract rather than the old overloaded object.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/routes/play.test.ts test/unit/server/views/play.test.ts test/unit/client/play-page/choice-click.test.ts test/unit/client/play-page/analyst-insights.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`

