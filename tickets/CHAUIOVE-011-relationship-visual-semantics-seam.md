# CHAUIOVE-011: Canonicalize relationship visual semantics across server and client

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: [archive/tickets/CHAUIOVE-010-relationship-graphics-upgrade.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CHAUIOVE-010-relationship-graphics-upgrade.completed.md)

## Problem

The relationship graphics now present clear semantic summaries and trend cues, but that semantic mapping currently lives in two places:

- `src/server/views/pages/chat.ejs` derives band labels, trend words, summaries, and aria text for SSR
- `public/js/src/20b-chat-sidebar.js` derives the same semantics again for client-side updates

That duplication is still manageable, but it is not the cleanest long-term architecture. If the bands, trend wording, or aria phrasing change later, the server-rendered and client-rendered relationship cards can drift. The UI should have one deterministic semantic mapping seam for relationship visuals.

## Assumption Reassessment (2026-03-28)

1. `src/server/views/pages/chat.ejs` currently defines `relationshipMetricBand`, `relationshipMetricTrend`, `buildRelationshipMetricSummary`, and related aria-label helpers inline in the template. Confirmed.
2. `public/js/src/20b-chat-sidebar.js` currently defines the parallel client helpers `getMetricBand`, `getMetricTrend`, `buildMetricSummary`, and related aria-label builders. Confirmed.
3. The current test coverage in `test/unit/server/views/chat.test.ts` and `test/unit/client/chat-page/controller.test.ts` validates the visible semantics on both sides, but it does not guarantee the two helper implementations stay behaviorally identical. Corrected scope: this ticket should remove the duplicated ownership rather than only adding more assertion duplication.
4. No route/model contract work is needed. The canonical relationship timeline and current-state ownership are already correct; the remaining problem is presentation-semantic duplication.

## Architecture Check

1. One shared relationship-visual semantics seam is cleaner than duplicated template/controller helpers because it gives the UI a single source of truth for:
   - metric band labels
   - trend wording
   - summary strings
   - accessibility label text
2. The preferred design is a narrow deterministic formatter module, not a broad charting abstraction. This should stay specific to chat relationship visuals.
3. No backwards-compatibility aliasing or shim layer should be introduced. Replace duplicated helper ownership with a single semantic formatter seam and update both SSR and client code to consume it.
4. The shared seam should preserve SSR correctness and client update behavior without moving chart state ownership out of the existing canonical timeline/current-state flow.

## What to Change

### 1. Extract relationship-visual semantics into a shared formatter seam

Create a small shared module that owns:

- valence and tension semantic band mapping
- trend wording from numeric deltas
- metric summary strings
- gauge/sparkline accessibility text

Requirements:

- deterministic pure functions only
- no DOM ownership
- no persistence/model ownership
- no generic visualization framework code

### 2. Update SSR and client rendering to consume the shared seam

Replace inline semantic helper duplication in:

- `src/server/views/pages/chat.ejs`
- `public/js/src/20b-chat-sidebar.js`

Requirements:

- server-rendered initial state and client-side updates produce identical semantic strings
- no semantic wording remains hand-authored separately in template and client code
- `public/js/app.js` is regenerated after the client source change

### 3. Tighten tests around shared semantic ownership

Add direct unit coverage for the shared formatter seam and keep view/controller tests focused on integration behavior.

Requirements:

- formatter tests prove band, trend, summary, and aria wording behavior
- server/client tests still verify correct wiring and rendering
- tests should fail if a second semantic ownership path is reintroduced

## Files to Touch

- `tickets/CHAUIOVE-011-relationship-visual-semantics-seam.md` (new)
- `src/server/views/pages/chat.ejs` (modify)
- `public/js/src/20b-chat-sidebar.js` (modify)
- `public/js/app.js` (regenerated)
- `src/server/...` or `src/models/...` shared formatter module path to be chosen based on current ownership boundaries (new)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (modify)
- `test/unit/...` formatter test file path aligned to the chosen module location (new)

## Out of Scope

- Changing relationship timeline persistence or route/bootstrap contracts
- Redesigning the relationship cards again
- Introducing a reusable charting library or generic visual language framework
- Broad chat-sidebar refactors unrelated to relationship semantics

## Acceptance Criteria

### Tests That Must Pass

1. Relationship visual semantics are owned by one shared deterministic formatter seam rather than duplicated template/controller helper logic.
2. Server-rendered and client-rendered relationship cards produce the same semantic summaries, trend wording, and accessibility labels from the same input values.
3. Existing suite: `npm test`

### Invariants

1. Canonical relationship data ownership remains in the existing timeline/current-state contracts; this ticket only changes presentation-semantic ownership.
2. No backwards-compatibility aliases or duplicate helper paths are introduced for relationship visual semantics.
3. The shared seam remains narrow and deterministic rather than growing into a generic chart abstraction.

## Test Plan

### New/Modified Tests

1. `test/unit/...` shared formatter test file — verifies semantic band mapping, trend wording, metric summaries, and accessibility-label generation in one canonical place.
2. `test/unit/server/views/chat.test.ts` — verifies the chat template consumes the shared seam correctly for SSR output.
3. `test/unit/client/chat-page/controller.test.ts` — verifies client updates consume the shared seam correctly during post-turn rerenders.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand <shared-formatter-test> test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`
