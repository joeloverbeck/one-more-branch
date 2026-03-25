# CONPACPIPIMP-010: Update UI presenter and client JS for all pipeline changes

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CONPACPIPIMP-006 (playerPosition), CONPACPIPIMP-008 (new score dimensions + redundancyCluster), CONPACPIPIMP-001 (new TasteProfile fields)

## Problem

The UI presenter and client-side JavaScript must reflect all model changes: the viewpointPressure→playerPosition rename in the context field registry, the score dimension changes in the evaluation registry, the new `redundancyCluster` display, and the 3 new taste profile fields in the client-side rendering.

## Assumption Reassessment (2026-03-25)

1. `CONTENT_PACKET_CONTEXT_FIELD_REGISTRY` has `{ key: 'viewpointPressure', label: 'Viewpoint Pressure' }` — confirmed.
2. `EVALUATION_SCORE_FIELD_REGISTRY` has 8 entries matching old dimensions — confirmed.
3. `ContentPacketEvaluationDetails` interface has `scores`, `strengths`, `weaknesses`, `recommendedRole` — confirmed; needs `redundancyCluster`.
4. `TASTE_PROFILE_FIELDS` in client JS has 9 entries — confirmed; needs 3 more.
5. `renderEvaluationSection` in client JS renders score bars — confirmed; needs redundancyCluster rendering.
6. `public/js/app.js` is generated via `node scripts/concat-client-js.js` — confirmed; must be regenerated.
7. EJS template is data-driven — confirmed; no template changes needed.

## Architecture Check

1. Presenter changes are registry-based — just updating arrays of `{ key, label }` objects.
2. Client JS changes are additive — new fields in existing arrays + one new conditional render.
3. No structural changes to the rendering pipeline.

## What to Change

### 1. Server-side presenter (`content-packet-card.ts`)

**Context field registry:**
Replace `{ key: 'viewpointPressure', label: 'Viewpoint Pressure' }` with `{ key: 'playerPosition', label: 'Player Position' }`.

**Evaluation score field registry:**
Remove:
- `{ key: 'antiGenericity', label: 'Anti-Genericity' }`
- `{ key: 'conceptUtility', label: 'Concept Utility' }`

Add:
- `{ key: 'surfaceFreshness', label: 'Surface Freshness' }`
- `{ key: 'deepOriginality', label: 'Deep Originality' }`
- `{ key: 'tasteAlignment', label: 'Taste Alignment' }`
- `{ key: 'causalSpecificity', label: 'Causal Specificity' }`

**`ContentPacketEvaluationDetails` interface:**
Add `readonly redundancyCluster: string | null`.

**`buildEvaluationDetails` function:**
Extract `redundancyCluster` from the evaluation and include it in the returned `ContentPacketEvaluationDetails`.

### 2. Client-side JS (`public/js/src/11-content-packets.js`)

**`TASTE_PROFILE_FIELDS` array:**
Add 3 entries:
```javascript
{ key: 'engagementModes', label: 'Engagement Modes' },
{ key: 'valueTensions', label: 'Value Tensions' },
{ key: 'deepPatterns', label: 'Deep Patterns' },
```

**`renderEvaluationSection` function:**
Add conditional rendering for `redundancyCluster` — if present and non-null, show as a note below the score bars (e.g., "Overlaps with: pkt-05").

### 3. Regenerate `public/js/app.js`

Run `node scripts/concat-client-js.js` to regenerate the bundled client JS.

## Files to Touch

- `src/server/presenters/content-packet-card.ts` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `public/js/app.js` (regenerated)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)

## Out of Scope

- Model/interface changes to `ContentEvaluationScores`, `ContentPacketContext`, `TasteProfile` (earlier tickets)
- Schema changes (earlier tickets)
- Prompt changes (earlier tickets)
- EJS template changes (data-driven, not needed)
- Server route changes
- Any pipeline logic changes

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `buildSavedContentPacketCardViewModel` produces context details with `playerPosition` label (not `viewpointPressure`)
2. Unit test: `buildSavedContentPacketCardViewModel` produces evaluation scores with the 10 new dimension labels
3. Unit test: `buildSavedContentPacketCardViewModel` includes `redundancyCluster` in evaluation details when present
4. Unit test: `buildSavedContentPacketCardViewModel` includes `redundancyCluster: null` when evaluation has no overlap
5. Unit test: Client JS `TASTE_PROFILE_FIELDS` contains all 12 entries (9 existing + 3 new) — verify via client test if applicable
6. Existing suite: `npm test` — all tests pass
7. `public/js/app.js` is regenerated and matches source files

### Invariants

1. All unchanged context and packet field registry entries remain present
2. Score bar rendering logic is unchanged — only the registry data changes
3. EJS template requires no modifications (data-driven)
4. Client test suite (`npm run test:client`) passes against regenerated `app.js`

## Test Plan

### New/Modified Tests

1. `test/unit/server/presenters/content-packet-card.test.ts` — update mock evaluations with new score dimensions; add redundancyCluster assertions; update context detail assertions for playerPosition

### Commands

1. `node scripts/concat-client-js.js`
2. `npm run test:unit -- --testPathPattern="content-packet-card"`
3. `npm run test:client` (if applicable)
4. `npm run typecheck && npm run lint && npm test`
