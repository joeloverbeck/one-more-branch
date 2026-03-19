# CONTPACK-02: Content Packet Card View Model and Exhaustive Rendering

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — server-side content packet presenter/view models, `/content-packets` route payload, EJS rendering, client generated-results rendering
**Deps**: `tickets/CONTPACK-01-canonical-content-packet-artifact.md`, `archive/tickets/WILCONPIP-09-content-packet-routes.md`

## Problem

The `/content-packets` page currently renders saved cards by hard-coding four fields and a synthetic title in the EJS template, while generated cards are built separately in browser JavaScript with a different subset. This guarantees drift: saved cards omit most of the packet payload, generated cards guess at a `title`, and any new field added to the packet model must be manually threaded through multiple rendering paths. The page needs a single data-driven presentation contract.

## Assumption Reassessment (2026-03-19)

1. `src/server/views/pages/content-packets.ejs:95` does not render `packet.name`; it currently renders `packet.packet.coreAnomaly` as both the visible heading and again as a detail row. The architectural issue is duplicated packet-field ownership plus a fabricated card-title slot, not a lingering `name` field.
2. `src/server/views/pages/content-packets.ejs:103` still renders only `Kind`, `Core Anomaly`, `Wildness Invariant`, and `Role`, omitting other canonical packet properties already present in persisted JSON such as `humanAnchor`, `socialEngine`, `choicePressure`, `signatureImage`, `escalationPath`, `dullCollapse`, and `interactionVerbs`.
3. `public/js/src/11-content-packets.js:172` separately renders generated packets with its own title fallback (`coreAnomaly || contentId || "Packet N"`) and its own field subset (`Kind`, `Core Anomaly`, `Wildness Invariant`, `Signature Image`).
4. `src/server/routes/content-packets.ts` currently passes raw saved packets to EJS and returns raw generated packets from `POST /content-packets/api/generate`; no normalized card view-model payload exists yet.
5. Current route tests do not meaningfully protect the rendering contract. `test/unit/server/routes/content-packets-routes.test.ts` uses partial packet objects that do not satisfy the canonical `ContentPacket` shape, and there are currently no dedicated content-packets view tests or client rendering tests. Corrected scope: strengthen tests around the canonical packet contract while introducing the shared presentation model.

## Architecture Check

1. The clean solution is a presenter layer that converts a canonical packet artifact into a `ContentPacketCardViewModel` with ordered `details[]` rows. Templates and browser JS should render the view model, not inspect packet domain fields directly.
2. This is cleaner than patching EJS and client JS independently because it centralizes field ownership, makes exhaustive rendering testable, and supports future packet fields by updating one registry. No duplicate field-order logic across server template and browser script.
3. This change is architecturally better than the current setup. The current split between raw domain objects, EJS-specific assumptions, and client-only fallback rendering is brittle and guarantees drift. A presenter-backed view model is the more robust long-term contract because it isolates rendering concerns from domain storage and removes duplicated field-order knowledge.

## What to Change

### 1. Introduce a content packet card presenter

Add a server-side presenter or utility that transforms canonical saved artifacts into a view model shaped for rendering, for example:

- `id`
- `pinned`
- `actions`
- `details: Array<{ key: string; label: string; value: string | readonly string[] }>`
- optional curation details section for `recommendedRole` / evaluation metadata if product still wants them

The presenter must derive `details` from a single ordered field registry. That registry must enumerate every canonical packet payload field exactly once.

### 2. Remove visible title usage from packet cards

Saved packet cards must stop rendering any synthetic title/header sourced from `name` or guessed fallback text. Generated packet cards must stop guessing `pkt.title || pkt.coreAnomaly || ...`.

If a card still needs a visible top row for layout, it must be structural only (for example pin state and actions), not a fabricated packet title.

### 3. Render all packet properties except the grouping field when already grouped

For the saved packet list grouped by `contentKind`, each card must render every canonical packet payload property except `contentKind`, because that taxonomy is already conveyed by the enclosing group.

For ungrouped generated results, the presenter may include `contentKind` in `details` because no outer grouping is present.

`interactionVerbs` must render as an intentional list or joined value, not be omitted because it is array-typed.

### 4. Use the same presentation model for generated results

`POST /content-packets/api/generate` should return presenter-built card view models alongside raw packets, or otherwise expose the same normalized rendering payload, so `public/js/src/11-content-packets.js` does not own a second field registry.

Browser code should only:

- iterate `packetCards`
- render the provided detail rows
- keep the raw packet only for save actions

### 5. Replace direct packet inspection in the EJS template

`src/server/views/pages/content-packets.ejs` should render grouped card view models, not `SavedContentPacket` internals. This prevents template drift when the underlying packet artifact evolves.

### 6. Tighten tests to canonical fixtures

Where route tests exercise saved or generated packet rendering data, they must use fully valid canonical `ContentPacket` fixtures rather than partial objects. The goal is to stop tests from passing with impossible packet shapes.

### 7. Add exhaustive-coverage tests

Add tests that fail if a canonical packet field is missing from the presenter registry or if the grouped saved-card presenter accidentally includes `contentKind`.

## Files to Touch

- `src/server/routes/content-packets.ts` (modify)
- `src/server/utils/group-content-packets-by-kind.ts` (modify if grouping moves to view-model input/output)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `public/js/app.js` (regenerate)
- `src/server/...` new presenter utility file for content packet card view models (new)
- `test/unit/group-content-packets-by-kind.test.ts` (modify only if grouping input/output changes)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/views/content-packets*.test.ts` (new)
- `test/unit/client/content-packets-page/*.test.ts` or equivalent (new)
- `test/unit/server/...presenter*.test.ts` (new)

## Out of Scope

- Search, filtering, sorting, or pagination for content packets
- Editing packet content inline
- Changing grouping away from `contentKind`

## Acceptance Criteria

### Tests That Must Pass

1. The saved `/content-packets` page renders all canonical packet payload fields except `contentKind` inside grouped cards.
2. Generated packet cards render from the shared presenter/view-model payload and do not invent or display a title.
3. Adding a new canonical packet field requires changing the presenter registry and causes a failing test until that registry is updated.
4. Route-level tests that cover rendering payloads use canonical packet fixtures, not partial packet stubs.
5. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. There is one authoritative field-order registry for content packet card rendering.
2. Grouped saved cards never repeat `contentKind` inside the card body.
3. Templates and browser JS render view models, not raw packet domain objects.

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/content-packets-routes.test.ts` — assert the route passes grouped card view models to the page and returns generated `packetCards` from the API.
2. `test/unit/server/views/content-packets*.test.ts` — assert saved cards render no title and include all canonical packet fields except `contentKind`.
3. `test/unit/client/...content-packets*.test.ts` — assert generated-results rendering consumes `packetCards` and preserves save behavior.
4. `test/unit/server/...presenter*.test.ts` — assert the field registry is exhaustive and ordered.
5. Update existing route fixtures to use valid canonical packets so these tests fail on impossible packet shapes.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run test:client`
3. `npm run typecheck`
4. `npm run lint`
5. `npm run test:unit -- --coverage=false`

## Outcome

- Completion date: 2026-03-19
- What changed: introduced a server-side content-packet card presenter with one authoritative canonical field registry; updated `/content-packets` route payloads so saved cards and generated cards both consume presenter-built card view models; removed synthetic visible titles from saved/generated cards; rendered all canonical packet fields (grouped saved cards omit `contentKind`); added dedicated presenter, route, template, and client tests; tightened route tests to use canonical packet fixtures instead of partial impossible packet stubs.
- Deviations from original plan: the ticket’s initial reassessment incorrectly referenced `packet.name`; implementation corrected the real issue, which was `coreAnomaly` being reused as a visible title and body detail. Recommended role was preserved as presenter-driven meta detail rather than mixed into the canonical packet field registry.
- Verification results: `npm run concat:js`, `npm run typecheck`, `npm run lint`, `npm run test:unit -- --coverage=false`, and `npm run test:client` all passed on 2026-03-19.
