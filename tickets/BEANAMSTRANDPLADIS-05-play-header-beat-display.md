# BEANAMSTRANDPLADIS-05: Display beat label and beat name in play header

## Summary
Extend play view display model and template so header renders `Act N: [ACT_NAME] - Beat X.Y: [BEAT_NAME]`.

## File list it expects to touch
- `src/server/utils/view-helpers.ts`
- `src/server/views/pages/play.ejs`
- `test/unit/server/utils/view-helpers.test.ts`
- `test/unit/server/views/play.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/integration/server/play-flow.test.ts`

## Implementation checklist
1. Extend `ActDisplayInfo` to carry beat label/name fields.
2. Update helper formatting to include beat segment in display string.
3. Update play template to consume the new display model.
4. Update route/view/integration assertions for new header text.

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
- `npm run test:integration -- --runTestsByPath test/integration/server/play-flow.test.ts`
- `npm run typecheck`

### Invariants that must remain true
- Header format is `Act ${actNumber}: ${actName} - Beat ${beatId}: ${beatName}`.
- Beat numbering still comes from `beat.id`, not a recomputed index.
- If structure data is invalid/missing beat names, architecture continues to fail earlier rather than silently rendering fallbacks.

