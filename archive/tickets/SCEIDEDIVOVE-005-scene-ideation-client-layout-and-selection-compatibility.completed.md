# SCEIDEDIVOVE-005: Keep scene ideation client UX usable with five options

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No — client presentation and selection flow only
**Deps**: `tickets/SCEIDEDIVOVE-002-scene-ideator-output-contract-and-validation.md`, `tickets/SCEIDEDIVOVE-003-scene-ideator-prompt-slate-instructions.md`

## Problem

The client renderer loops over any option array, but the current tests and layout were only exercised with 2-3 cards. Moving to 5 options increases density and introduces a new hidden field that must not break selection/edit flows.

## Assumption Reassessment (2026-03-18)

1. `public/js/src/04f-scene-direction-renderer.js` already renders options via `forEach`, so there is no hard-coded 3-card loop to remove.
2. `src/models/scene-direction.ts` intentionally separates `SceneDirectionOption` from `SelectedSceneDirection`: `diversityLane` is ideator-only metadata and is not part of the confirmed planner payload.
3. `src/server/utils/request-normalizers.ts` enforces that separation today by normalizing only `scenePurpose`, `valuePolarityShift`, `pacingMode`, `sceneDirection`, and `dramaticJustification`. `test/unit/server/utils/normalize-scene-direction.test.ts` already asserts that extra `diversityLane` input is ignored.
4. `public/css/styles.css` defines a simple single-column grid for `.scene-direction-options`, but there is no explicit density handling for a 5-card slate on wider viewports.
5. Current client tests still exercise only 2-3 ideation cards, so they do not yet prove the five-option UX that the upstream ideator contract now expects.

## Architecture Check

1. The current split between `SceneDirectionOption` and `SelectedSceneDirection` is the cleaner long-term architecture. `diversityLane` belongs to ideation-time validation and observability, not to the downstream confirmed direction contract.
2. The UI should remain agnostic to lane semantics in this pass. Do not surface lane badges, labels, or explanatory copy, and do not thread ideator-only metadata through the confirm flow.
3. Client changes should stay focused on two things only: proving five-option flows in tests and keeping the five-card layout readable without redesigning the ideation flow.

## What to Change

### 1. Keep the confirmed payload contract narrow

Do not add `diversityLane` to `SelectedSceneDirection` or the client confirm flow. The selected payload should remain the planner-facing subset only.

### 2. Exercise five-card rendering explicitly

Update client tests to render and confirm against a 5-option ideation response in both briefing and play flows.

### 3. Adjust layout only as needed for 5-card usability

Make targeted CSS changes so five cards remain readable on common viewport widths without exposing `diversityLane` in the UI. Prefer responsive density improvements over controller/renderer rewrites.

If client source files change, regenerate `public/js/app.js` in the same pass.

## Files to Touch

- `public/js/src/04f-scene-direction-renderer.js` (no change expected unless five-card UX reveals a concrete renderer defect)
- `public/js/src/13-scene-ideation-controller.js` (no change expected unless five-card UX reveals a concrete controller defect)
- `public/css/styles.css` (modify, if layout adjustments are required)
- `public/js/app.js` (regenerate only if client source files changed)
- `test/unit/client/briefing-page/begin-adventure.test.ts` (modify)
- `test/unit/client/play-page/choice-click.test.ts` (modify)

## Out of Scope

- Showing lane badges, labels, or explanations in the UI
- Server-side scene ideator generation logic
- Planner behavior
- Broad visual redesign of the play or briefing pages

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/client/briefing-page/begin-adventure.test.ts` verifies a 5-option ideation response still allows selecting one card and posting a valid `selectedSceneDirection`.
2. `test/unit/client/play-page/choice-click.test.ts` verifies the ideation-to-choice flow still succeeds when the ideator returns 5 options.
3. Client assertions confirm the posted `selectedSceneDirection` remains limited to the planner-facing fields and does not include `diversityLane`.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/client/briefing-page/begin-adventure.test.ts test/unit/client/play-page/choice-click.test.ts`

### Invariants

1. The user still selects exactly one scene direction before continuing, and confirm remains disabled until a card is selected.
2. `diversityLane` remains ideator-only metadata: it stays hidden from the UI and out of the confirmed payload.

## Test Plan

### New/Modified Tests

1. `test/unit/client/briefing-page/begin-adventure.test.ts` — update fixture ideation responses to five options, verify all five cards render, and assert the posted payload excludes `diversityLane`.
2. `test/unit/client/play-page/choice-click.test.ts` — verify five-option continuation ideation renders correctly and still completes the confirm-and-post flow.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/client/briefing-page/begin-adventure.test.ts test/unit/client/play-page/choice-click.test.ts`
2. `npm run concat:js`

## Outcome

- **Completion date**: 2026-03-18
- **What actually changed**: Reassessed the ticket against the current code and corrected the contract assumptions first. Strengthened the briefing and play client tests to exercise five ideation cards and assert that `diversityLane` remains ideator-only metadata. Added a minimal responsive two-column layout for scene-direction cards on wider viewports.
- **Deviations from the original plan**: No renderer/controller contract changes were needed. The existing architecture was already correct in keeping `SelectedSceneDirection` narrower than `SceneDirectionOption`, so the implementation stayed in tests plus targeted CSS rather than adding payload preservation logic.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/client/briefing-page/begin-adventure.test.ts test/unit/client/play-page/choice-click.test.ts`
  - `npm run lint`
  - `npm test`
