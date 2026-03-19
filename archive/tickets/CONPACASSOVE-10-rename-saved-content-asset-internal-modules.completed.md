# CONPACASSOVE-10: Rename saved-content asset internal modules by persisted-asset ownership

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CONPACASSOVE-08-rename-content-packet-projection-contract.completed.md`, `tickets/CONPACASSOVE-09-split-content-domain-contract-modules.md`

## Problem

Even after the projection rename, several internal persistence/server modules still use `content-packet` naming for code that is specifically about the persisted asset boundary:

- `src/persistence/content-packet-repository.ts`
- `src/server/services/content-packet-artifact.ts`
- `src/server/presenters/content-packet-card.ts`
- `src/server/utils/group-content-packets-by-kind.ts`

This is now architecturally misleading. In active code, `packet` is the nested projection payload inside `SavedContentPacket`, not the whole persisted asset. Internal module names should reflect whether they manage the persisted asset or the lean projection. Right now they do not.

## Assumption Reassessment (2026-03-19)

1. The persisted artifact contract remains `SavedContentPacket` in `src/models/saved-content-packet.ts`, and repository/service/presenter code in the server layer primarily operates on that saved asset shape rather than on bare `ConceptSeedPacket` values.
2. The route module `src/server/routes/content-packets.ts` still serves the product surface and URL namespace for content packets. That may still be acceptable product language, but its helper modules are internal implementation surfaces and should use precise ownership-based naming.
3. The current persistence module labels are stale relative to actual architecture:
   - repository functions store/load `SavedContentPacket`
   - artifact creation turns `GeneratedContentPacket` into `SavedContentPacket`
   - saved-packet grouping utilities group persisted assets, not bare projections
4. The presenter module assumption in the original ticket is inaccurate. `src/server/presenters/content-packet-card.ts` currently renders both:
   - generated asset-backed packet candidates via `buildGeneratedContentPacketCardViewModel`
   - persisted assets via `buildSavedContentPacketCardViewModel` and `buildSavedContentPacketCardWithRecommendedRole`
   Renaming that file to a saved-only module would make the file name less accurate unless the generated-card code were split out in a separate ticket.
5. Corrected scope: this ticket should rename only the internal modules and exports that are genuinely saved-asset specific, while leaving mixed-ownership presenter surfaces, public route paths, and user-facing copy unchanged.

## Architecture Check

1. Renaming internal saved-asset modules is cleaner than keeping projection-era names because it makes persistence/server ownership explicit without forcing a user-facing rename.
2. This is more robust than a half-step alias because internal code should have one precise name per architectural concept. Do not keep both old and new function/module names.
3. Keeping the route path stable while cleaning internal module names is acceptable here because URL/product naming and internal architecture naming are different layers with different constraints.
4. No backwards-compatibility shims, duplicate module paths, or dual exports should be introduced.
5. Do not force a saved-only name onto a mixed presenter module. If we want stricter ownership there later, the cleaner direction is a follow-up split into generated-card and saved-card presenter modules, not a misleading rename.

## What to Change

### 1. Rename persistence and server module files to saved-asset names

Rename internal modules to make persisted-asset ownership explicit. The final names can be refined slightly if a cleaner equivalent emerges, but they must be saved-asset specific where the module is actually saved-only. Preferred direction:

- `src/persistence/content-packet-repository.ts` -> `src/persistence/saved-content-packet-repository.ts`
- `src/server/services/content-packet-artifact.ts` -> `src/server/services/saved-content-packet-artifact.ts`
- `src/server/utils/group-content-packets-by-kind.ts` -> `src/server/utils/group-saved-content-packets-by-kind.ts`

Do not rename `src/server/presenters/content-packet-card.ts` in this ticket. It is currently a mixed generated/saved presenter module and the existing file name is more accurate than a saved-only name.

### 2. Rename exported functions/types to match saved-asset ownership

Examples of intended direction:

- `createSavedContentPacketArtifact` can remain if the containing file becomes saved-asset specific
- repository function names should be reassessed, because `saveContentPacket` / `loadContentPacket` / `listContentPackets` are ambiguous in internal code now that `packet` is the nested projection inside `SavedContentPacket`
- grouping helpers should use saved-asset-oriented export names because they only accept `SavedContentPacket[]`
- presenter helpers already have sufficiently precise export names and are out of scope unless a real ambiguity is found during implementation

Use judgment here:

- rename what is architecturally ambiguous
- keep names that are already precise enough
- avoid churn where the name is already correct and only the file/module path is wrong

### 3. Update imports and tests without changing public route/product language

Update all import sites to the new internal module paths. Keep these out of scope in this ticket unless a separate decision is made:

- Express route path `/content-packets`
- storage directory config key/value such as `contentPacketsDir`
- browser-visible page titles/copy

If those become part of a broader product-language cleanup later, handle them in a separate ticket rather than mixing concerns here.

## Files to Touch

- `src/persistence/saved-content-packet-repository.ts` (new via rename)
- `src/server/services/saved-content-packet-artifact.ts` (new via rename)
- `src/server/utils/group-saved-content-packets-by-kind.ts` (new via rename)
- `src/server/routes/content-packets.ts` (modify imports only, unless a precisely scoped export rename is required)
- `test/unit/group-saved-content-packets-by-kind.test.ts` (rename/update if grouping import/export changes)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify imports if path changes)
- `test/unit/server/services/saved-content-packet-artifact.test.ts` (modify imports if path changes)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify imports/mocks if path changes)

## Out of Scope

- Renaming `/content-packets` route paths or page titles
- Renaming storage directory config keys/values such as `contentPacketsDir`
- Changing saved asset or projection payload shapes
- Reworking model-module boundaries beyond what CONPACASSOVE-09 covers
- Splitting `content-packet-card.ts` into separate generated/saved presenter modules

## Acceptance Criteria

### Tests That Must Pass

1. Internal persistence/server modules that manage `SavedContentPacket` no longer live behind `content-packet-*` file names.
   - Exception: mixed-ownership presenter modules may retain `content-packet-*` naming when they intentionally serve both generated and saved packet card rendering.
2. Import sites compile against the renamed saved-asset module paths without alias exports or forwarding files.
3. Public route behavior and saved-asset behavior remain unchanged.
4. Existing suites:
   - `npm run test:unit -- --runTestsByPath test/unit/persistence/saved-content-packet-repository.test.ts test/unit/server/services/saved-content-packet-artifact.test.ts test/unit/group-saved-content-packets-by-kind.test.ts test/unit/server/routes/content-packets-routes.test.ts`

### Invariants

1. Internal module/file names clearly distinguish persisted saved assets from lean concept-stage projection objects.
2. No dual module paths or transitional compatibility imports are introduced.
3. Product-surface route naming stays isolated from internal architecture naming decisions.
4. Mixed generated/saved presenter modules must not be given misleading saved-only names.

## Test Plan

### New/Modified Tests

1. `test/unit/persistence/saved-content-packet-repository.test.ts` — update repository imports/exports and keep saved-asset persistence behavior locked.
2. `test/unit/server/services/saved-content-packet-artifact.test.ts` — update service imports and verify save-candidate to saved-asset conversion still behaves identically.
3. `test/unit/group-saved-content-packets-by-kind.test.ts` — update grouping imports/exports and keep saved-asset kind grouping behavior locked.
4. `test/unit/server/routes/content-packets-routes.test.ts` — update mocked import paths and route assertions so route behavior stays stable after the internal rename.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/persistence/saved-content-packet-repository.test.ts test/unit/server/services/saved-content-packet-artifact.test.ts test/unit/group-saved-content-packets-by-kind.test.ts test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-19
- What changed:
  - Renamed the saved-only repository module to `saved-content-packet-repository` and made its exported functions explicitly saved-asset specific.
  - Renamed the saved-only artifact module to `saved-content-packet-artifact`.
  - Renamed the saved-only grouping utility to `group-saved-content-packets-by-kind` and tightened its exported surface to `groupSavedContentPacketsByKind` / `SavedContentPacketKindGroup`.
  - Updated route imports and unit tests to use the saved-asset-specific module paths and export names.
  - Renamed the affected saved-only unit test files to match the new module names.
- Deviations from the original plan:
  - Did not rename `src/server/presenters/content-packet-card.ts`. Reassessment showed it is a mixed generated/saved presenter module, so a saved-only file name would have been less accurate than the current architecture. The cleaner long-term move there would be a follow-up split, not a misleading rename.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/persistence/saved-content-packet-repository.test.ts test/unit/server/services/saved-content-packet-artifact.test.ts test/unit/group-saved-content-packets-by-kind.test.ts test/unit/server/routes/content-packets-routes.test.ts`
  - `npm run typecheck`
  - `npm run lint`
