# CHAUIOVE-011: Canonicalize relationship visual semantics across server and client

**Status**: COMPLETED
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
3. The current test coverage in `test/unit/server/views/chat.test.ts` and `test/unit/client/chat-page/controller.test.ts` already asserts concrete semantic wording and aria-label output on both sides. Confirmed. The gap is ownership: the same wording is still authored twice, so drift is still possible even with current coverage.
4. Corrected architectural assumption: this repo does not currently have a direct shared-module path between server TypeScript and the concatenated browser JS in `public/js/src/*.js`. A literal "single formatter module imported by both runtimes" is not aligned with the current build.
5. Corrected scope: some route/model contract work is justified if it removes duplicated client semantic ownership cleanly. The remaining problem is presentation-semantic duplication, but the cleanest seam is likely server/domain-owned presentation data that both SSR and client updates consume.

## Architecture Check

1. One shared relationship-visual semantics seam is cleaner than duplicated template/controller helpers because it gives the UI a single source of truth for:
   - metric band labels
   - trend wording
   - summary strings
   - accessibility label text
2. In this codebase, the preferred design is a narrow deterministic server/domain seam for chat relationship presentation, not a cross-runtime alias/shim and not a broad charting abstraction. This should stay specific to chat relationship visuals.
3. Preferred ownership model:
   - `src/models/chat/...` or an adjacent chat-domain module owns relationship presentation derivation
   - SSR consumes the derived presentation model directly
   - client rerenders consume server-provided presentation data instead of re-deriving semantic wording locally
4. No backwards-compatibility aliasing or dual-ownership helper path should be introduced. Replace duplicated semantic wording ownership with one canonical derivation seam and update both SSR and client code to consume it.
5. The new seam should preserve the existing relationship timeline/current-state ownership. Gauge and sparkline drawing may stay client-owned, but semantic wording/aria text should not be hand-authored separately per runtime.

## What to Change

### 1. Extract relationship-visual semantics into one canonical chat presentation seam

Create a small deterministic chat-domain module that owns:

- valence and tension semantic band mapping
- trend wording from numeric deltas
- metric summary strings
- gauge/sparkline accessibility text

Requirements:

- deterministic pure functions only
- no DOM ownership
- no persistence/model ownership
- no generic visualization framework code

### 2. Move semantic wording ownership to server-provided presentation data

Replace inline semantic helper duplication in:

- `src/server/views/pages/chat.ejs`
- `public/js/src/20b-chat-sidebar.js`

Requirements:

- SSR should render from the canonical presentation model
- client-side updates should consume canonical presentation data returned by the server rather than recomputing wording locally
- server-rendered initial state and client-side updates produce identical semantic strings
- no semantic wording remains hand-authored separately in template and client code
- `public/js/app.js` is regenerated after the client source change

### 3. Tighten tests around shared semantic ownership

Add direct unit coverage for the canonical presentation seam and keep view/controller tests focused on integration behavior.

Requirements:

- presentation-seam tests prove band, trend, summary, and aria wording behavior
- route/view/client tests still verify correct wiring and rendering
- tests should fail if client wording ownership is reintroduced

## Files to Touch

- `tickets/CHAUIOVE-011-relationship-visual-semantics-seam.md` (new)
- `src/models/chat/...` canonical relationship presentation module path to be chosen based on chat-domain ownership boundaries (new)
- `src/server/routes/chat.ts` or adjacent chat server seam if response/bootstrap payloads need the new presentation model (modify)
- `src/server/views/pages/chat.ejs` (modify)
- `public/js/src/20b-chat-sidebar.js` (modify)
- `public/js/app.js` (regenerated)
- `src/server/services/chat-service.ts` or adjacent response typing seam if turn responses need the new presentation payload (modify, if needed)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/server/routes/chat.test.ts` and/or `test/unit/server/services/chat-service.test.ts` if route/response payloads gain presentation data (modify as needed)
- `test/unit/client/chat-page/controller.test.ts` (modify)
- `test/unit/...` presentation-seam test file path aligned to the chosen module location (new)

## Out of Scope

- Changing relationship timeline persistence or route/bootstrap contracts
- Redesigning the overall chat response payload beyond what is needed to centralize relationship presentation semantics
- Redesigning the relationship cards again
- Introducing a reusable charting library or generic visual language framework
- Broad chat-sidebar refactors unrelated to relationship semantics

## Acceptance Criteria

### Tests That Must Pass

1. Relationship visual semantics are owned by one canonical deterministic chat presentation seam rather than duplicated template/controller helper logic.
2. Server-rendered and client-rendered relationship cards produce the same semantic summaries, trend wording, and accessibility labels from one canonical derivation path.
3. Existing suite: `npm test`

### Invariants

1. Canonical relationship data ownership remains in the existing timeline/current-state contracts; this ticket only changes presentation-semantic ownership.
2. No backwards-compatibility aliases or duplicate helper paths are introduced for relationship visual semantics.
3. The canonical seam remains narrow and deterministic rather than growing into a generic chart abstraction.
4. The browser may still own DOM drawing concerns, but not the semantic wording rules for relationship visuals.

## Test Plan

### New/Modified Tests

1. `test/unit/...` canonical relationship presentation test file — verifies semantic band mapping, trend wording, metric summaries, and accessibility-label generation in one canonical place.
2. `test/unit/server/views/chat.test.ts` — verifies the chat template consumes the shared seam correctly for SSR output.
3. `test/unit/client/chat-page/controller.test.ts` — verifies client updates consume canonical server-provided presentation data during post-turn rerenders.
4. `test/unit/server/routes/chat.test.ts` and/or `test/unit/server/services/chat-service.test.ts` — verifies bootstrap/turn payloads expose the canonical relationship presentation data if new route/service wiring is introduced.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand <presentation-test> test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts test/unit/server/routes/chat.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`
5. `npm test`

## Outcome

- Completed on 2026-03-28.
- Implemented a canonical chat-domain relationship presentation seam in `src/models/chat/chat-relationship-presentation.ts`.
- Wired `src/server/routes/chat.ts` and `src/server/services/chat-service.ts` to expose canonical relationship presentation data in both SSR bootstrap payloads and post-turn JSON responses.
- Removed duplicated relationship wording ownership from `src/server/views/pages/chat.ejs` and `public/js/src/20b-chat-sidebar.js`; the browser still owns gauge/sparkline drawing, but not semantic wording or aria text.
- Regenerated `public/js/app.js`.
- Added direct unit coverage for the presentation seam and strengthened route/service/view/client tests around the new server-owned presentation payload.
- Deviation from the original plan: instead of a literal shared formatter imported by both server and browser runtimes, the final implementation uses one server/domain-owned presentation seam because the repo’s current TypeScript-plus-concatenated-browser-JS architecture does not support a clean cross-runtime shared module without introducing a worse abstraction or duplicate ownership.
- Verification: `npm run test:unit -- --coverage=false --runInBand test/unit/models/chat/chat-relationship-presentation.test.ts test/unit/server/services/chat-service.test.ts test/unit/server/routes/chat.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm test`.
