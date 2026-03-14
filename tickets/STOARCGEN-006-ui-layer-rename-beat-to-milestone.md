# STOARCGEN-006: UI Layer Rename — beat to milestone

**Status**: TODO
**Depends on**: STOARCGEN-001, STOARCGEN-003
**Blocks**: STOARCGEN-007

## Summary

Update all server-side view helpers, EJS templates, and client-side JavaScript files to use `milestone` terminology instead of `beat`.

## Files to Touch

### Server-side
- `src/server/utils/view-helpers.ts` — Rename beat refs in `ActDisplayInfo` and helper functions
- `src/server/utils/page-panel-data.ts` — Rename beat refs
- `src/server/views/pages/play.ejs` — Rename beat refs in template

### Client-side JS (source files in `public/js/src/`)
- `public/js/src/00-stage-metadata.js` — Rename beat refs in stage names/labels
- `public/js/src/04c-act-indicator.js` — Rename beat → milestone in act/milestone indicator
- `public/js/src/05c-analyst-insights.js` — Rename beat refs in analyst display
- `public/js/src/06-state-renderers.js` — Rename beat refs in state panel
- `public/js/src/09-controllers.js` — Rename beat refs in controller logic

### Generated file
- Run `node scripts/concat-client-js.js` to regenerate `public/js/app.js`

## Detailed Changes

### `view-helpers.ts`
- Any `beat`-related field names in `ActDisplayInfo` or return types → `milestone`
- Function parameter names and local variables

### `play.ejs`
- Template variable references to beat data → milestone
- Display text: "Beat" → "Milestone" where user-facing
- Data attribute names if any reference beat

### Client JS files
- Variable names, function names, property accesses referencing `beat` → `milestone`
- Display strings: "Beat" → "Milestone"
- Stage metadata keys if they reference beat

### Regenerate `app.js`
After editing all source files, run `node scripts/concat-client-js.js` to produce the concatenated output.

## Out of Scope

- Server route handlers (should not need changes for pure rename)
- New UI fields (actQuestion, exitCondition, exitReversal, anchorMoments) — that's STOARCGEN-015
- Test files (STOARCGEN-007)
- Backend logic changes

## Acceptance Criteria

### Tests that must pass
- `test/unit/server/utils/view-helpers.test.ts` passes after mock updates
- `test/unit/server/utils/page-panel-data.test.ts` passes after mock updates
- `npm run test:client` passes (tests run against generated `app.js`)

### Invariants that must remain true
- Play page renders correctly with renamed fields
- Act/milestone indicator shows correct position
- Analyst insights modal displays correctly
- State panel renders correctly
- `app.js` is regenerated and consistent with source files
- No visual regressions — only label text changes ("Beat" → "Milestone")
