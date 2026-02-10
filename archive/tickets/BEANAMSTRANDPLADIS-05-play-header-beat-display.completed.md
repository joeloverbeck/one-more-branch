# BEANAMSTRANDPLADIS-05: Display beat label and beat name in play header

**Status**: ✅ COMPLETED

## Summary
Extend play view display model and template so header renders `Act N: [ACT_NAME] - Beat X.Y: [BEAT_NAME]`.

## Reassessed assumptions
- `StoryBeat.name` is already a required domain field (`src/models/story-arc.ts`) from prior tickets.
- Persistence and structure parsing contracts already enforce beat names; this ticket should not re-open those layers.
- `play.ejs` already renders `actDisplayInfo.displayString`; template shape does not need structural changes.
- `test/integration/server/play-flow.test.ts` currently does not assert play header text, so it is not required for this ticket's acceptance.
- Existing route/helper tests use empty `beats` arrays in fixture structures; those fixtures must include beats to validate beat-aware header behavior.

## File list in scope
- `src/server/utils/view-helpers.ts`
- `test/unit/server/utils/view-helpers.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/server/views/play.test.ts` (assertion-level confirmation only, no behavioral change)

## Implementation checklist
1. Extend `ActDisplayInfo` to carry beat label/name fields and a combined display string.
2. Update `getActDisplayInfo()` to resolve current beat from structure state and include beat segment in the display string.
3. Keep template consumption through `actDisplayInfo.displayString`; validate template tests still cover it.
4. Update unit route/helper assertions and fixtures to expect `Act ${actNumber}: ${actName} - Beat ${beatId}: ${beatName}`.

## Out of scope
- Do not modify persistence file shape.
- Do not modify structure generation/rewrite prompt/schema contracts.
- Do not modify parser/validation rules.
- Do not add fallback rendering paths for missing beat names.

## Acceptance criteria

### Specific tests that must pass
- `npm run test:unit -- --runTestsByPath test/unit/server/utils/view-helpers.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/views/play.test.ts`
- `npm run test:unit -- --runTestsByPath test/unit/server/routes/play.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Header format is `Act ${actNumber}: ${actName} - Beat ${beatId}: ${beatName}`.
- Beat numbering still comes from `beat.id`, not a recomputed index.
- If structure data is invalid/missing beat names, architecture continues to fail earlier rather than silently rendering fallbacks.

## Outcome
- **Completion date**: 2026-02-10
- **What changed**:
  - Updated `getActDisplayInfo()` to resolve current beat and build header text as `Act N: ... - Beat X.Y: ...`.
  - Extended `ActDisplayInfo` with `beatId` and `beatName`.
  - Updated unit tests in `view-helpers` and play routes to use beat-populated structures and assert beat-aware header payloads.
  - Added an edge-case unit test for out-of-bounds `currentBeatIndex`.
- **Deviations from original ticket assumptions**:
  - No changes were needed in persistence/parsing contracts; beat names were already required by prior completed tickets.
  - No integration test changes were needed because existing integration coverage does not assert play header text.
- **Verification**:
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/views/play.test.ts`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts`
  - `npm run typecheck`
