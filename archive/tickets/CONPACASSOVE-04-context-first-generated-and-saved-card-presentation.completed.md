# CONPACASSOVE-04: Restructure generated and saved cards around context-first asset presentation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — presenter view models, EJS structure, generated-card preview rendering
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.md`, `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md`

## Problem

The content-packet asset overhaul is already present in the model and save path, but the card presenter and renderers still flatten only the lean `packet` projection plus a minimal meta section. That makes both generated previews and saved cards hide the richer `context` and `origin` semantics the asset model was introduced to preserve.

## Assumption Reassessment (2026-03-19)

1. `src/models/saved-content-packet.ts` and `src/server/services/content-packet-artifact.ts` already implement the v2 saved asset contract with `packet`, `context`, `origin`, and optional `evaluation`. This ticket must not revisit that model boundary.
2. `src/server/presenters/content-packet-card.ts` still exposes `details` plus `metaDetails` only, and `buildContentPacketCardViewModel()` accepts just a `ContentPacket` plus optional evaluation. That API is too narrow for the current architecture because it cannot present context or source artifacts.
3. `src/server/routes/content-packets.ts` still builds generated preview cards from `generatedPacket.packet` only, so generated cards cannot converge with saved-card semantics until the presenter accepts the full generated asset candidate.
4. `src/server/views/pages/content-packets.ejs` and `public/js/src/11-content-packets.js` currently render cards as one flat field list. The template and generated-preview renderer need a section-aware view model rather than ad hoc field ordering logic.
5. Existing presenter, view, and client tests mostly assert the old flattened structure. Route tests should also be updated because the generated-card presenter input boundary changes there.

## Architecture Check

1. Splitting card view data into `context`, `packet`, `origin`, and `meta` sections keeps rendering declarative and preserves the saved-asset architecture instead of collapsing back to the prompt-facing projection.
2. The presenter should become the single place that translates asset-like domain objects into UI sections. Route code should pass full generated candidates and saved assets through it, not reconstruct display rules manually.
3. No compatibility alias should preserve the old flat card registry as a first-class UI contract. Generated previews and saved cards should converge on one sectioned semantic shape.

## What to Change

### 1. Introduce sectioned card view models

Replace the flat presenter contract so card data is emitted as sectioned detail groups:

- `contextDetails`
- `packetDetails`
- `originDetails`
- `metaDetails`

Generated preview presenters must accept the full generated asset candidate, not only `generatedPacket.packet`.

Ensure context fields render before canonical packet fields, and origin details are derived from persisted source artifacts rather than hand-built strings in the view layer.

### 2. Update saved card rendering

Revise the EJS template so saved cards display, in order:

1. `Premise Summary`
2. `Situation Frame`
3. `World State`
4. canonical packet fields
5. source artifacts
6. evaluation metadata

### 3. Update generated packet preview rendering

Revise the server route and client-side generated-card renderer so previews match the saved-card semantic structure before the user clicks save.

## Files to Touch

- `src/server/presenters/content-packet-card.ts` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/views/content-packets.test.ts` (modify)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)

## Out of Scope

- Changing model guards or LLM schemas
- Save route validation logic beyond whatever route call-site updates are required by the new presenter input
- Repository legacy-file invalidation
- Deleting on-disk `content-packets/*.json`

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/server/presenters/content-packet-card.test.ts` proves saved and generated cards emit `context`, `packet`, `origin`, and `meta` sections in the intended order.
2. `test/unit/server/routes/content-packets-routes.test.ts` proves `/content-packets/api/generate` now builds preview cards from the full generated candidate rather than the lean packet projection alone.
3. `test/unit/server/views/content-packets.test.ts` proves the rendered page shows context fields before canonical packet fields and includes source artifact details.
4. `test/unit/client/content-packets-page/controller.test.ts` proves generated preview cards render the same section structure as saved cards.
5. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/server/views/content-packets.test.ts test/unit/client/content-packets-page/controller.test.ts`

### Invariants

1. A packet card remains intelligible in isolation because premise context is visible without expanding or cross-referencing other assets.
2. Generated previews and saved cards do not diverge in semantic shape; saving a packet should not materially change what the card means.
3. The UI presenter layer must not collapse the saved-asset architecture back into the lean downstream packet contract.

## Test Plan

### New/Modified Tests

1. `test/unit/server/presenters/content-packet-card.test.ts` — sectioned view-model shape, ordering, and source-artifact rendering.
2. `test/unit/server/routes/content-packets-routes.test.ts` — generated preview route uses the full generated candidate when building cards.
3. `test/unit/server/views/content-packets.test.ts` — rendered section labels and ordering coverage.
4. `test/unit/client/content-packets-page/controller.test.ts` — generated-card preview rendering for context and origin sections.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/server/views/content-packets.test.ts test/unit/client/content-packets-page/controller.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completed: 2026-03-19
- Actual changes:
  - Replaced the flat packet-only card presenter with a sectioned asset-backed view model exposing `contextDetails`, `packetDetails`, `originDetails`, and `metaDetails`.
  - Updated `/content-packets/api/generate` to build preview cards from the full generated candidate instead of only the lean `packet` projection.
  - Updated the saved-card EJS template and generated-preview client renderer so both display the same context-first, origin-aware card structure.
  - Regenerated `public/js/app.js` from `public/js/src/11-content-packets.js`.
- Deviations from original plan:
  - Added route-level coverage because the presenter boundary changed in `src/server/routes/content-packets.ts`.
  - Kept the underlying saved asset model and save validation unchanged because those architectural changes were already completed in earlier tickets.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/server/views/content-packets.test.ts test/unit/client/content-packets-page/controller.test.ts`
  - `npm run typecheck`
  - `npm run lint`
