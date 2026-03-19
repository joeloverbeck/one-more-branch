# CONTPACK-01: Canonical Content Packet Artifact Contract

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — content packet domain models, one-shot/pipeline generation contracts, persistence payload, route save normalization
**Deps**: `archive/tickets/WILCONPIP-01-content-packet-types.md`, `archive/tickets/WILCONPIP-03-one-shot-content-prompt.md`, `archive/tickets/WILCONPIP-06-content-packeter-prompt.md`, `archive/tickets/WILCONPIP-09-content-packet-routes.md`

## Problem

`/content-packets` currently persists and renders a mixed contract. The pipeline packeter produces `ContentPacket` objects with no title, while the one-shot generator produces `ContentOneShotPacket` objects with `title` and `escalationHint` instead of the pipeline shape. The save route compensates by inventing `SavedContentPacket.name = 'Untitled Packet'` when no `title` exists, flattening packet data and curation metadata into one shape, and silently dropping distinctions between generation modes. This makes saved packets semantically wrong, hard to render exhaustively, and brittle to extend.

## Assumption Reassessment (2026-03-19)

1. `src/llm/content-packeter-generation.ts` and `src/llm/schemas/content-packeter-schema.ts` confirm the pipeline packet contract already has the durable fields downstream stages care about: `contentId`, `contentKind`, the semantic packet body, `escalationPath`, and `interactionVerbs`. The ticket's original framing was too aggressive in treating all non-display metadata as removable provenance.
2. `src/llm/content-one-shot-generation.ts`, `src/llm/schemas/content-one-shot-schema.ts`, and `src/server/services/content-service.ts` confirm the quick path still emits a distinct `ContentOneShotPacket` shape (`title`, `escalationHint`, no `interactionVerbs`, no packet identity), which forces downstream save/render code to branch on generation mode.
3. `src/server/routes/content-packets.ts` and repository-owned files in `content-packets/*.json` confirm persisted packets are currently flattened and include a synthetic `name` fallback (`Untitled Packet`). That persisted display alias is not part of the real packet domain and should be removed.
4. `src/server/views/pages/content-packets.ejs` and `public/js/src/11-content-packets.js` confirm the current UI still assumes a saved/display title. Corrected scope: saved artifacts must stop persisting display-only naming, and the UI must derive labels from canonical packet data at render time.
5. `src/llm/prompts/concept-*.ts` confirm `contentId` is already a load-bearing packet identity used across concept stages. Corrected architecture: keep packet identity in the canonical packet contract; do not strip it out under the banner of separating semantics from provenance.

## Architecture Check

1. The clean boundary is to separate the canonical packet contract from saved-artifact metadata. The packet contract should remain the single runtime shape used by generation, evaluation, concept seeding, and persistence payloads. Saved-artifact metadata such as `id`, timestamps, `pinned`, and optional evaluation should wrap that packet instead of being flattened into it.
2. `contentId` should remain inside the canonical packet contract because it is the stable packet identity used by downstream concept stages. By contrast, persisted `name` is display-only invented data and should be removed entirely.
3. This architecture is more beneficial than the current flattening because it removes synthetic fields, removes route-level mode branching, and gives the UI and repository one stable artifact shape to enumerate. No backwards-compatibility alias fields or dual runtime read paths are allowed; existing stored files and tests must be migrated to the new contract.

## What to Change

### 1. Collapse onto one canonical packet contract

Retire `ContentOneShotPacket` and make both generation modes produce the same packet contract. The existing `ContentPacket` shape is the right starting point because downstream prompts already depend on `contentId` plus the current packet fields.

The canonical packet contract must contain:

- `contentId`
- `contentKind`
- `coreAnomaly`
- `humanAnchor`
- `socialEngine`
- `choicePressure`
- `signatureImage`
- `escalationPath`
- `wildnessInvariant`
- `dullCollapse`
- `interactionVerbs`

`sourceSparkIds` should not stay as a required top-level field on saved artifacts. If pipeline lineage still matters after normalization, model it explicitly as provenance rather than forcing quick generation to masquerade as spark-derived content.

### 2. Replace the flattened saved model with an artifact wrapper

Refactor `SavedContentPacket` so it wraps the canonical payload and curation metadata explicitly, for example:

- top-level artifact metadata: `id`, `createdAt`, `updatedAt`, `pinned`
- packet payload: `packet: ContentPacket`
- optional provenance: generation mode and upstream identifiers such as `sourceSparkIds` if they are no longer part of the canonical packet itself
- optional evaluation block preserving evaluator output

`name` must be removed from the saved contract. Do not replace it with another display-only alias.

### 3. Normalize quick generation to the canonical contract

Update the one-shot prompt, schema, parser, service contract, and tests so quick generation emits the same packet fields the rest of the system expects:

- no `title`
- use `escalationPath`, not `escalationHint`
- emit `contentId`
- emit `interactionVerbs`

If quick generation cannot produce a field at acceptable quality, that is a generator-quality problem to solve in the prompt/schema, not a reason to keep multiple packet shapes in the domain model.

### 4. Move normalization out of the route handler

Create a dedicated mapper or factory for turning generated packet results into persisted artifacts. `src/server/routes/content-packets.ts` must stop containing union-shape coercion such as `'title' in packet` or `'escalationPath' in packet`.

### 5. Migrate repository fixtures and stored packet JSON

Rewrite tracked tests, fixtures, and repository-owned `content-packets/*.json` files to the new artifact shape in the same pass. Do not add repository logic that accepts both old and new file shapes at runtime.

### 6. Update prompt documentation in the same pass

Because this changes prompt-output ownership and schema between stages, update the relevant `prompts/*.md` docs so they describe the new canonical packet output and contain no stale references to `title`, `escalationHint`, or flattened saved-packet assumptions.

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `src/llm/content-one-shot-generation.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/persistence/content-packet-repository.ts` (modify if helper contracts change)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `prompts/content-packeter-prompt.md` (modify if packet/provenance ownership text changes)
- `test/unit/models/content-packet.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/persistence/content-packet-repository.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/group-content-packets-by-kind.test.ts` (modify)
- `content-packets/*.json` (modify existing repository-owned artifacts if they remain in scope)

## Out of Scope

- Visual redesign of the `/content-packets` page beyond what is required by the new contract
- New packet taxonomy values or evaluator scoring changes
- Concept-pipeline prompt changes unrelated to packet output schema alignment

## Acceptance Criteria

### Tests That Must Pass

1. Saving a generated packet persists a wrapped artifact with no persisted `name` or `title` field and no route-level shape branching.
2. Quick generation and pipeline generation both produce packets that validate against the same canonical packet contract.
3. Loading persisted packets rejects legacy flattened payloads once repository fixtures have been migrated.
4. Existing suite: `npm run test:unit -- --coverage=false`

### Invariants

1. No saved content packet contains invented display data such as `Untitled Packet`.
2. There is exactly one canonical packet contract across generation, save/load, and rendering.
3. Runtime persistence validation accepts only the new artifact shape; migration happens in-repo, not via permanent compatibility shims.
4. Packet identity remains explicit and stable via `contentId`; the UI derives display labels from packet content instead of persisted aliases.

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-packet.test.ts` — validate the new saved artifact contract and reject legacy flattened `name`-based payloads.
2. `test/unit/llm/content-one-shot.test.ts` — assert one-shot parsing returns the canonical packet fields with no `title` / `escalationHint`.
3. `test/unit/server/services/content-service.test.ts` — assert quick generation now returns the canonical packet contract.
4. `test/unit/server/routes/content-packets-routes.test.ts` — assert save uses a dedicated normalization path and persists the wrapped artifact shape.
5. `test/unit/persistence/content-packet-repository.test.ts` — assert repository round-trips the new nested artifact payload and rejects legacy files.
6. `test/unit/group-content-packets-by-kind.test.ts` — assert grouping continues to work against the wrapped saved artifact.

### Commands

1. `npm run test:unit -- --coverage=false --runInBand test/unit/models/content-packet.test.ts test/unit/llm/content-one-shot.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/persistence/content-packet-repository.test.ts test/unit/group-content-packets-by-kind.test.ts`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test:unit -- --coverage=false`

## Outcome

- Completed: 2026-03-19
- What changed:
  - Retired the separate `ContentOneShotPacket` runtime contract and normalized quick generation onto the canonical packet fields used elsewhere (`contentId`, `escalationPath`, `interactionVerbs`, no `title` / `escalationHint`).
  - Replaced the flattened saved-packet shape with a wrapped artifact: artifact metadata at the top level, canonical packet body under `packet`, optional `provenance`, and optional `evaluation`.
  - Removed persisted `name` / `Untitled Packet` behavior and removed the route's union-shape coercion by introducing a dedicated artifact factory.
  - Updated the content-packets UI to derive labels from packet content instead of persisted aliases.
  - Migrated repository-owned `content-packets/*.json` files and updated prompt docs plus affected tests.
- Deviations from original plan:
  - Kept `contentId` inside the canonical packet contract because it is already a load-bearing downstream identity.
  - Treated `sourceSparkIds` as optional pipeline provenance on saved artifacts rather than part of the canonical saved packet body.
  - Removed the synthetic top-level `recommendedRole` from saved artifacts; saved role now lives in optional `evaluation` data and renders as `UNSCORED` when absent.
- Verification:
  - `npm run concat:js`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit -- --coverage=false --runInBand test/unit/models/content-packet.test.ts test/unit/llm/content-one-shot.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/persistence/content-packet-repository.test.ts test/unit/group-content-packets-by-kind.test.ts`
  - `npm run test:unit -- --coverage=false`
