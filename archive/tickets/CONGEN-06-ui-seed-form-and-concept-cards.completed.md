# CONGEN-06: UI — Seed Form and Concept Cards

**Status**: COMPLETED
**Depends on**: Backend concept endpoints available (`POST /stories/generate-concepts`, `POST /stories/stress-test-concept`)
**Blocks**: CONGEN-07

## Summary

Add concept generation UI to the new-story page: a seed input step, concept card rendering, and selection flow before the existing manual story fields + spine generation step.

## Assumptions Reassessed (Code/Test Reality)

1. Concept backend routes already exist and are wired (`/stories/generate-concepts`, `/stories/stress-test-concept`), so this ticket is UI-first integration, not route creation.
2. `LlmStage` already includes concept stages in `src/config/stage-model.ts`; this ticket does not need stage-model edits.
3. Progress service `GenerationStage` does not yet include concept-specific stage literals. Concept generation can still use existing polling lifecycle, but stage phrase/display mappings will only activate once concept stages are emitted by backend progress events.
4. Evaluator output is **1-3** concepts (not guaranteed exactly 3). UI must render the returned count robustly.
5. Existing client coverage does not currently include concept UI flows; this ticket must add focused client tests.
6. If manual fields are hidden initially, API key entry must still be available during concept generation.

## Files to Create

- `public/js/src/04d-concept-renderer.js`

## Files to Touch

- `src/server/views/pages/new-story.ejs` — Add concept seed section and concept cards container ahead of manual story fields
- `public/js/src/01-constants.js` — Add concept-related stage phrase pools and display names
- `public/js/src/09-controllers.js` — Extend `initNewStoryPage()` with concept generation + selection flow
- `test/unit/client/new-story-page/form-submit.test.ts` — Add concept flow controller tests
- `test/unit/client/fixtures/html-fixtures.ts` — Align fixture with concept-step DOM structure
- `test/unit/server/public/app.test.ts` — Assert concept stage constants are present in bundled script
- `public/js/app.js` — Regenerated via `node scripts/concat-client-js.js` (not manually edited)

## Out of Scope

- Form pre-fill mapping from selected concept to story fields (CONGEN-07)
- Story model changes and persistence changes (CONGEN-07)
- Concept stress-test execution wiring from UI toggle (CONGEN-07)
- Stage registration / concept stage event emission in backend progress flow (tracked separately)
- Existing play page, briefing page, or unrelated views

## Work Description

### 1. EJS Template Changes (`new-story.ejs`)

Add concept-first UX before manual story details.

- Add a `Concept Seed` section with fields:
  - `Genre Vibes`
  - `Mood Keywords`
  - `Content Preferences`
  - `Thematic Interests`
  - `Spark Line`
- Keep API key entry available during concept generation.
- Add `Generate Concepts` button.
- Add `Skip — I have my own concept` action that bypasses concept generation and reveals manual story fields.
- Add concept results section (initially hidden) with `#concept-cards` container.
- Place existing manual story inputs in a dedicated section that is initially hidden and becomes visible after skip or concept selection.

### 2. Concept Renderer (`04d-concept-renderer.js`)

Follow renderer pattern consistency with existing client modules.

- `renderConceptCards(evaluatedConcepts, container, onSelect)` renders the returned concept list.
- Card content includes:
  - One-line hook
  - Elevator paragraph
  - Genre frame + conflict axis badges
  - Protagonist role
  - 6 score bars (0-5 scaling)
  - Tradeoff summary
  - Strengths / weaknesses lists
  - `Harden this concept` checkbox (visual placement only in this ticket)
- Card click selects one card at a time and invokes callback with selected concept payload.

### 3. Constants Updates (`01-constants.js`)

Add phrase pools (20+ each):
- `GENERATING_CONCEPTS`
- `EVALUATING_CONCEPTS`
- `STRESS_TESTING_CONCEPT`

Add display names:
- `GENERATING_CONCEPTS: 'IDEATING'`
- `EVALUATING_CONCEPTS: 'EVALUATING'`
- `STRESS_TESTING_CONCEPT: 'HARDENING'`

### 4. Controller Updates (`09-controllers.js`)

Extend `initNewStoryPage()`:
- Wire `Generate Concepts` to `POST /stories/generate-concepts`.
- Send seed fields + `apiKey` + `progressId`.
- Show loading overlay and use existing progress polling lifecycle.
- On success, render concept cards and show concept results section.
- Wire skip action to reveal manual story section.
- Wire concept card selection to store selected concept client-side and reveal manual story section for the next step.

### 5. Regenerate Client Bundle

Run `node scripts/concat-client-js.js`.

## Acceptance Criteria

### Tests That Must Pass

1. Client tests (`npm run test:client`) pass.
2. `STAGE_PHRASE_POOLS` includes concept keys with 20+ entries each.
3. `STAGE_DISPLAY_NAMES` includes the 3 concept stage display names.
4. New-story controller tests verify:
   - Concept request posts correct payload to `/stories/generate-concepts`.
   - Skip reveals manual story section.
   - Concept selection reveals manual story section.
5. Existing spine generation tests continue to pass under the updated DOM structure.

### Manual Verification

1. Seed form renders with all 5 seed fields.
2. API key can be entered before concept generation.
3. Concept cards render from returned evaluated concepts (1-3).
4. Skip path still allows normal manual story + spine flow.

## Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Existing manual story creation flow remains functional (skip → manual fields → generate spines → create)
- `app.js` is regenerated, never hand-edited
- New client code remains inside the app IIFE/module pattern
- No new npm dependencies added

## Outcome

- **Completion date**: 2026-02-18
- **What changed**:
  - Added concept-first UI sections to `new-story.ejs`: seed inputs, concept generation action, skip action, concept cards container, and manual story section reveal flow.
  - Added dedicated concept renderer module `public/js/src/04d-concept-renderer.js` for card rendering, score bars, selection state, and harden-toggle placement.
  - Extended new-story controller flow in `public/js/src/09-controllers.js` to call `/stories/generate-concepts`, render returned concepts, and reveal manual story fields on skip/selection.
  - Added concept stage phrase pools/display names in `public/js/src/01-constants.js`.
  - Added/updated tests for concept flow and bundle assertions.
  - Regenerated `public/js/app.js`.
- **Deviations from original plan**:
  - Corrected assumptions to reflect code reality: concept evaluator returns 1-3 items (not always 3), and backend concept routes already existed.
  - Kept stress-test checkbox as UI placement only; no stress-test execution wiring in this ticket.
- **Verification**:
  - `npm test` passed.
  - `npm run test:client` passed.
  - `npm test -- test/unit/server/public/app.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
