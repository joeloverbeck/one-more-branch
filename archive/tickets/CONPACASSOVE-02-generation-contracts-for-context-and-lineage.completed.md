# CONPACASSOVE-02: Expand generation contracts for context-rich packets and persistable lineage

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: Yes — one-shot and packeter generation contracts, prompt schemas, pipeline result shapes
**Deps**: `specs/content-packet-asset-overhaul.md`, `archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md`

## Problem

The LLM generation layer still emits packet bodies that are too narrow for persistence. Pipeline generation only surfaces `sourceSparkIds`, and one-shot generation emits no saved-asset context or explicit origin artifacts at all, so later save steps cannot persist intelligible assets without guessing.

## Assumption Reassessment (2026-03-19)

1. `CONPACASSOVE-01` has already landed the canonical saved-asset model in `src/models/saved-content-packet.ts`, and `src/server/services/content-packet-artifact.ts` now hard-fails until generation can supply explicit `context` and `origin` data. This ticket no longer needs to introduce those saved-asset types; it needs to make generation produce data that can populate them.
2. `src/models/content-packet.ts` still treats generation results mostly as lean downstream packet projections. `ContentPacketerPacket` currently adds only `sourceSparkIds`, and one-shot generation still returns plain `ContentPacket[]`.
3. `src/llm/content-packeter-generation.ts` currently requires `sourceSparkIds` but not `premiseSummary`, `situationFrame`, or `worldState`. `src/llm/content-one-shot-generation.ts` currently parses only canonical packet fields, so quick generation still has no explicit saved-asset context contract.
4. `src/server/services/content-service.ts` and `src/server/routes/content-packets.ts` still surface generation results as lean packet arrays. That is now the real contract gap: `/api/generate` cannot hand the browser a complete asset candidate yet.
5. Spark generation is already close to the desired architecture. `ContentSpark` and the sparkstormer parser already preserve `sparkId`, `contentKind`, `spark`, `imageSeed`, and `collisionTags`; this ticket should verify and preserve that contract rather than redesign it.
6. `prompts/content-packeter-prompt.md` and `prompts/content-one-shot-prompt.md` still document plain canonical packet output, so the docs and runtime contracts are aligned on the wrong shape. `prompts/content-sparkstormer-prompt.md` also contains stale enum documentation that should be corrected while touching prompt docs.

## Architecture Check

1. The generation layer should emit a complete save-ready candidate shape, because that is the last place where full lineage and context are still available without reconstruction.
2. No compatibility shim should let old packet-only generation outputs continue through parsing. Missing context or missing pipeline lineage must remain hard failures.
3. `/api/generate` should surface save-ready generated objects directly once this ticket lands, even if the save endpoint still rejects them until `CONPACASSOVE-03` wires explicit asset assembly. That keeps responsibilities clean: generation owns generation-time context and lineage, while save owns validation and persistence.

## What to Change

### 1. Expand packeter output

Update the packeter prompt, schema, and parser so each generated packet includes:

- `premiseSummary`
- `situationFrame`
- `worldState`
- optional `viewpointPressure`
- `sourceSparkIds`

Ensure parser failures are explicit when any required context field or pipeline lineage is missing.

### 2. Expand one-shot output and introduce a real generated-packet contract

Update the one-shot prompt, schema, and parser so quick generation emits the same context block as pipeline generation.

Do not keep pretending the save-ready generation result is the same thing as the lean downstream `ContentPacket`. Introduce an explicit generated-packet result shape that:

- preserves the canonical packet projection,
- carries nested `context`,
- carries nested `origin`,
- and can be returned by the service/route layer without save-time reconstruction.

The LLM-facing contract may stay flat if that keeps prompts simpler, but the service boundary should expose one canonical generated asset-candidate shape.

### 3. Keep spark data compact but save-ready

Keep the sparkstormer contract minimal, but ensure generation results retain the spark fields needed for `origin.sourceArtifacts`:

- `sparkId`
- `contentKind`
- `spark`
- `imageSeed`
- `collisionTags`

No new spark fields are required in this pass unless a bug is discovered; the main requirement is to preserve and consume the existing fields without loss.

### 4. Update service-facing generation result plumbing

Update generation result types and service/route adapters so `/api/generate` returns save-ready generated packet objects instead of canonical packet-only projections. Packet cards may still render from the lean projection in this pass, but the raw generated objects returned to the browser must include the context and origin data needed by the later save flow.

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/models/saved-content-packet.ts` (modify as needed to share generation-facing subtypes without duplicating contracts)
- `src/llm/content-packeter-generation.ts` (modify)
- `src/llm/content-one-shot-generation.ts` (modify)
- `src/llm/prompts/content-packeter-prompt.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `src/llm/schemas/content-packeter-schema.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `prompts/content-sparkstormer-prompt.md` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/llm/content-sparkstormer.test.ts` (modify only if needed to lock existing spark invariants)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)

## Out of Scope

- Save route validation or artifact assembly
- Persistence repository hardening or on-disk cleanup
- Saved card presenter and EJS layout changes
- Client-side save submission changes beyond any passive fallout from richer `/api/generate` payloads
- Concept-stage prompt updates outside any type fallout required to compile

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/content-packeter.test.ts` proves packeter parsing accepts packets with context fields and rejects packets missing `premiseSummary`, `situationFrame`, `worldState`, or `sourceSparkIds`.
2. `test/unit/llm/content-one-shot.test.ts` proves one-shot parsing now requires the same context fields as pipeline generation.
3. `test/unit/server/services/content-service.test.ts` proves quick and pipeline generation results are returned as explicit generated asset candidates with nested `context` and `origin`, while still preserving enough source data for later save-time origin artifact construction.
4. `test/unit/server/routes/content-packets-routes.test.ts` proves `/api/generate` returns the richer generated packet objects in both quick and pipeline modes while still rendering packet cards from the lean projection.
5. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts`

### Invariants

1. Downstream evaluator and concept stages still receive the lean canonical packet fields they expect, not the full saved asset.
2. Pipeline generation never drops selected spark text, image metadata, or collision tags before the save flow has a chance to persist them.
3. Quick generation origin artifacts are derived explicitly from exemplar inputs at generation time rather than reconstructed later from route-local state.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-packeter.test.ts` — add schema, prompt, and parser coverage for context-rich packets and required spark lineage.
2. `test/unit/llm/content-one-shot.test.ts` — add parser coverage for quick packets with required context fields.
3. `test/unit/llm/content-sparkstormer.test.ts` — verify required spark fields remain available for persisted source artifacts and are not narrowed away.
4. `test/unit/server/services/content-service.test.ts` — verify service result plumbing materializes canonical generated packet candidates in both modes.
5. `test/unit/server/routes/content-packets-routes.test.ts` — verify `/api/generate` returns rich generated packet payloads without changing packet-card rendering inputs.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completion date: 2026-03-19
- What changed:
  - Added explicit generation-time context fields to packeter and one-shot prompt/schema/parser contracts.
  - Introduced a canonical `GeneratedContentPacket` service/route shape with nested `packet`, `context`, and `origin`, while keeping `ContentPacket` as the lean downstream projection.
  - Materialized quick-mode exemplar lineage and pipeline spark lineage into explicit `origin.sourceArtifacts` at the service boundary, so `/content-packets/api/generate` now returns save-ready asset candidates instead of packet-only bodies.
  - Updated prompt docs to describe the new ownership boundary accurately and corrected stale sparkstormer enum documentation.
  - Updated route tests to reflect the current explicit save-route failure until `CONPACASSOVE-03` wires asset assembly.
- Deviations from the original plan:
  - Sparkstormer runtime code did not need structural changes; it already preserved the required save-time fields. This pass kept that contract and documented/tested it instead of redesigning it.
  - The save endpoint remained out of scope and intentionally blocked. This ticket stopped at generation and `/api/generate` contract readiness rather than partially implementing asset persistence.
- Verification results:
  - `npm run test:unit -- --runTestsByPath test/unit/llm/content-packeter.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts`
  - `npm run typecheck`
  - `npm run lint`
