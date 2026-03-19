# Content Packet Asset Overhaul

**Status**: PENDING IMPLEMENTATION
**Date**: 2026-03-19
**Scope**: Content packet generation contracts, saved asset model, persistence, routes, UI presenters, prompt docs, and legacy packet invalidation
**Backward Compatibility**: None required

---

## Context

The current content-packet system compresses too much meaning into the canonical `ContentPacket` body. That contract is sufficient for downstream concept stages, but insufficient as a saved author-facing asset.

Today:

- the UI renders the saved packet exhaustively,
- the saved packet body only contains the narrow canonical packet fields,
- pipeline lineage is reduced to `sourceSparkIds`,
- spark text, image seeds, and collision tags are not persisted with the saved packet,
- quick-generated packets have no persisted upstream lineage at all,
- and no field exists for a compact setup summary or premise scaffold that preserves the causal situation behind the anomaly.

This produces cards that are formally valid but semantically under-specified. A saved packet can say "the rescue is genuine" without preserving enough upstream asset context to tell the user what rescue actually happened.

That is an architectural failure, not a rendering bug.

The fix must separate two responsibilities that are currently conflated:

1. the **canonical concept-seeding packet contract** used by downstream prompt stages, and
2. the **saved content packet asset** used for author inspection, persistence, auditability, and reuse.

Saved packets must become complete assets with explicit lineage and explicit premise context. Any existing saved packets that do not satisfy the new asset contract must be deleted rather than grandfathered in.

---

## Design Principles

### 0.1 Saved assets must be self-explanatory

A saved content packet must remain intelligible when viewed in isolation weeks later. The author should not need prompt logs, memory of the generation session, or inferred reconstruction from adjacent fields.

### 0.2 Downstream prompt contracts should stay lean

Concept seeding and later stages do not need the entire saved asset body. They need a deliberate projection of the asset into a compact packet contract.

### 0.3 Lineage must preserve meaning, not just identifiers

IDs alone are not enough. If upstream artifacts matter to interpretation, the saved asset must persist the relevant upstream text and image hooks, not only references.

### 0.4 Quick and pipeline modes must converge to one saved asset shape

A quick-generated saved packet and a pipeline-generated saved packet must both persist enough origin context to be inspectable. The difference should be in lineage richness, not in whether the asset is understandable.

### 0.5 No alias paths, adapters, or compatibility shims

Old packet files are invalid under the new architecture. The system should reject them as non-canonical assets. If they cannot be losslessly rebuilt from source artifacts, they should be removed.

---

## 1. Core Architecture Change

Replace the idea that `SavedContentPacket` is a thin wrapper around `ContentPacket`.

New architecture:

1. Introduce a richer saved asset model that includes:
   - canonical packet fields for downstream prompt use,
   - explicit premise/setup context,
   - persisted origin artifacts,
   - generation metadata.
2. Treat the current `ContentPacket` as a **derived downstream projection**, not the saved asset itself.
3. Save the full asset, then derive prompt-facing packet views from it.
4. Remove all previously saved packet files that do not match the new asset contract.

This is the same architectural move already applied elsewhere in the codebase: the persisted asset carries more information than any one downstream consumer needs.

---

## 2. Data Model Redesign

### 2.1 Keep a lean downstream packet projection

Retain a compact packet type for concept stages, but make it explicitly a projection:

**File**: `src/models/content-packet.ts`

Recommended rename:

- `ContentPacket` → `ConceptSeedPacket`

If renaming is too disruptive for the first pass, the existing name may remain, but the code must conceptually treat it as a projection, not the saved asset.

The projection should continue to contain:

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

These remain the minimum contract injected into downstream concept prompts.

### 2.2 Introduce a first-class saved asset model

**File**: `src/models/saved-content-packet.ts`

Replace the current thin wrapper with a proper asset:

```ts
export interface SavedContentPacket {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pinned: boolean;

  readonly assetVersion: 2;
  readonly packet: ContentPacket;
  readonly context: ContentPacketContext;
  readonly origin: ContentPacketOrigin;
  readonly evaluation?: ContentEvaluation;
}
```

Add:

```ts
export interface ContentPacketContext {
  readonly premiseSummary: string;
  readonly situationFrame: string;
  readonly worldState: string;
  readonly viewpointPressure?: string;
}
```

Definitions:

- `premiseSummary`: compact "what is actually happening here?" summary in plain causal language
- `situationFrame`: immediate setup or arrangement the packet assumes
- `worldState`: the relevant baseline reality or environment that makes the anomaly legible
- `viewpointPressure`: optional clarification of why the player/protagonist is trapped in this structure

The minimum requirement is that `premiseSummary`, `situationFrame`, and `worldState` must make the packet intelligible without reading the longer packet fields.

### 2.3 Persist origin artifacts, not only provenance labels

Replace `ContentPacketProvenance` with a richer origin model:

```ts
export interface ContentPacketOrigin {
  readonly generationMode: 'quick' | 'pipeline';
  readonly sourceArtifacts: readonly ContentPacketSourceArtifact[];
}

export interface ContentPacketSourceArtifact {
  readonly artifactType: 'EXEMPLAR' | 'SPARK';
  readonly sourceId: string;
  readonly contentKind?: ContentKind;
  readonly summary: string;
  readonly imageSeed?: string;
  readonly collisionTags?: readonly string[];
}
```

Rules:

- Pipeline packets must persist one or more `SPARK` artifacts with the actual spark text and image seed.
- Quick packets must persist one or more `EXEMPLAR` artifacts derived from the user inputs that materially influenced the packet.
- `sourceSparkIds` may still exist transiently during generation, but it is not sufficient as the saved asset lineage model.

### 2.4 Eliminate save-time shape loss

The current save path clones only the narrow packet fields and strips source detail into a shallow provenance object. That behavior must be removed.

The asset builder should instead:

- validate the full saved asset contract,
- persist all required context and origin artifacts,
- derive downstream packet projections only when needed for prompts.

---

## 3. Generation Contract Changes

### 3.1 Expand the packeter output contract

**Files**:

- `src/llm/prompts/content-packeter-prompt.ts`
- `src/llm/schemas/content-packeter-schema.ts`
- `prompts/content-packeter-prompt.md`
- `src/llm/content-packeter-generation.ts`

The packeter must no longer output only the canonical packet fields plus `sourceSparkIds`.

It must output a richer structure:

```json
{
  "packets": [
    {
      "contentId": "pkt-01",
      "sourceSparkIds": ["spark-01"],
      "premiseSummary": "A marine salvage operator rescues an undocumented young man from the water and keeps him on his isolated compound under the logic of genuine rescue.",
      "situationFrame": "The boy was pulled from open water, has no papers, no money, and no route off the compound except through the rescuer.",
      "worldState": "The rescue site and compound are geographically isolated enough that outside systems are slow, optional, or absent.",
      "coreAnomaly": "...",
      "humanAnchor": "...",
      "socialEngine": "...",
      "choicePressure": "...",
      "signatureImage": "...",
      "escalationPath": "...",
      "wildnessInvariant": "...",
      "dullCollapse": "...",
      "interactionVerbs": ["..."]
    }
  ]
}
```

Prompt requirements must explicitly distinguish:

- `premiseSummary`: causal setup in plain language
- `coreAnomaly`: what is charged/wrong/structurally off inside that setup

The model should not be allowed to bury setup inside `coreAnomaly` alone.

### 3.2 Expand the one-shot output contract

**Files**:

- `src/llm/prompts/content-one-shot-prompt.ts`
- `src/llm/schemas/content-one-shot-schema.ts`
- `prompts/content-one-shot-prompt.md`
- `src/llm/content-one-shot-generation.ts`

Quick generation must emit the same context fields as pipeline generation:

- `premiseSummary`
- `situationFrame`
- `worldState`

This removes the current asymmetry where quick packets are saved without meaningful origin or premise scaffolding.

### 3.3 Keep sparkstormer compact, but make it persistable

**Files**:

- `src/models/content-packet.ts`
- `src/llm/prompts/content-sparkstormer-prompt.ts`
- `src/llm/schemas/content-sparkstormer-schema.ts`
- `prompts/content-sparkstormer-prompt.md`

The spark contract can remain structurally small, but saved pipeline assets must persist the chosen sparks verbatim inside `origin.sourceArtifacts`.

No additional spark fields are required for this overhaul beyond:

- `sparkId`
- `contentKind`
- `spark`
- `imageSeed`
- `collisionTags`

---

## 4. Save Flow Redesign

### 4.1 The browser save call must send a complete asset candidate

**Files**:

- `public/js/src/11-content-packets.js`
- `src/server/routes/content-packets.ts`

When a generated packet is saved, the browser must send the full generated object, including new context fields and any source lineage payload returned by `/api/generate`.

The server save endpoint must reject incomplete packet payloads rather than silently narrowing them.

### 4.2 Artifact assembly must become explicit

**File**: `src/server/services/content-packet-artifact.ts`

Replace the current `createSavedContentPacketArtifact()` logic with a builder that:

- accepts the richer generated packet type,
- accepts generation-mode-specific lineage inputs,
- maps them into `SavedContentPacket`,
- validates `context` and `origin`,
- does not silently discard any required upstream data.

Recommended builder responsibilities:

1. validate the generated packet contract,
2. build `packet` projection,
3. build `context`,
4. build `origin.sourceArtifacts`,
5. attach evaluation,
6. stamp `assetVersion: 2`.

### 4.3 Evaluation remains attached to the saved asset

The evaluator can continue scoring the lean packet projection. Its result remains sibling metadata on the saved asset.

No redesign is required for evaluation semantics, only for what it attaches to.

---

## 5. Presenter and UI Changes

### 5.1 Split cards into context vs packet sections

**Files**:

- `src/server/presenters/content-packet-card.ts`
- `src/server/views/pages/content-packets.ejs`
- `public/js/src/11-content-packets.js`

The saved card view model should stop pretending all packet information is one flat registry.

Recommended view model structure:

```ts
export interface ContentPacketCardViewModel {
  readonly id: string;
  readonly pinned: boolean;
  readonly contextDetails: readonly ContentPacketCardDetail[];
  readonly packetDetails: readonly ContentPacketCardDetail[];
  readonly originDetails: readonly ContentPacketCardDetail[];
  readonly metaDetails: readonly ContentPacketCardDetail[];
}
```

Saved cards should display, in this order:

1. `Premise Summary`
2. `Situation Frame`
3. `World State`
4. canonical packet fields
5. origin/source artifacts
6. evaluation metadata

For pipeline packets, source artifacts should surface enough spark detail to audit where the packet came from.

For quick packets, source artifacts should surface the exemplar ideas that grounded the result.

### 5.2 Generated packet cards should preview the same asset semantics

Unsaved generated cards should already show the context block, not only the canonical packet block. The save preview and the persisted card should not change semantic shape after saving.

---

## 6. Route and API Contract Changes

### 6.1 `/content-packets/api/generate`

Return objects that already include:

- saved-asset context fields,
- lineage artifacts sufficient for a later save,
- packet card view models that reflect the new context-first presentation.

### 6.2 `/content-packets/api/:packetId/save`

Reject payloads unless they satisfy the new asset input contract.

This route must not:

- reconstruct missing context heuristically,
- accept old packet-only bodies,
- auto-upgrade legacy shapes,
- or infer source artifacts from IDs alone.

If the payload is incomplete, return a validation error.

---

## 7. Persistence and Legacy File Policy

### 7.1 New canonical saved asset shape

All saved files under `content-packets/` must conform to the new `SavedContentPacket` contract with:

- `assetVersion: 2`
- `context`
- `origin.sourceArtifacts`

### 7.2 Hard invalidation of old saved packet files

Existing content packet files that lack the new required fields are invalid. Do not add migration aliases or compatibility loading.

Policy:

1. On implementation, remove all existing `content-packets/*.json` files that do not satisfy the new contract.
2. The repository type guard should reject them.
3. The list/load paths should not attempt fallback parsing.

### 7.3 Rebuild-only exception

If a saved packet can be losslessly rebuilt from persisted source artifacts already available in the system, rebuilding is allowed.

Lossless rebuild means:

- the packet's context fields can be deterministically reconstructed from stored source generation output,
- the source artifacts are available in full text form,
- and the rebuilt asset is materially identical in semantic completeness to a freshly generated v2 asset.

If those conditions are not met, delete the old file.

Given the current architecture, most or all existing saved packets should be assumed non-rebuildable and removed.

---

## 8. Prompt Documentation Requirements

The prompt docs in `prompts/*` must be updated in the same pass as the implementation.

Required docs:

- `prompts/content-packeter-prompt.md`
- `prompts/content-one-shot-prompt.md`
- `prompts/content-sparkstormer-prompt.md`
- `prompts/content-evaluator-prompt.md`

Documentation must explicitly state:

- the difference between saved asset context and downstream packet projection,
- the meaning of `premiseSummary`, `situationFrame`, and `worldState`,
- that pipeline packets persist selected spark artifacts,
- that quick packets persist exemplar-derived source artifacts,
- and that old saved packet files are not compatible with the new architecture.

Also update any concept-stage prompt docs whose context tables describe content packets if the system now injects only the lean packet projection there.

---

## 9. Testing Requirements

### 9.1 Model and type-guard tests

Add or update tests for:

- new saved asset interfaces,
- `context` validation,
- `origin.sourceArtifacts` validation,
- rejection of legacy saved packet shapes,
- projection of saved asset → downstream packet.

### 9.2 Generation parser tests

Add parser tests for:

- packeter responses that include the new context fields,
- one-shot responses that include the new context fields,
- rejection when context fields are missing,
- rejection when source lineage is missing for pipeline packets.

### 9.3 Route tests

Add route tests for:

- generate responses returning context-aware cards,
- save route rejecting packet-only payloads,
- save route persisting `assetVersion: 2`,
- list route rejecting legacy on-disk packets instead of silently loading them.

### 9.4 Presenter/view tests

Add tests for:

- context fields rendering before packet fields,
- source artifact rendering,
- no flattening regression in generated packet previews and saved cards.

---

## 10. Implementation Plan

### Phase 1: Model and contract redesign

- Redefine saved asset interfaces
- Add context/origin models
- Add asset versioning
- Add validation/type guards

### Phase 2: Generation contract upgrades

- Expand one-shot schema/prompt/parser
- Expand packeter schema/prompt/parser
- Return lineage artifacts needed for save

### Phase 3: Save path and repository hardening

- Replace artifact builder
- Reject incomplete saves
- Reject legacy on-disk packet files

### Phase 4: UI restructuring

- Redesign presenter/view model
- Update server-rendered saved cards
- Update generated card preview UI

### Phase 5: Legacy invalidation

- Delete incompatible files under `content-packets/`
- Ensure repository/list operations only see v2 assets

### Phase 6: Prompt docs and tests

- Update `prompts/*`
- Add model, route, presenter, and parser coverage

---

## 11. Non-Goals

- Backfilling old packets through heuristic text extraction
- Keeping packet-only save payloads working
- Maintaining dual-read compatibility for old asset versions
- Adding speculative lineage types beyond exemplars and sparks in this pass

---

## 12. Acceptance Criteria

The overhaul is complete when all of the following are true:

1. A saved content packet is intelligible in isolation without consulting logs.
2. Quick and pipeline packets persist a common saved asset shape.
3. Pipeline packets preserve actual upstream spark text, not only spark IDs.
4. Quick packets preserve explicit origin artifacts derived from exemplar inputs.
5. The save route rejects old packet-only payloads.
6. The repository rejects old saved packet files.
7. Legacy content-packet JSON files that lack the new asset contract are removed.
8. Downstream concept prompts still receive a lean packet projection rather than the whole saved asset.
9. Prompt docs describe the new ownership and contract boundaries accurately.

