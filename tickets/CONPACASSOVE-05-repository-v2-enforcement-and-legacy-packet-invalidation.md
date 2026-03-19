# CONPACASSOVE-05: Enforce v2 repository reads and invalidate legacy saved packet files

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: Yes — repository validation behavior and on-disk packet cleanup
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md`

## Problem

Even after the new model exists, the system will still be wrong if repository list/load paths tolerate old packet-only JSON files. The spec requires old saved packet files to be treated as invalid and removed rather than grandfathered into the new architecture.

## Assumption Reassessment (2026-03-19)

1. The repository already delegates shape validation to `isSavedContentPacket`, so once the v2 guard is tightened, invalid files will fail load/list operations.
2. The workspace currently contains many existing files under `content-packets/` that predate the new contract and therefore need explicit cleanup in the implementation pass.
3. Current repository tests only cover generic invalid-shape failure, not the specific policy that legacy saved packet files lacking v2 fields must be rejected with no fallback parsing.

## Architecture Check

1. Hard rejection in the repository is the cleanest enforcement point because every list/load route flows through it.
2. No migration aliases, compatibility readers, or auto-upgrade code should be introduced. The system should only recognize v2 saved assets.

## What to Change

### 1. Tighten repository expectations around v2 assets

Update repository tests and any needed repository plumbing so `loadContentPacket()` and `listContentPackets()` fail fast when a file does not satisfy the v2 saved asset guard.

### 2. Remove incompatible on-disk fixtures/assets

Delete the existing `content-packets/*.json` files that do not satisfy the new asset contract. If any file can truly be rebuilt losslessly from persisted source artifacts, that should be handled deliberately, not silently at load time.

### 3. Cover route-level fallout

Update route tests as needed so list and load paths reflect the hard-invalid policy rather than assuming the old files can still be shown.

## Files to Touch

- `src/persistence/content-packet-repository.ts` (modify)
- `test/unit/persistence/content-packet-repository.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `content-packets/*.json` (delete incompatible files)

## Out of Scope

- Generating replacement content packets
- Prompt/schema changes
- Presenter layout work
- Any compatibility loader or migration script for old asset versions

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/persistence/content-packet-repository.test.ts` proves legacy packet-only files are rejected as invalid saved assets on load and on list.
2. `test/unit/server/routes/content-packets-routes.test.ts` proves list-facing route behavior does not silently surface legacy files after repository hardening.
3. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/persistence/content-packet-repository.test.ts test/unit/server/routes/content-packets-routes.test.ts`

### Invariants

1. The repository recognizes exactly one canonical on-disk saved packet shape: v2 assets with `assetVersion`, `context`, and `origin.sourceArtifacts`.
2. The application never attempts to auto-upgrade, partially parse, or heuristically salvage legacy packet files during normal load/list operations.

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/content-packet-repository.test.ts` — add explicit rejection coverage for legacy packet-only files in both load and list paths.
2. `test/unit/server/routes/content-packets-routes.test.ts` — assert route behavior reflects repository rejection rather than compatibility loading.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/persistence/content-packet-repository.test.ts test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run typecheck`

