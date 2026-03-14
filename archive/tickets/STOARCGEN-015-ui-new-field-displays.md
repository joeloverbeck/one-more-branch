# STOARCGEN-015: UI New Field Displays

**Status**: COMPLETED
**Depends on**: STOARCGEN-008 (new fields), STOARCGEN-006 (UI rename complete)
**Blocks**: None

## Summary

Display the already-generated high-signal structure fields in the play page, briefing page, and analyst insights modal. This is a UI/data-contract follow-through ticket, not a model or generation-pipeline ticket.

## Reassessed Assumptions

- `anchorMoments`, `actQuestion`, `exitReversal`, `promiseTargets`, `obligationTargets`, and milestone `exitCondition` already exist in the current runtime model and structure pipeline.
- The missing work is in server view helpers, route payloads, EJS templates, client rendering, and tests.
- The briefing route is not a standalone `src/server/routes/briefing.ts` file. Briefing rendering currently lives in `src/server/routes/play.ts` under `GET /:storyId/briefing`.
- The analyst insights modal currently receives only a flattened `actDisplayInfo` string in `#insights-context`. To expose act-level and milestone-level structure fields cleanly, this payload should carry structured data rather than more ad hoc strings.
- Dynamic act-indicator updates after choice generation are handled in `public/js/src/09-controllers.js`, so ticket scope must include that file in addition to `public/js/src/04c-act-indicator.js`.
- Existing stories may still lack some of these fields at persistence boundaries. UI behavior must remain robust when fields are empty strings or empty arrays.

## Files to Touch

### Server-side
- `src/server/utils/view-helpers.ts` - Expand `ActDisplayInfo` with the existing structure fields and update `getActDisplayInfo()`
- `src/server/routes/play.ts` - Pass `anchorMoments` into the briefing template and pass structured insights context into the play template
- `src/server/views/pages/play.ejs` - Display `actQuestion`, `exitCondition`, `exitReversal`, and structured insights context
- `src/server/views/pages/briefing.ejs` - Display `anchorMoments` summary

### Client-side JS
- `public/js/src/04c-act-indicator.js` - Keep toggle behavior working with the expanded structure-details markup
- `public/js/src/05c-analyst-insights.js` - Consume structured insights context and display `actQuestion` plus `exitCondition`
- `public/js/src/09-controllers.js` - Rebuild the compact act-indicator and expanded structure-details DOM on choice responses using expanded `actDisplayInfo`
- Run `node scripts/concat-client-js.js` to regenerate `app.js`

### Tests
- `test/unit/server/utils/view-helpers.test.ts`
- `test/unit/server/routes/play.test.ts`
- `test/unit/server/views/play.test.ts`
- `test/unit/server/views/briefing.test.ts`
- `test/unit/client/fixtures/html-fixtures.ts`
- Relevant client tests under `test/unit/client/play-page/`

## Detailed Changes

### `view-helpers.ts` - `ActDisplayInfo` expansion

Add to `ActDisplayInfo`:

```typescript
actQuestion: string;
exitCondition: string;
exitReversal: string;
promiseTargets: string[];
obligationTargets: string[];
```

`getActDisplayInfo()` should extract these from the already-available act and milestone data. This remains the correct seam for play-page structure display because it keeps templates and client code decoupled from raw story traversal.

### Play page (`play.ejs`)

In the expandable act structure details section, add:
- `Act Question` from `actQuestion`
- `Milestone Exit Condition` from `exitCondition`
- `Exit Reversal` from `exitReversal` when non-empty

These should be shown in the existing expandable structure section, styled consistently with current fields.

### Briefing page (`briefing.ejs`)

In the mission overview section, add `Key Turning Points` sourced from `briefing.anchorMoments`:
- Inciting Incident: Act {actIndex} - {description}
- Midpoint: Act {actIndex}, Milestone {milestoneSlot} - {midpointType}
- Climax: Act {actIndex} - {description}
- Signature Scenario: Act {actIndex} - {description} when present

The route should pass `story.structure.anchorMoments` through the existing briefing payload rather than inventing a new data source.

### Analyst insights modal (`05c-analyst-insights.js`)

Use structured data from `#insights-context`:
- Keep the current subtitle display
- Show `actQuestion` as `Act's Dramatic Question` in the structure tab
- Show `exitCondition` as `Milestone Exit Criteria` near completion-gate assessment

### Act indicator and client refresh

- The visible act-indicator should remain a compact locator using `displayString`.
- The expandable structure-details panel should render `actQuestion`, `exitCondition`, and `exitReversal` on first page load and after choice responses.
- `09-controllers.js` is responsible for keeping this markup synchronized after client-side navigation.

## Architecture Notes

- The beneficial change here is to move the analyst modal from a string-only `insights-context` payload to a structured payload. That is cleaner and more extensible than adding more parallel strings or DOM attributes.
- The original idea of turning the act indicator itself into a denser subtitle-heavy component is not more beneficial than the current architecture. The cleaner design is to keep the indicator compact and place richer structure context in the existing expandable details panel and insights modal.
- This ticket should not introduce aliases, duplicate data mappers, or a second view model for the same structure data. `ActDisplayInfo` should remain the single play-page structure display contract.

## Out of Scope

- New API endpoints
- Styling overhauls - use existing CSS patterns
- Mobile-specific responsive changes
- Downstream prompt changes (STOARCGEN-014)
- Model, parser, persistence, or generation-pipeline changes for these fields
- Any backward-compatibility aliasing or duplicate `beat` terminology

## Acceptance Criteria

### Tests that must pass
- Updated test: `test/unit/server/utils/view-helpers.test.ts` - `getActDisplayInfo()` returns the new fields
- Updated test: `test/unit/server/routes/play.test.ts` - briefing payload includes `anchorMoments`; play route and choice response include expanded `actDisplayInfo`
- Updated tests: `test/unit/server/views/play.test.ts` and `test/unit/server/views/briefing.test.ts` - templates render the new sections/contracts
- Updated client fixture/tests under `test/unit/client/play-page/` - act indicator refresh and analyst insights rendering handle the richer payload
- `npm run test:client` passes
- Relevant server unit tests pass
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Old stories without these fields render correctly; empty strings and arrays produce no visible artifacts
- Existing play page layout is not broken
- Existing briefing page layout is not broken
- Analyst insights modal continues to function
- Act indicator continues to show act and milestone position
- Client-side choice navigation keeps act-indicator details and insights context synchronized with the latest response payload
- `app.js` is regenerated after client JS edits
- No visual regressions in existing UI elements

## Outcome

- Completion date: 2026-03-14
- What changed:
  - Expanded `ActDisplayInfo` and `getActDisplayInfo()` to expose `actQuestion`, `exitCondition`, `exitReversal`, `promiseTargets`, and `obligationTargets`
  - Updated the play route/template to pass structured insights context and render the new structure detail fields
  - Updated the briefing route/template to expose and display `anchorMoments`
  - Updated client-side choice refresh and analyst insights rendering to consume the richer structure payload
  - Regenerated `public/js/app.js`
- Deviations from original plan:
  - Kept the act indicator itself compact and placed the richer structure fields in the existing expandable details panel and insights modal instead of turning the indicator into a denser subtitle-heavy widget
  - Included route and controller changes because the current architecture requires those seams for clean data flow
- Verification:
  - `npm run concat:js`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/utils/view-helpers.test.ts test/unit/server/routes/play.test.ts test/unit/server/views/play.test.ts test/unit/server/views/briefing.test.ts`
  - `npm run test:client`
  - `npm run test:unit -- --coverage=false --runTestsByPath test/unit/server/routes/play.test.ts`
  - `npm run typecheck`
  - `npm run lint`
