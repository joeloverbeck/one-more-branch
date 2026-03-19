# CONPACASSOVE-04: Restructure generated and saved cards around context-first asset presentation

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — presenter view models, EJS structure, generated-card preview rendering
**Deps**: `specs/content-packet-asset-overhaul.md`, `tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.md`, `tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.md`, `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md`

## Problem

The current card presenter flattens packet details into one registry and only exposes a minimal meta section. That makes both generated previews and saved cards hide the new saved-asset semantics the overhaul is meant to preserve.

## Assumption Reassessment (2026-03-19)

1. `src/server/presenters/content-packet-card.ts` currently exposes `details` plus `metaDetails`; there is no dedicated place for context or origin sections.
2. `src/server/views/pages/content-packets.ejs` and `public/js/src/11-content-packets.js` currently render cards as flat packet field lists, so saved and generated cards share the same under-specified presentation model.
3. Existing presenter and view tests assert the old flattened order, so this ticket needs to rewrite those expectations explicitly rather than patching around them.

## Architecture Check

1. Splitting card view data into context, packet, origin, and meta sections keeps rendering declarative and avoids mixing presentation rules into route code.
2. No alias layout should preserve the old flat registry for compatibility. Generated previews and saved cards should converge on the same sectioned semantics.

## What to Change

### 1. Introduce sectioned card view models

Update the presenter so card data is emitted as:

- `contextDetails`
- `packetDetails`
- `originDetails`
- `metaDetails`

Ensure context fields render before canonical packet fields.

### 2. Update saved card rendering

Revise the EJS template so saved cards display, in order:

1. `Premise Summary`
2. `Situation Frame`
3. `World State`
4. canonical packet fields
5. source artifacts
6. evaluation metadata

### 3. Update generated packet preview rendering

Revise the client-side generated-card renderer so previews match the saved-card semantic structure before the user clicks save.

## Files to Touch

- `src/server/presenters/content-packet-card.ts` (modify)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/server/views/content-packets.test.ts` (modify)
- `test/unit/client/content-packets-page/controller.test.ts` (modify)

## Out of Scope

- Changing model guards or LLM schemas
- Save route validation logic
- Repository legacy-file invalidation
- Deleting on-disk `content-packets/*.json`

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/server/presenters/content-packet-card.test.ts` proves saved cards emit context, packet, origin, and meta sections in the intended order.
2. `test/unit/server/views/content-packets.test.ts` proves the rendered page shows context fields before canonical packet fields and includes source artifact details.
3. `test/unit/client/content-packets-page/controller.test.ts` proves generated preview cards render the same section structure as saved cards.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/server/presenters/content-packet-card.test.ts test/unit/server/views/content-packets.test.ts test/unit/client/content-packets-page/controller.test.ts`

### Invariants

1. A packet card remains intelligible in isolation because premise context is visible without expanding or cross-referencing other assets.
2. Generated previews and saved cards do not diverge in semantic shape; saving a packet should not materially change what the card means.

## Test Plan

### New/Modified Tests

1. `test/unit/server/presenters/content-packet-card.test.ts` — sectioned view-model shape and ordering.
2. `test/unit/server/views/content-packets.test.ts` — rendered section labels and ordering coverage.
3. `test/unit/client/content-packets-page/controller.test.ts` — generated-card preview rendering for context and origin sections.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/server/presenters/content-packet-card.test.ts test/unit/server/views/content-packets.test.ts test/unit/client/content-packets-page/controller.test.ts`
2. `npm run typecheck`

