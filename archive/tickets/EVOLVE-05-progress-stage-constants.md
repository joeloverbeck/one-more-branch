# EVOLVE-05: Add Evolution Progress Stage Constants

**Priority**: MEDIUM
**Depends on**: EVOLVE-03
**Blocks**: EVOLVE-06
**Status**: COMPLETED

## Summary

Add the new `EVOLVING_CONCEPTS` generation stage to the client-side constants so the progress spinner displays appropriate messages during the evolution pipeline.

## Assumption Reassessment (2026-02-21)

- `src/config/stage-model.ts` and stage-model wiring are already complete in the current codebase.
- `conceptEvolver` already exists in stage registry/config/tests.
- The remaining gap is client-only: `public/js/src/01-constants.js` does not yet define `EVOLVING_CONCEPTS` in `STAGE_DISPLAY_NAMES` or `STAGE_PHRASE_POOLS`.
- Existing loading progress tests validate generic stage mapping but do not explicitly cover `EVOLVING_CONCEPTS`.

## Files to Modify

1. **`public/js/src/01-constants.js`**
   - Add `EVOLVING_CONCEPTS` to `STAGE_DISPLAY_NAMES` map
     - Display label should follow existing compact style (uppercase stage verb), not title case.
   - Add `EVOLVING_CONCEPTS` to `STAGE_PHRASE_POOLS` with spinner phrases like:
     - "Breeding offspring concepts..."
     - "Recombining parent traits..."
     - "Mutating concept engines..."
     - "Cross-pollinating ideas..."
     - "Evolving new variations..."

2. **`test/unit/client/loading-progress/progress-controller.test.ts`**
   - Add explicit coverage that `EVOLVING_CONCEPTS` maps to the configured display label.
   - Add explicit coverage that `EVOLVING_CONCEPTS` uses its phrase pool instead of fallback text.

## Acceptance Criteria

- [x] EVOLVING_CONCEPTS stage shows meaningful display name
- [x] EVOLVING_CONCEPTS stage has phrase pool for spinner animation
- [x] Existing EVALUATING_CONCEPTS and VERIFYING_CONCEPTS stages still work (they're reused)
- [x] `test/unit/client/loading-progress/progress-controller.test.ts` includes EVOLVING-specific assertions
- [x] `app.js` regenerated via `node scripts/concat-client-js.js`

## Outcome

- **Completion date**: 2026-02-21
- **What changed**:
  - Added `EVOLVING_CONCEPTS` phrase pool and display label (`EVOLVING`) to `public/js/src/01-constants.js`.
  - Regenerated bundled client script via `node scripts/concat-client-js.js` (`public/js/app.js`).
  - Added explicit EVOLVING progress coverage in `test/unit/client/loading-progress/progress-controller.test.ts` for both stage-label mapping and phrase-pool usage.
- **Deviation from original plan**:
  - The ticket originally included optional stage-model work; this was removed after reassessment because `conceptEvolver` stage model wiring already existed and was already tested.
  - Display text was implemented as compact uppercase (`EVOLVING`) to match current UX conventions rather than title case.
- **Verification**:
  - `npm run test:unit -- --coverage=false`
  - `npm run lint`
