# EVOLVE-05: Add Evolution Progress Stage Constants

**Priority**: MEDIUM
**Depends on**: EVOLVE-03
**Blocks**: EVOLVE-06

## Summary

Add the new `EVOLVING_CONCEPTS` generation stage to the client-side constants so the progress spinner displays appropriate messages during the evolution pipeline.

## Files to Modify

1. **`public/js/src/01-constants.js`**
   - Add `EVOLVING_CONCEPTS` to `STAGE_DISPLAY_NAMES` map
     - Display name: "Evolving Concepts"
   - Add `EVOLVING_CONCEPTS` to `STAGE_PHRASE_POOLS` with spinner phrases like:
     - "Breeding offspring concepts..."
     - "Recombining parent traits..."
     - "Mutating concept engines..."
     - "Cross-pollinating ideas..."
     - "Evolving new variations..."

2. **`src/config/stage-model.ts`** (if not done in EVOLVE-01)
   - Add `conceptEvolver` stage model entry
   - Use same model as `conceptIdeator` (or configurable)

## Acceptance Criteria

- [ ] EVOLVING_CONCEPTS stage shows meaningful display name
- [ ] EVOLVING_CONCEPTS stage has phrase pool for spinner animation
- [ ] Existing EVALUATING_CONCEPTS and VERIFYING_CONCEPTS stages still work (they're reused)
- [ ] `app.js` regenerated via `node scripts/concat-client-js.js`
