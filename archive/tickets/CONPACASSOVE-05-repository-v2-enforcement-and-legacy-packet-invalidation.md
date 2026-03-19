# CONPACASSOVE-05: Enforce v2 repository reads and invalidate legacy saved packet files

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: No production architecture change expected; enforcement verification, regression coverage, and on-disk packet cleanup
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md`

## Problem

Even after the new model exists, the system will still be wrong if repository list/load paths tolerate old packet-only JSON files. The spec requires old saved packet files to be treated as invalid and removed rather than grandfathered into the new architecture.

## Assumption Reassessment (2026-03-19)

1. The repository already delegates `save`, `load`, and `list` validation to the shared JSON entity repository with `isSavedContentPacket` as the canonical guard. There is no separate compatibility path to remove in production code unless a test exposes one.
2. The `content-packets/*.json` files currently present in the workspace are legacy-shaped packet payloads using `provenance` and lacking `assetVersion`, `context`, and `origin.sourceArtifacts`. They are local ignored artifacts rather than tracked repository files, so this ticket should remove them from the workspace and enforce the invariant via tests rather than by a git-tracked fixture cleanup.
3. Repository tests currently prove invalid-shape rejection on `loadContentPacket()` but do not yet prove the same hard-fail policy for `listContentPackets()` when a legacy file is present in the directory.
4. Route behavior should not grow its own legacy-handling policy. The clean architecture is for routes to trust the repository contract and either render valid assets or fail through the existing async error path.

## Architecture Check

1. Hard rejection in the repository remains the cleanest enforcement point because every list/load route already flows through the shared validator-backed repository.
2. Adding repository-specific aliasing, migration readers, or route-level fallback parsing would weaken the architecture by duplicating shape policy outside the model guard.
3. The most robust implementation is therefore:
   keep one canonical saved asset shape,
   remove legacy local packet files,
   and make tests prove both direct repository rejection and route-level propagation of repository failures.

## What to Change

### 1. Tighten repository expectations around v2 assets

Update repository tests so `loadContentPacket()` and `listContentPackets()` both fail fast when a file does not satisfy the v2 saved asset guard. Only change production repository code if a test exposes a real gap; do not refactor the repository just to restate validation that already exists.

### 2. Remove incompatible on-disk fixtures/assets

Delete any local `content-packets/*.json` files that do not satisfy the new asset contract. Do not add migration code or compatibility aliases. If replacement assets are needed later, they should be regenerated deliberately from valid upstream artifacts.

### 3. Cover route-level fallout

Update route tests only as needed to prove routes do not silently paper over repository invalid-asset failures. Prefer asserting propagation through the existing route wrapper/error flow rather than introducing new route-specific behavior.

## Files to Touch

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

1. `test/unit/persistence/content-packet-repository.test.ts` proves legacy packet-only files are rejected as invalid saved assets on both `loadContentPacket()` and `listContentPackets()`.
2. `test/unit/server/routes/content-packets-routes.test.ts` proves route handlers do not introduce fallback behavior around repository failures caused by invalid persisted assets.
3. The workspace no longer contains legacy packet JSON files under `content-packets/`.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/persistence/content-packet-repository.test.ts test/unit/server/routes/content-packets-routes.test.ts`

### Invariants

1. The repository recognizes exactly one canonical on-disk saved packet shape: v2 assets with `assetVersion`, `context`, and `origin.sourceArtifacts`.
2. The application never attempts to auto-upgrade, partially parse, or heuristically salvage legacy packet files during normal load/list operations.

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/content-packet-repository.test.ts` — add explicit rejection coverage for legacy packet-only files in both load and list paths.
2. `test/unit/server/routes/content-packets-routes.test.ts` — add or adjust coverage only if needed to prove routes do not translate invalid legacy assets into successful responses.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/persistence/content-packet-repository.test.ts test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run typecheck`

## Outcome

- **Completion date**: 2026-03-19
- **What actually changed**: Reassessed the ticket against the current architecture, confirmed the repository already hard-rejects non-`SavedContentPacket` payloads, added regression coverage for legacy packet-only rejection on both repository `list` and route-level async error propagation, and removed local legacy JSON files from `content-packets/`.
- **What changed vs. originally planned**: No production repository code change was necessary. The original ticket assumed additional repository hardening and tracked fixture cleanup; verification showed the architecture was already correct and the remaining work was test coverage plus local artifact cleanup.
- **Verification results**:
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/content-packet-repository.test.ts test/unit/server/routes/content-packets-routes.test.ts`
  - `npm run typecheck`
  - `npm run lint`
