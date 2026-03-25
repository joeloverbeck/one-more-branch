# CONPACPIPIMP-010: Finish content-packets client rendering for pipeline changes

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-006 (playerPosition), CONPACPIPIMP-008 (new score dimensions + redundancyCluster), CONPACPIPIMP-001 (new TasteProfile fields)

## Problem

The content-packets UI still has one incomplete pipeline adaptation on the client side: generated packet rendering does not yet expose the 3 new taste profile fields, and the generated evaluation accordion does not yet surface `redundancyCluster`. The server-side presenter work that originally motivated this ticket has already landed.

## Assumption Reassessment (2026-03-25)

1. `CONTENT_PACKET_CONTEXT_FIELD_REGISTRY` already uses `{ key: 'playerPosition', label: 'Player Position' }`.
2. `EVALUATION_SCORE_FIELD_REGISTRY` already exposes the 10 current dimensions:
   `imageCharge`, `humanAche`, `socialLoadBearing`, `branchingPressure`,
   `surfaceFreshness`, `deepOriginality`, `sceneBurst`, `structuralIrony`,
   `tasteAlignment`, `causalSpecificity`.
3. `ContentPacketEvaluationDetails` already includes `redundancyCluster: string | null`.
4. `buildEvaluationDetails()` and `buildMetaDetails()` already propagate `redundancyCluster`.
5. Presenter tests already cover `playerPosition`, the 10 score dimensions, and meta-level redundancy display.
6. `TASTE_PROFILE_FIELDS` in `public/js/src/11-content-packets.js` still has only 9 entries and is missing `engagementModes`, `valueTensions`, and `deepPatterns`.
7. `renderEvaluationSection()` in `public/js/src/11-content-packets.js` still renders score bars, strengths, weaknesses, and role only; it does not render `redundancyCluster`.
8. `public/js/app.js` is generated via `node scripts/concat-client-js.js`; source edits must be made in `public/js/src/11-content-packets.js` and then regenerated.
9. The EJS template is already data-driven and does not need changes for this ticket.

## Architecture Check

1. The current server presenter already acts as the canonical shape/label source for packet card sections and evaluation details.
2. The remaining gap is purely in client rendering of already-available data, so the cleanest fix is to extend the existing client renderer rather than add new route/template logic.
3. No aliasing or compatibility layer is warranted here; generated cards should simply render the current schema completely.

## What to Change

### 1. Client-side JS (`public/js/src/11-content-packets.js`)

**`TASTE_PROFILE_FIELDS` array:**
Add 3 entries:
```javascript
{ key: 'engagementModes', label: 'Engagement Modes' },
{ key: 'valueTensions', label: 'Value Tensions' },
{ key: 'deepPatterns', label: 'Deep Patterns' },
```

**`renderEvaluationSection` function:**
Add conditional rendering for `redundancyCluster` from `card.evaluationDetails` — if present and non-null, show it in the evaluation detail list alongside `recommendedRole`.

### 2. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js` to regenerate the bundled client JS.

## Files to Touch

- `public/js/src/11-content-packets.js` (modify)
- `public/js/app.js` (regenerated)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)

## Out of Scope

- Model/interface changes to `ContentEvaluationScores`, `ContentPacketContext`, `TasteProfile` (earlier tickets)
- Schema changes (earlier tickets)
- Prompt changes (earlier tickets)
- EJS template changes
- Server route changes
- Presenter changes already implemented elsewhere
- Any pipeline logic or persistence changes

## Acceptance Criteria

### Tests That Must Pass

1. Existing presenter tests continue to pass without modification, confirming the server already reflects the current schema.
2. Client test verifies generated taste profile rendering includes `engagementModes`, `valueTensions`, and `deepPatterns`.
3. Client test verifies generated evaluation rendering includes `redundancyCluster` when present.
4. `public/js/app.js` is regenerated and matches the updated source file.
5. Relevant unit/client suites pass, followed by repo lint and full test suite.

### Invariants

1. Presenter-owned field labels and ordering remain untouched.
2. Score bar rendering logic remains unchanged; only the evaluation metadata display is extended.
3. Taste profile rendering remains data-driven through `TASTE_PROFILE_FIELDS`.
4. EJS template requires no modifications.

## Test Plan

### New/Modified Tests

1. `test/unit/client/content-packets-page/controller.test.ts` — add coverage for the 3 new taste profile fields and evaluation redundancy rendering

### Commands

1. `node scripts/concat-client-js.js`
2. `npm run test:client`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-25
- Actual changes:
  - Corrected the ticket scope after reassessment: presenter and route work had already landed, so the implementation was narrowed to client rendering only.
  - Added `engagementModes`, `valueTensions`, and `deepPatterns` to the generated taste-profile renderer in `public/js/src/11-content-packets.js`.
  - Added evaluation rendering for `redundancyCluster` alongside `recommendedRole`.
  - Regenerated `public/js/app.js`.
  - Strengthened the client controller test to cover the new taste-profile fields and redundancy display.
- Deviations from original plan:
  - No presenter changes were required.
  - No EJS or route changes were required.
- Verification results:
  - `node scripts/concat-client-js.js`
  - `npm run test:client -- --runInBand`
  - `npm run lint`
  - `npm test -- --runInBand`
