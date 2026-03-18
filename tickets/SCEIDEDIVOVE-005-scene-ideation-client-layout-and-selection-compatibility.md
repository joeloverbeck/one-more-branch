# SCEIDEDIVOVE-005: Keep scene ideation client UX usable with five options

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: No — client presentation and selection flow only
**Deps**: `tickets/SCEIDEDIVOVE-002-scene-ideator-output-contract-and-validation.md`, `tickets/SCEIDEDIVOVE-003-scene-ideator-prompt-slate-instructions.md`

## Problem

The client renderer loops over any option array, but the current tests and layout were only exercised with 2-3 cards. Moving to 5 options increases density and introduces a new hidden field that must not break selection/edit flows.

## Assumption Reassessment (2026-03-18)

1. `public/js/src/04f-scene-direction-renderer.js` already renders options via `forEach`, so there is no hard-coded 3-card loop to remove.
2. `captureSceneDirectionEdits()` currently returns only the visible scene-direction fields and would silently drop `diversityLane` if the selected payload is expected to preserve it.
3. `public/css/styles.css` defines a simple grid for `.scene-direction-options`, but there is no explicit density handling for a 5-card slate.

## Architecture Check

1. The UI should remain agnostic to lane semantics in the first pass. Preserve hidden metadata only if the backend selected payload expects it, but do not surface lane badges or explanatory copy here.
2. Client changes should be minimal and focused on preserving usability and payload integrity, not on redesigning the ideation flow.

## What to Change

### 1. Preserve selection payload integrity

If `SelectedSceneDirection` includes `diversityLane` after ticket 002, update the renderer/controller flow so selecting and editing a card preserves that field in the confirmed payload.

### 2. Exercise five-card rendering explicitly

Update client tests to render and confirm against a 5-option ideation response in both briefing and play flows.

### 3. Adjust layout only as needed for 5-card usability

Make targeted CSS changes so five cards remain readable on common viewport widths without exposing `diversityLane` in the UI.

If client source files change, regenerate `public/js/app.js` in the same pass.

## Files to Touch

- `public/js/src/04f-scene-direction-renderer.js` (modify, only if selected payload must keep `diversityLane`)
- `public/js/src/13-scene-ideation-controller.js` (modify only if needed)
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
3. If `diversityLane` is retained on selection payloads, the relevant client test verifies that field survives confirmation.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/client/briefing-page/begin-adventure.test.ts test/unit/client/play-page/choice-click.test.ts`

### Invariants

1. The user still selects exactly one scene direction before continuing, and confirm remains disabled until a card is selected.
2. `diversityLane` stays hidden from the initial UI pass even if it is preserved in the payload.

## Test Plan

### New/Modified Tests

1. `test/unit/client/briefing-page/begin-adventure.test.ts` — update fixture ideation responses to five options and verify selected payload shape.
2. `test/unit/client/play-page/choice-click.test.ts` — verify five-option continuation ideation does not break the confirm-and-post flow.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/client/briefing-page/begin-adventure.test.ts test/unit/client/play-page/choice-click.test.ts`
2. `npm run concat:js`
