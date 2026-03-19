# CONPACASSOVE-03: Harden save payload validation and explicit asset assembly

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — browser save payload, save route validation, saved asset builder
**Deps**: `specs/content-packet-asset-overhaul.md`, `archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md`, `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md`

## Problem

The current save flow silently narrows generated packets into a thin saved shape. The browser posts only the packet-plus-optional-evaluation body, and the server builder reconstructs provenance from `sourceSparkIds` if present. That path guarantees shape loss and allows incomplete assets to be persisted.

## Assumption Reassessment (2026-03-19)

1. `public/js/src/11-content-packets.js` currently saves the generated packet payload that the page already has, but that payload and the server route are still packet-centric rather than asset-candidate-centric.
2. `src/server/routes/content-packets.ts` currently accepts any object under `body.packet` and delegates validation to `createSavedContentPacketArtifact`.
3. `src/server/services/content-packet-artifact.ts` currently hard-fails rather than assembling a v2 asset, which is correct after `CONPACASSOVE-01` and `CONPACASSOVE-02`; this ticket now needs to consume the richer generated payload rather than reconstructing anything from packet-only inputs.
4. `CONPACASSOVE-02` currently materializes quick-mode exemplar lineage at the service boundary by attaching all exemplar ideas to each generated packet. That is acceptable as an interim complete contract, but this ticket must persist that contract exactly as received and must not invent per-packet exemplar subsets heuristically.
5. Any future refinement toward explicit per-packet exemplar selectivity belongs in a generation-contract ticket, not in this save-path ticket.

## Architecture Check

1. Explicit asset assembly in one builder keeps validation, projection, context mapping, and origin mapping in one place instead of scattering save semantics across the browser, route, and repository.
2. No fallback reconstruction of missing context or origin data is allowed. The route must reject incomplete payloads rather than guessing.
3. This ticket must consume the richer generation outputs introduced by `CONPACASSOVE-02`; it should not invent placeholder context or lineage just to satisfy the `SavedContentPacket` type introduced in `CONPACASSOVE-01`.
4. Save-time code must not guess which exemplars "really" belong to a quick packet. It either persists the explicit generated lineage it received or rejects the payload.

## What to Change

### 1. Send a complete save candidate from the browser

Update the generated-card save path so the client posts the full generated object needed for persistence, including:

- context fields
- lineage payload returned by `/api/generate`
- optional evaluation data when available

### 2. Tighten `/api/:packetId/save`

Update the route contract so it validates a full save candidate and returns a 400 for:

- packet-only legacy payloads
- context-missing payloads
- lineage-missing pipeline payloads
- any request that would require heuristic reconstruction

### 3. Replace the artifact builder

Rewrite `createSavedContentPacketArtifact()` as an explicit builder that:

1. validates the generated packet contract
2. builds the canonical downstream `packet` projection
3. builds `context`
4. builds `origin.sourceArtifacts`
5. attaches `evaluation`
6. stamps `assetVersion: 2`

For quick packets, the builder should treat `origin.sourceArtifacts` as already-owned generation output. If later tickets introduce explicit per-packet exemplar selection, this builder should consume that richer contract without adding heuristics here.

## Files to Touch

- `public/js/src/11-content-packets.js` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `src/server/services/content-packet-artifact.ts` (modify)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/services/content-packet-artifact.test.ts` (new)

## Out of Scope

- LLM prompt/schema changes
- Saved card rendering or card section ordering
- Repository list/load rejection of legacy files
- Deleting existing on-disk packet files

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/server/services/content-packet-artifact.test.ts` proves the builder emits `assetVersion: 2`, preserves context, maps source artifacts, and rejects incomplete quick and pipeline inputs.
2. `test/unit/server/routes/content-packets-routes.test.ts` proves `POST /api/:packetId/save` rejects packet-only bodies and persists a full v2 saved asset when given a valid payload.
3. `test/unit/client/content-packets-page/controller.test.ts` proves the browser save request includes the full generated packet object and any evaluation that belongs with it.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/server/services/content-packet-artifact.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/client/content-packets-page/controller.test.ts`

### Invariants

1. The server never persists a saved content packet that is missing required context or required origin artifacts.
2. Save-time logic never infers persisted lineage from IDs alone when richer source text was available upstream.
3. Save-time logic never performs heuristic exemplar subset selection for quick packets; that ownership stays in generation.

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/content-packet-artifact.test.ts` — builder coverage for quick and pipeline asset assembly plus rejection cases.
2. `test/unit/server/routes/content-packets-routes.test.ts` — save-route request validation and persisted response shape.
3. `test/unit/client/content-packets-page/controller.test.ts` — generated-card save request payload coverage.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/services/content-packet-artifact.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/client/content-packets-page/controller.test.ts`
2. `npm run typecheck`
