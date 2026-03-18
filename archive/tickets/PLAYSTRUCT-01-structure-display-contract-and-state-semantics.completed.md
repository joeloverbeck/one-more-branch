# PLAYSTRUCT-01: Lock play-page structure display semantics to page history, not next-target state

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No production behavior changes expected; regression coverage only unless reassessment uncovers a real contract bug
**Deps**: `tickets/README.md`, `archive/specs/story-architecture-generation-spec-v2.md`, `archive/specs/analyst-insights-modal.completed.md`

## Problem

This ticket originally assumed the `/play` contract was overloading `actDisplayInfo` with both:

1. page-scoped historical placement (`page.pageActIndex`, `page.pageMilestoneIndex`)
2. next-generation targeting (`accumulatedStructureState.currentActIndex`, `currentMilestoneIndex`)

That assumption is incorrect in the current codebase. The real gap is weaker regression coverage around this invariant. On milestone-concluding pages, `page.pageMilestoneIndex` and `accumulatedStructureState.currentMilestoneIndex` are allowed to diverge by design, and we need tests that prevent future refactors from collapsing those two meanings together.

## Assumption Reassessment (2026-03-18)

1. `getActDisplayInfo()` in `src/server/utils/view-helpers.ts` already derives display data strictly from `page.pageActIndex` / `page.pageMilestoneIndex`.
2. `getMilestoneInfo()` is a separate helper. It derives banner semantics from `page.analystResult?.milestoneConcluded` plus `page.accumulatedStructureState.milestoneProgressions`.
3. `GET /play/:storyId` render locals and `POST /play/:storyId/choice` JSON both already return `actDisplayInfo` and `milestoneInfo` as separate route-level concepts.
4. The client and analyst insights modal currently consume `actDisplayInfo` as page-scoped display data only. They do not derive or display the next-active milestone target.
5. Because the next-target concept is not currently rendered anywhere in the `/play` UI, introducing a parallel `NextStructureTargetDisplay` payload now would add unused surface area and duplicate state without improving clarity.

## Architecture Decision

The current architecture is cleaner than the original ticket gave it credit for:

1. `actDisplayInfo` already models page history.
2. `milestoneInfo` already models completion/banner state.
3. `accumulatedStructureState` remains the generation-state source of truth for engine/prompt flows.

The durable architectural move is not to replace this with a broader contract rewrite. It is to lock the existing semantic separation down with focused tests. If the UI later needs an explicit "next active milestone" display, that should be introduced as a narrowly scoped, first-class field for that concrete consumer, not as speculative parallel payloads added preemptively.

## What to Change

### 1. Add regression tests for page-vs-generation divergence

Add tests proving that when a page concludes milestone `1.1` and the accumulated state has already advanced to `1.2`:

- `actDisplayInfo` still reflects milestone `1.1`
- `milestoneInfo` still reflects the concluded milestone banner correctly
- no route consumer silently swaps display semantics to the next target

### 2. Validate route parity for existing semantics

Strengthen route tests so both:

- `GET /play/:storyId`
- `POST /play/:storyId/choice`

preserve the current split between page display info and milestone-conclusion info when page indices and accumulated state diverge.

## Files to Touch

- `test/unit/server/utils/view-helpers.test.ts` (modify)
- `test/unit/server/routes/play.test.ts` (modify)

## Out of Scope

- Replacing `actDisplayInfo` with new view-model types
- Adding a next-target structure payload to the play route
- Updating `play.ejs` or client controllers without a demonstrated UI requirement
- Prompt wording changes unrelated to route/view semantics
- Story data regeneration

## Acceptance Criteria

### Tests That Must Pass

1. A milestone-concluding page can expose page-scoped structure display and milestone-conclusion banner semantics simultaneously, even when `accumulatedStructureState` has already advanced.
2. GET and POST play-route consumers preserve the existing semantic split under that divergence.
3. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. `actDisplayInfo` must remain derived from persisted page indices, never from next-generation state.
2. `milestoneInfo` may reflect concluded-progress state and therefore may legitimately refer to a different milestone lifecycle fact than `actDisplayInfo`.
3. Any future "next active milestone" UI must get its own explicit contract field rather than overloading either existing object.

## Test Plan

### New/Modified Tests

1. `test/unit/server/utils/view-helpers.test.ts` — verify `getActDisplayInfo()` remains page-scoped even when `accumulatedStructureState` has advanced, and that `getMilestoneInfo()` still reports the concluded milestone banner correctly.
2. `test/unit/server/routes/play.test.ts` — verify GET render locals and POST JSON preserve that semantic split on milestone-concluding pages.

### Commands

1. `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/routes/play.test.ts`
2. `npm run test:unit -- --coverage=false`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- Completion date: 2026-03-18
- What changed:
  - Reassessed the ticket against the live code and tests.
  - Corrected the ticket scope: no production contract rewrite was warranted because `actDisplayInfo`, `milestoneInfo`, and `accumulatedStructureState` already represent separate concerns.
  - Added regression coverage to prevent future refactors from collapsing page-scoped display semantics into next-target generation semantics.
- Deviations from the original plan:
  - Did not modify server routes, view helpers, templates, or client contracts beyond tests.
  - Rejected the proposed introduction of parallel structure-display payloads as unnecessary architectural surface area for the current UI.
- Verification:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/routes/play.test.ts`
  - `npm run test:unit -- --coverage=false`
  - `npm run typecheck`
  - `npm run lint`
