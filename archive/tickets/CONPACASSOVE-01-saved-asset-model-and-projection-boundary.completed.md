# CONPACASSOVE-01: Establish saved asset model and downstream projection boundary

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — content packet domain models, saved asset validation, projection helpers
**Deps**: `specs/content-packet-asset-overhaul.md`

## Problem

The current model layer treats a saved content packet as a thin wrapper around the canonical packet body. That prevents the system from persisting premise context and rich origin artifacts, and it leaves downstream code without a clean boundary between the saved asset and the lean concept-seeding packet.

## Assumption Reassessment (2026-03-19)

1. `src/models/content-packet.ts` currently defines `ContentPacket`, `ContentPacketerPacket`, and `ContentPacketProvenance`, and the saved asset layer still imports those types directly.
2. `src/models/saved-content-packet.ts` currently validates only `packet`, optional `provenance`, and optional `evaluation`; there is no `assetVersion`, `context`, or `origin.sourceArtifacts`.
3. Several tests and compile-time fixture helpers outside `test/unit/models/` construct `SavedContentPacket` directly (`test/unit/persistence/content-packet-repository.test.ts`, `test/unit/server/routes/content-packets-routes.test.ts`, `test/unit/server/presenters/content-packet-card.test.ts`, and `test/unit/group-content-packets-by-kind.test.ts`). Their fixture shapes are part of the implementation fallout for this ticket even though route and presenter behavior is not.
4. The spec allows deferring a disruptive type rename. This ticket should introduce the projection boundary and helpers first, while keeping the current `ContentPacket` name if a full `ConceptSeedPacket` rename would spill across too many consumers.
5. The missing save-path data is already owned by later tickets: `CONPACASSOVE-02` supplies save-ready generation outputs, and `CONPACASSOVE-03` updates the browser payload, route contract, and artifact builder to persist them. This ticket should not overlap that work.

## Architecture Check

1. Putting the saved-asset contract and projection helpers in the model layer makes the new boundary enforceable everywhere else, instead of letting routes and services invent partial shapes ad hoc.
2. No backwards-compatibility aliasing or dual-shape guards should be introduced here. Legacy packet-only saved shapes must stay invalid.
3. Deferring the `ContentPacket` rename is acceptable for this pass, but the boundary must still be explicit in code through projection helpers and naming comments so the saved asset never again masquerades as the downstream prompt payload.
4. The current architecture is improved by landing the model boundary first. It gives later tickets a single canonical contract to target, rather than letting generation and save-flow tickets invent competing shapes.

## What to Change

### 1. Add first-class saved asset structures

Update `src/models/saved-content-packet.ts` to define and validate:

- `assetVersion: 2`
- `context`
- `origin`
- `origin.sourceArtifacts`
- `evaluation` as sibling metadata on the saved asset

Add narrow validators for `ContentPacketContext`, `ContentPacketOrigin`, and `ContentPacketSourceArtifact`.

### 2. Preserve a lean downstream packet projection boundary

Update `src/models/content-packet.ts` so the code clearly distinguishes:

- the lean downstream packet contract used by concept-stage prompts
- richer generation-time packet shapes that include context or lineage needed before save

If the full rename to `ConceptSeedPacket` is deferred, add projection-oriented helpers and comments so later tickets consume a deliberate projection rather than treating the saved asset as the packet itself.

### 3. Add projection helpers and model coverage

Add a small helper surface that lets later tickets project a `SavedContentPacket` into the downstream packet contract without duplicating mapping logic in routes, presenters, or evaluators.

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `test/unit/models/content-packet.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (new)
- `test/unit/persistence/content-packet-repository.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/group-content-packets-by-kind.test.ts` (modify as needed for fixture shape)

## Out of Scope

- Changing prompt schemas or prompt text
- Rewriting the save route, browser save payload, or artifact builder
- Presenter or EJS rendering changes
- Deleting legacy `content-packets/*.json` files

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/models/content-packet.test.ts` proves the lean downstream packet guard still accepts valid canonical packets and rejects packets missing required canonical fields.
2. `test/unit/models/saved-content-packet.test.ts` proves v2 saved assets require `assetVersion`, `context`, and `origin.sourceArtifacts`, and reject the previous packet-plus-provenance shape.
3. `test/unit/persistence/content-packet-repository.test.ts` and direct `SavedContentPacket` fixture tests pass with the new canonical saved shape.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/persistence/content-packet-repository.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/group-content-packets-by-kind.test.ts`

### Invariants

1. Downstream concept stages still consume the lean packet projection only; the saved asset does not become the prompt payload shape.
2. Saved content packets have one canonical persisted shape: v2 assets with explicit context and explicit origin artifacts.

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-packet.test.ts` — update canonical packet expectations and any new projection helper behavior.
2. `test/unit/models/saved-content-packet.test.ts` — add positive and negative coverage for v2 saved asset guards.
3. `test/unit/persistence/content-packet-repository.test.ts` — update fixtures to the canonical saved shape and retain invalid-payload coverage.
4. `test/unit/server/presenters/content-packet-card.test.ts` and `test/unit/group-content-packets-by-kind.test.ts` — update saved-packet fixtures so compile-time consumers use the real asset contract.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/persistence/content-packet-repository.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/group-content-packets-by-kind.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-19
- What changed:
  - Introduced the canonical v2 `SavedContentPacket` shape with `assetVersion`, `context`, `origin`, and `origin.sourceArtifacts`.
  - Added narrow validators for saved-asset substructures plus projection helpers that clone the lean downstream `ContentPacket`.
  - Updated model/repository/presenter/grouping tests and fixture helpers to use the canonical saved asset shape.
- Deviations from the original plan:
  - The ticket was corrected to stay model-layer focused. Browser save payload, route validation, and full asset assembly remain owned by `CONPACASSOVE-02` and `CONPACASSOVE-03`.
  - `src/server/services/content-packet-artifact.ts` was tightened to fail explicitly rather than fabricate a now-invalid saved asset shape before those later tickets land.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/persistence/content-packet-repository.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/group-content-packets-by-kind.test.ts`
  - `npm run typecheck`
  - `npm run lint`
