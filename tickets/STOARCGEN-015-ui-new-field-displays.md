# STOARCGEN-015: UI New Field Displays

**Status**: TODO
**Depends on**: STOARCGEN-008 (new fields), STOARCGEN-006 (UI rename complete)
**Blocks**: None

## Summary

Display the new high-signal fields in the play page, briefing page, and analyst insights modal. These are additive UI changes — no existing elements are removed or restructured.

## Files to Touch

### Server-side
- `src/server/utils/view-helpers.ts` — Expand `ActDisplayInfo` with new fields; update `getActDisplayInfo()` to extract them
- `src/server/views/pages/play.ejs` — Display `actQuestion`, `exitCondition`, `exitReversal` in act structure details
- `src/server/views/pages/briefing.ejs` — Display `anchorMoments` summary

### Client-side JS
- `public/js/src/04c-act-indicator.js` — Display `actQuestion` and `exitCondition` in act/milestone indicator
- `public/js/src/05c-analyst-insights.js` — Display `actQuestion` in structural context, `exitCondition` in completion assessment
- Run `node scripts/concat-client-js.js` to regenerate `app.js`

## Detailed Changes

### `view-helpers.ts` — `ActDisplayInfo` expansion

Add to `ActDisplayInfo`:
```typescript
actQuestion: string;          // from current act
exitCondition: string;        // from current milestone
exitReversal: string;         // from current act (shown on act transitions)
promiseTargets: string[];     // from current act
obligationTargets: string[];  // from current act
```

`getActDisplayInfo()` should extract these from the act and milestone data passed to it.

### Play page (`play.ejs`)

In the expandable act structure details section, add:
- **Act Question**: Display `actQuestion` — the dramatic question this act answers
- **Milestone Exit Condition**: Display `exitCondition` — concrete condition for milestone conclusion
- **Exit Reversal**: Display `exitReversal` on concluded act transitions (what reversal ended the previous act)

These should be shown in the existing expandable structure section, styled consistently with existing fields (Act Objective, Act Stakes, Milestone Objective).

### Briefing page (`briefing.ejs`)

In the story briefing section (after Theme, Premise, Pacing Budget), add:
- **Key Turning Points** (from `anchorMoments`):
  - Inciting Incident: Act {actIndex} — {description}
  - Midpoint: Act {actIndex}, Milestone {milestoneSlot} — {midpointType}
  - Climax: Act {actIndex} — {description}
  - Signature Scenario: Act {actIndex} — {description} (if present)

### Analyst insights modal (`05c-analyst-insights.js`)

In the structural context section:
- Show `actQuestion` as "Act's Dramatic Question"
- Show `exitCondition` in the completion assessment area as "Milestone Exit Criteria"

### Act indicator (`04c-act-indicator.js`)

- Display `actQuestion` as a subtitle under the act name
- Display `exitCondition` as a subtitle under the milestone name

## Out of Scope

- Backend route handler changes (view helpers handle data extraction)
- New API endpoints
- Styling overhauls — use existing CSS patterns
- Mobile-specific responsive changes
- Downstream prompt changes (STOARCGEN-014)

## Acceptance Criteria

### Tests that must pass
- Updated test: `test/unit/server/utils/view-helpers.test.ts` — `getActDisplayInfo()` returns new fields
- `npm run test:client` passes (client tests against generated `app.js`)
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants that must remain true
- Old stories (without new fields) render correctly — empty strings/arrays produce no visible artifacts
- Existing play page layout is not broken
- Existing briefing page layout is not broken
- Analyst insights modal continues to function
- Act indicator continues to show act/milestone position
- `app.js` is regenerated after all client JS edits
- No visual regressions in existing UI elements
