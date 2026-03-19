# CONPACASSOVE-07: Make quick-packet exemplar lineage explicit instead of all-exemplar attachment

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — quick-generation contract, service lineage assembly, save-ready lineage semantics
**Deps**: `specs/content-packet-asset-overhaul.md`, `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md`, `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md`

## Problem

Quick generation currently returns complete saved-asset candidates, but each generated packet inherits all input exemplars as `origin.sourceArtifacts`. That is lossless, but not semantically precise. It weakens lineage auditability because a saved quick packet cannot distinguish between exemplars that materially shaped that packet and exemplars that were merely present in the request.

If we want quick-mode lineage to remain inspectable and extensible long-term, exemplar ownership must become explicit in the generation contract rather than being inferred or bulk-attached at the service boundary.

## Assumption Reassessment (2026-03-19)

1. `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md` correctly moved `/content-packets/api/generate` to a canonical generated-asset-candidate shape with nested `packet`, `context`, and `origin`.
2. In the current implementation, quick-mode origin artifacts are assembled in `src/server/services/content-service.ts` from the full `exemplarIdeas` array, so every quick-generated packet currently carries the same exemplar lineage set.
3. `tickets/CONPACASSOVE-03-save-route-and-artifact-builder-hardening.md` owns save-time validation and persistence, but its scope intentionally excludes LLM prompt/schema redesign. Corrected scope: this ticket, not `CONPACASSOVE-03`, owns any refinement that requires explicit per-packet quick lineage selection.

## Architecture Check

1. Exemplar selectivity belongs in generation because generation is the only stage that still knows which packet was actually derived from which upstream idea. Save-time code should persist declared lineage, not guess at it.
2. A dedicated quick-lineage contract is cleaner than heuristic matching in the service or save route. It keeps ownership single-source and avoids embedding fuzzy attribution logic in persistence code.
3. No backwards-compatibility aliasing should be introduced. Once explicit quick-lineage selection lands, quick packets should emit one canonical lineage model.

## What to Change

### 1. Extend the quick-generation contract with explicit exemplar references

Update the one-shot prompt, schema, and parser so each quick-generated packet includes explicit lineage references to the exemplar ideas that materially informed it.

Recommended shape:

- `sourceExemplarIds: string[]` on the LLM-facing quick packet contract

Recommended request discipline:

- the prompt should enumerate input exemplars with stable IDs
- each generated packet should cite one or more contributing exemplar IDs
- the contract should reject packets with empty `sourceExemplarIds`

The goal is explicit selection, not heuristic similarity scoring.

### 2. Materialize precise quick origin artifacts at the service boundary

Update quick-generation service assembly so `origin.sourceArtifacts` is built only from the cited exemplars for each packet rather than from the full request exemplar list.

This should remain a deterministic mapping:

1. parser validates `sourceExemplarIds`
2. service maps those IDs to the input exemplar registry
3. `origin.sourceArtifacts` is built from the selected exemplars only

### 3. Preserve pipeline/quick symmetry without forcing fake spark semantics

Do not make quick generation masquerade as spark-driven pipeline output. Quick lineage should remain exemplar-based, but it should be as explicit and auditable as pipeline spark lineage.

That means:

- quick packets persist selected exemplars
- pipeline packets persist selected sparks
- both modes continue returning the same top-level generated asset-candidate shape

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/llm/content-one-shot-generation.ts` (modify)
- `src/llm/prompts/content-one-shot-prompt.ts` (modify)
- `src/llm/schemas/content-one-shot-schema.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `test/unit/llm/content-one-shot.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify if API payload assertions need the narrower exemplar lineage)

## Out of Scope

- Save-route validation or repository persistence logic
- Card rendering/layout changes
- Heuristic NLP matching between packet text and exemplar text
- Adding new lineage artifact kinds beyond `EXEMPLAR` and `SPARK`

## Acceptance Criteria

### Tests That Must Pass

1. `test/unit/llm/content-one-shot.test.ts` proves quick packets require explicit `sourceExemplarIds` and reject missing or empty lineage references.
2. `test/unit/server/services/content-service.test.ts` proves quick generated asset candidates persist only the cited exemplars in `origin.sourceArtifacts`, not the full exemplar input set.
3. `test/unit/server/routes/content-packets-routes.test.ts` continues to prove `/content-packets/api/generate` returns rich generated objects, now with narrowed quick exemplar lineage.
4. Existing suite: `npm run test:unit -- --runTestsByPath test/unit/llm/content-one-shot.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts`

### Invariants

1. Quick-packet lineage is owned by generation and is explicit per packet; it is never guessed at save time.
2. The service boundary continues to expose one canonical generated asset-candidate shape for both quick and pipeline modes.
3. Quick lineage stays complete enough for auditability while remaining semantically narrower than “all exemplars in the request”.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/content-one-shot.test.ts` — enforce explicit per-packet quick lineage references.
2. `test/unit/server/services/content-service.test.ts` — prove quick source artifact mapping uses only selected exemplars.
3. `test/unit/server/routes/content-packets-routes.test.ts` — keep API contract coverage aligned with the refined quick lineage semantics.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/llm/content-one-shot.test.ts test/unit/server/services/content-service.test.ts test/unit/server/routes/content-packets-routes.test.ts`
2. `npm run typecheck`
3. `npm run lint`
