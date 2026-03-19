# CONPACASSOVE-08: Rename the lean content-packet projection contract

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/specs/content-packet-asset-overhaul.completed.md`, `archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md`, `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md`, `archive/tickets/CONPACASSOVE-06-prompt-docs-and-downstream-contract-audit.completed.md`

## Problem

The architecture now correctly separates the richer saved asset from the lean downstream projection, but the type name still leaks the old mental model. `ContentPacket` is no longer the canonical saved artifact; it is the projection consumed by concept-stage prompts and evaluators. Keeping the old name makes the codebase read as if the projection were still the core asset, which invites future contract drift, prompt confusion, and wrong abstractions at extension points.

This is no longer just a docs issue. The naming contract itself is stale.

## Assumption Reassessment (2026-03-19)

1. `src/models/content-packet.ts` currently defines `ContentPacket` as the lean projection and also houses generation-time packet variants (`ContentOneShotPacket`, `ContentPacketerPacket`) plus helpers like `projectContentPacket(...)`.
2. The richer persisted asset already lives separately in `src/models/saved-content-packet.ts` as `SavedContentPacket { packet, context, origin, evaluation? }`, so the intended ownership boundary is already implemented.
3. Current prompt docs and prompt-builder TypeScript both explicitly describe downstream `ContentPacket[]` values as lean projections, which confirms the real architectural meaning has changed even though the type name has not.
4. The rename was explicitly deferred in [CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md](/home/joeloverbeck/projects/one-more-branch/archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md). That deferment was reasonable then, but continuing to defer it now would preserve a misleading core contract name.
5. The rename surface is broad but still bounded: model types, projection helpers, generation parsers, concept-generator contexts, prompt builders/tests, route/service/presenter code, and prompt markdown/spec references. This is a contract cleanup, not a storage migration.
6. The current code does not use separate runtime aliases for the lean projection. The rename must therefore be a direct replacement at the type/helper boundary, not an additive layer.

## Architecture Check

1. Renaming the lean projection to a projection-specific type such as `ConceptSeedPacket` is cleaner because it makes ownership explicit in code, not just in comments and docs.
2. The rename should be comprehensive at the contract boundary. Do not introduce aliases like `type ContentPacket = ConceptSeedPacket` or dual helper names such as keeping both `projectContentPacket()` and `projectConceptSeedPacket()`. That would preserve ambiguity instead of removing it.
3. Generation-only packet types should continue to model flat LLM output, but their inheritance and naming should read as “generation result extends projection plus context/lineage,” not as “everything is a content packet.”
4. Saved-asset contracts (`SavedContentPacket`, `ContentPacketContext`, `ContentPacketOrigin`) remain valid. The rename should clarify that the `packet` field on the saved asset holds a projection object, not invent a new saved-asset shape.
5. This rename is beneficial relative to the current architecture because the current name encodes the wrong ownership boundary. The projection is the concept-stage seed object, while the saved asset is the canonical persisted packet artifact. Keeping `ContentPacket` as the projection name makes extensions harder to reason about because the narrower projection appears more foundational than the richer asset.
6. This ticket should remain a naming-boundary cleanup. It should not collapse the existing saved asset and projection models, and it should not rename product-language surfaces like route names, repository names, or UI copy unless those surfaces are directly asserting the wrong type contract.

## What to Change

### 1. Rename the projection type and helper surface

In `src/models/content-packet.ts`:

- rename `ContentPacket` to `ConceptSeedPacket`
- rename `ContentPacketProjectionSource` to `ConceptSeedPacketProjectionSource`
- rename `projectContentPacket(...)` to `projectConceptSeedPacket(...)`
- rename `cloneContentPacket(...)` to `cloneConceptSeedPacket(...)`
- rename `isContentPacket(...)` to `isConceptSeedPacket(...)`

Keep the actual shape unchanged in this ticket unless a clearer field-level contract issue is discovered. This is a naming/ownership correction, not another payload redesign.

### 2. Rename dependent generation and saved-asset contracts

Update nearby derived types so their semantics stay coherent:

- `ContentOneShotPacket` should become a projection-based generation type name
- `ContentPacketerPacket` should become a projection-based generation type name
- `GeneratedContentPacket.packet` should point to `ConceptSeedPacket`
- `SavedContentPacket.packet` should point to `ConceptSeedPacket`
- `projectSavedContentPacket(...)` should become a projection-specific helper name

The exact names should stay crisp and role-based. Favor architectural clarity over preserving old vocabulary.

### 3. Update downstream consumers comprehensively

Rename all concept-stage contexts and consumers that currently reference `ContentPacket[]` so the boundary is explicit across:

- `src/models/concept-generator.ts`
- generation parsers that emit or validate projection-based packets
- prompt builders in `src/llm/prompts/`
- services, presenters, routes, and repositories that operate on the projection
- all directly related unit tests and fixtures

The implementation must remove the old projection terminology from active code in the touched boundary rather than leaving mixed naming behind.

### 4. Update prompt docs and spec references in the same pass

Any prompt markdown or active ticket/spec text that still references the lean projection as `ContentPacket` should be updated in the same implementation pass so code and docs stay aligned.

This includes:

- `prompts/content-*.md` and `prompts/concept-*.md` files that describe downstream projection inputs
- any active ticket/spec references created while this rename was deferred

## Files to Touch

- `src/models/content-packet.ts` (modify)
- `src/models/saved-content-packet.ts` (modify)
- `src/models/concept-generator.ts` (modify)
- `src/models/index.ts` (modify)
- `src/llm/content-packeter-generation.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/server/services/content-packet-artifact.ts` (modify)
- `src/server/presenters/content-packet-card.ts` (modify)
- `src/server/routes/content-packets.ts` (modify if imports/types change)
- `src/llm/prompts/concept-seeder-prompt.ts` (modify)
- `src/llm/prompts/concept-architect-prompt.ts` (modify)
- `src/llm/prompts/concept-engineer-prompt.ts` (modify)
- `src/llm/prompts/concept-evolver-seeder-prompt.ts` (modify)
- `src/llm/prompts/concept-scenario-prompt.ts` (modify)
- `src/llm/prompts/concept-specificity-prompt.ts` (modify)
- `src/llm/prompts/concept-stress-tester-prompt.ts` (modify)
- `src/llm/prompts/content-evaluator-prompt.ts` (modify if type wording appears)
- `prompts/content-packeter-prompt.md` (modify)
- `prompts/content-one-shot-prompt.md` (modify)
- `prompts/content-evaluator-prompt.md` (modify)
- `prompts/concept-seeder-prompt.md` (modify)
- `prompts/concept-architect-prompt.md` (modify)
- `prompts/concept-engineer-prompt.md` (modify)
- `prompts/concept-evolver-seeder-prompt.md` (modify)
- `prompts/concept-scenario-prompt.md` (modify)
- `prompts/concept-specificity-prompt.md` (modify)
- `prompts/concept-stress-tester-prompt.md` (modify)
- `prompts/concept-evaluator-prompt.md` (modify)
- `test/unit/models/content-packet.test.ts` (modify)
- `test/unit/models/saved-content-packet.test.ts` (modify)
- `test/unit/llm/content-packeter.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/server/services/content-packet-artifact.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/llm/content-evaluator.test.ts` (modify if prompt wording changes)
- `test/unit/llm/content-one-shot.test.ts` (modify if renamed generation packet types are asserted directly)
- `test/unit/llm/prompts/concept-seeder-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-architect-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-engineer-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts` (modify)
- `test/unit/llm/prompts/concept-verifier-prompt.test.ts` (modify if prompt type imports change)
- `test/unit/llm/concept-evolver.test.ts` (modify)
- `test/unit/llm/concept-architect.test.ts` (modify if concept-stage fixtures import the projection type)
- `test/unit/llm/concept-engineer.test.ts` (modify if concept-stage fixtures import the projection type)
- `test/unit/llm/concept-evolver-seeder.test.ts` (modify if concept-stage fixtures import the projection type)
- `test/unit/llm/concept-seeder.test.ts` (modify if concept-stage fixtures import the projection type)
- `test/unit/llm/concept-verifier.test.ts` (modify)
- `test/unit/llm/concept-stress-tester.test.ts` (modify)

## Out of Scope

- Another redesign of the saved asset payload
- Another change to context/origin/evaluation field shapes
- Introducing compatibility aliases, transitional typedefs, or dual export names
- Renaming unrelated “content packet” strings used in user-facing copy where the term still makes sense as product language

## Acceptance Criteria

### Tests That Must Pass

1. Active code no longer uses `ContentPacket` as the lean projection type name in the renamed boundary; the projection contract has a projection-specific name.
2. Saved-asset APIs still expose `SavedContentPacket.packet` as the lean downstream projection object, but with the new explicit projection type.
3. Concept-stage prompt builders and contexts compile and continue to consume the projection contract without behavioral regressions.
4. Prompt docs that describe downstream injection use the new projection terminology consistently.
5. Existing suites:
   - `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/llm/content-packeter.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-architect.test.ts test/unit/llm/concept-engineer.test.ts test/unit/llm/concept-evolver-seeder.test.ts test/unit/llm/concept-seeder.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`

### Invariants

1. The richer saved asset remains distinct from the lean downstream projection in both shape and naming.
2. No alias exports or backwards-compatibility shims are introduced for the old projection contract names.
3. Projection helper names, context field types, and prompt docs all describe the same ownership model.
4. `SavedContentPacket` remains the persisted asset name for now; this ticket only makes the `packet` payload type explicit.

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-packet.test.ts` — rename helper/type assertions so the canonical projection API is tested under the new contract names.
2. `test/unit/models/saved-content-packet.test.ts` — verify saved assets still validate and project correctly through the renamed projection helper surface.
3. `test/unit/llm/content-packeter.test.ts` — verify the pipeline parser still accepts generation packets whose projection base type has been renamed.
4. `test/unit/server/services/content-service.test.ts` — ensure generation services still materialize projection payloads correctly after the rename.
5. `test/unit/server/services/content-packet-artifact.test.ts` — ensure artifact creation still persists the renamed projection contract inside the saved asset.
6. `test/unit/server/presenters/content-packet-card.test.ts` — ensure presenters still render saved/generated packets from the renamed projection contract.
7. `test/unit/server/routes/content-packets-routes.test.ts` — ensure route fixtures and save/list behavior still align with the renamed projection contract.
8. `test/unit/llm/prompts/concept-seeder-prompt.test.ts` — update prompt-grounding tests so concept seeding still consumes only the lean projection contract.
9. `test/unit/llm/prompts/concept-architect-prompt.test.ts` — same rationale for architect grounding.
10. `test/unit/llm/prompts/concept-engineer-prompt.test.ts` — same rationale for engineer grounding.
11. `test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts` — same rationale for evolver grounding.
12. `test/unit/llm/prompts/concept-verifier-prompt.test.ts` — cover the verifier prompt surface because it also consumes the lean projection contract.
13. `test/unit/llm/concept-architect.test.ts` — update runtime concept-architect fixtures/types if imports shift to the renamed projection contract.
14. `test/unit/llm/concept-engineer.test.ts` — update runtime concept-engineer fixtures/types if imports shift to the renamed projection contract.
15. `test/unit/llm/concept-evolver-seeder.test.ts` — update runtime evolver-seeder fixtures/types if imports shift to the renamed projection contract.
16. `test/unit/llm/concept-seeder.test.ts` — update runtime concept-seeder fixtures/types if imports shift to the renamed projection contract.
17. `test/unit/llm/concept-evolver.test.ts` — update integration-level concept evolution fixtures/types to the renamed projection contract.
18. `test/unit/llm/concept-verifier.test.ts` — update verifier fixtures/types to the renamed projection contract.
19. `test/unit/llm/concept-stress-tester.test.ts` — update hardening fixtures/types to the renamed projection contract.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`
1. `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/llm/content-packeter.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-architect.test.ts test/unit/llm/concept-engineer.test.ts test/unit/llm/concept-evolver-seeder.test.ts test/unit/llm/concept-seeder.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completed on 2026-03-19.
- Renamed the lean downstream projection contract from `ContentPacket` to `ConceptSeedPacket`, including projection helpers, concept-stage context fields (`conceptSeedPackets`), generation packet type names, and related prompt-builder/test usage.
- Updated prompt markdown so active contract docs now use `ConceptSeedPacket` / `conceptSeedPackets` terminology consistently.
- Strengthened tests with direct clone/projection coverage for the renamed helper surface and parser typing coverage for the renamed packeter result.
- Deliberate deviation from the broader possible rename surface: storage/repository/route/module file names such as `content-packet.ts`, `content-packets` routes, and `SavedContentPacket` remained unchanged because they still describe the persisted asset/product surface and renaming them was not necessary to fix the projection-boundary ambiguity.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/models/content-packet.test.ts test/unit/models/saved-content-packet.test.ts test/unit/llm/content-packeter.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`
  - `npm run typecheck`
  - `npm run lint`
