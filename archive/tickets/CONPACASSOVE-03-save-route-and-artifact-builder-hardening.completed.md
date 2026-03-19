# CONPACASSOVE-03: Harden save payload validation and explicit asset assembly

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — browser save payload, save route validation, saved asset builder
**Deps**: `specs/content-packet-asset-overhaul.md`, `archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md`, `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md`

## Problem

The current save flow is not yet wired to persist the explicit generated asset candidate. The browser still posts the generated object under a misleading packet-centric field name, and the server builder hard-fails after validating only the narrow canonical packet contract. That leaves the save path incomplete and obscures the intended ownership boundary between generation and persistence.

## Assumption Reassessment (2026-03-19)

1. `src/server/services/content-service.ts` already assembles a canonical `GeneratedContentPacket` with explicit `packet`, `context`, and `origin`. That service boundary is the right ownership line for lineage/context assembly.
2. `public/js/src/11-content-packets.js` currently posts that generated object under `body.packet`, but the save request is still named and validated as if it were posting only a canonical `ContentPacket`.
3. `src/server/routes/content-packets.ts` currently accepts any object under `body.packet` and delegates validation to `createSavedContentPacketArtifact`, but it does not yet enforce that the object is a full generated save candidate.
4. `src/server/services/content-packet-artifact.ts` currently hard-fails after only checking the narrow `ContentPacket` validator. That is the real implementation gap: the builder should validate the already-assembled generated contract and persist it as a v2 saved asset without reconstruction.
5. Quick generation currently materializes exemplar lineage at the service boundary by attaching all exemplar ideas referenced by `sourceExemplarIds`. That may be broader than ideal per-packet selectivity, but it is still explicit generation output and must be persisted as-is here.
6. Any future refinement toward narrower quick-mode lineage ownership belongs in generation/service tickets, not in this save-path ticket.

## Architecture Check

1. Explicit asset assembly in one builder keeps validation, projection, context mapping, and origin mapping in one place instead of scattering save semantics across the browser, route, and repository.
2. Generation/service code owns assembly of save-ready lineage and context. Save-time code must stay a strict validator/projector, not a second inference layer.
3. No fallback reconstruction of missing context or origin data is allowed. The route must reject incomplete payloads rather than guessing.
4. This ticket must consume the richer generation outputs already introduced by the current generation service. It should not invent placeholder context or lineage just to satisfy `SavedContentPacket`.
5. Save-time code must not guess which exemplars "really" belong to a quick packet. It either persists the explicit generated lineage it received or rejects the payload.

## What to Change

### 1. Send a complete save candidate from the browser

Update the generated-card save path so the client posts the full generated object needed for persistence as an explicit save candidate, including:

- context fields
- `origin.sourceArtifacts` returned by `/api/generate`
- optional evaluation data when available

### 2. Tighten `/api/:packetId/save`

Update the route contract so it validates a full generated save candidate and returns a 400 for:

- packet-only legacy payloads
- context-missing payloads
- origin-missing payloads
- empty-origin payloads
- any request that would require heuristic reconstruction

### 3. Replace the artifact builder

Rewrite `createSavedContentPacketArtifact()` as an explicit builder that:

1. validates the generated save-candidate contract
2. builds the canonical downstream `packet` projection
3. builds `context`
4. builds `origin.sourceArtifacts`
5. attaches `evaluation`
6. stamps `assetVersion: 2`

The builder must remain deliberately boring: clone/validate the generated contract, attach persistence metadata, and stop. If later tickets introduce explicit per-packet exemplar refinement, this builder should consume that richer contract without adding heuristics here.

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
3. `test/unit/client/content-packets-page/controller.test.ts` — generated-card save request payload coverage, including save-candidate shape and attached evaluation when present.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/services/content-packet-artifact.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/client/content-packets-page/controller.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- **Completion Date**: 2026-03-19
- **What Changed**: The save route now accepts an explicit generated save candidate, the artifact builder validates and clones that candidate into a canonical v2 saved asset, and the browser save action now posts the full candidate plus attached evaluation when present.
- **Deviation From Original Plan**: The implementation deliberately renamed the save payload field from `packet` to `candidate` to match the real contract and avoid preserving a misleading packet-centric alias.
- **Verification**: `npm run test:unit -- --runTestsByPath test/unit/server/services/content-packet-artifact.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/client/content-packets-page/controller.test.ts`, `npm run typecheck`, and `npm run lint` all passed.
