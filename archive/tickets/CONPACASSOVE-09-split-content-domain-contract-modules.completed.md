# CONPACASSOVE-09: Split content domain contract modules by ownership

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Large
**Engine Changes**: None
**Deps**: `archive/tickets/CONPACASSOVE-08-rename-content-packet-projection-contract.completed.md`, `archive/tickets/CONPACASSOVE-01-saved-asset-model-and-projection-boundary.completed.md`, `archive/tickets/CONPACASSOVE-02-generation-contracts-for-context-and-lineage.completed.md`

## Problem

`src/models/content-packet.ts` is still acting as a mixed-ownership god module. It now exports the lean concept-stage projection (`ConceptSeedPacket`), generation packet variants, content taxonomy enums, evaluation contracts, taste-profile contracts, spark contracts, and generation/evaluator context/result shapes from one file whose path still says `content-packet`.

That architecture is no longer coherent. The projection contract was renamed in CONPACASSOVE-08, but the module/file boundary still encodes the old mental model and still forces unrelated subdomains to move together. This increases extension risk because changes to concept-seed packet semantics, content generation semantics, and content taxonomy all appear to belong to the same module even when they do not.

## Assumption Reassessment (2026-03-19)

1. `src/models/content-packet.ts` currently contains projection contracts (`ConceptSeedPacket`), generation packet contracts (`ConceptSeedOneShotLineagedPacket`, `ConceptSeedPacketerPacket`), packet cloning/projection helpers, content taxonomy enums, taste-profile types, spark types, and evaluator context/result types in one file.
2. `src/models/index.ts` currently re-exports this entire mixed surface from `./content-packet`, which means downstream files continue to import from a path that no longer describes most of what they consume.
3. The current codebase already removed backwards-compatibility aliases for the old projection names in CONPACASSOVE-08, so there is no justified reason to keep the file/module boundary ambiguous now.
4. The internal saved asset still lives separately in `src/models/saved-content-packet.ts`, so this ticket should not collapse persisted asset contracts back into the projection module.
5. The current module split is mismatched with actual ownership:
   - concept-stage projection and projection helpers are one concern
   - generation transport/context/origin/evaluation contracts are another
   - taxonomy constants/guards are foundational shared content-domain primitives
6. Corrected scope: this ticket should be a module-boundary refactor and import migration, not a payload-shape redesign.

## Architecture Check

1. Splitting `content-packet.ts` by ownership is cleaner than doing another file rename in place because the current file is not just badly named; it is structurally overloaded. A simple rename would preserve the god-module problem.
2. The clean split is:
   - a projection-focused module for the lean concept projection and its projection helpers
   - a taxonomy module for shared enums/guards/constants
   - a generation-contract module for taste/spark/context/origin/one-shot/packeter/evaluator request-result shapes
3. `ConceptSeedOneShotPacket`, `ConceptSeedOneShotLineagedPacket`, `ConceptSeedPacketerPacket`, `GeneratedContentPacket`, `ContentPacketContext`, `ContentPacketOrigin`, `ContentPacketSourceArtifact`, and the related clone/guard helpers should live with generation contracts, not with the lean projection module, because they are generation-stage transport or service-layer contracts rather than projection ownership.
4. This is more robust than leaving all content-domain contracts in one file because downstream imports become explicit about which subdomain they depend on, which reduces accidental coupling and makes later changes safer.
5. No backwards-compatibility shims, alias paths, or duplicate exports should be introduced. Old module paths should be removed once imports are migrated.

## What to Change

### 1. Split `src/models/content-packet.ts` into focused modules

Create ownership-based modules under `src/models/`:

- `content-taxonomy.ts`
  - `CONTENT_KIND_VALUES`, `ContentKind`, `isContentKind`
  - `CONTENT_PACKET_ROLE_VALUES`, `ContentPacketRole`, `isContentPacketRole`
  - `RISK_APPETITE_VALUES`, `RiskAppetite`, `isRiskAppetite`
- `concept-seed-packet.ts`
  - `ConceptSeedPacket`
  - `ConceptSeedPacketProjectionSource`
  - `cloneConceptSeedPacket(...)`
  - `projectConceptSeedPacket(...)`
  - `isConceptSeedPacket(...)`
  - projection helpers specific to the lean concept-stage projection
- `content-generation-contracts.ts`
  - `TasteProfile`
  - `ContentSpark`
  - `ContentPacketContext`
  - `ContentPacketSourceArtifact`
  - `ContentPacketOrigin`
  - `cloneContentPacketContext(...)`
  - `cloneContentPacketOrigin(...)`
  - `isContentPacketContext(...)`
  - `isContentPacketSourceArtifact(...)`
  - `isContentPacketOrigin(...)`
  - `ConceptSeedOneShotPacket`
  - `ConceptSeedOneShotLineagedPacket`
  - `ConceptSeedPacketerPacket`
  - `GeneratedContentPacket`
  - `isGeneratedContentPacket(...)`
  - `ContentEvaluationScores`
  - `ContentEvaluation`
  - `TasteDistillerContext/Result`
  - `SparkstormerContext/Result`
  - `ContentOneShotContext/Result`
  - `ContentPacketerContext/Result`
  - `ContentEvaluatorContext/Result`
  - `formatContentExemplarId(...)`

If a slightly different final split reads cleaner after inspection, prefer the cleaner ownership boundary, but do not leave projection, taxonomy, and generation contracts collapsed into one file.

### 2. Migrate imports to the new module boundaries

Update direct imports throughout:

- `src/models/*.ts`
- `src/llm/**/*.ts`
- `src/server/**/*.ts`
- `test/**/*.ts`

Rules:

- files that only use taxonomy primitives should import from `content-taxonomy.ts`
- files that use only concept-stage projection contracts/helpers should import from `concept-seed-packet.ts`
- files that use generation request/result contracts should import from `content-generation-contracts.ts`
- `src/models/index.ts` should re-export from the new focused modules rather than from a monolith

### 3. Delete the old god module after migration

- remove `src/models/content-packet.ts` entirely once all imports are migrated
- do not leave a forwarding file or alias export behind

### 4. Reassess test ownership and add a focused module-boundary test if needed

If current tests only validate behavior and not boundary assumptions, add one narrow unit test that guards the projection helper surface in its new dedicated module. Avoid redundant tests if existing coverage already exercises the moved behavior sufficiently.

## Files to Touch

- `src/models/content-taxonomy.ts` (new)
- `src/models/concept-seed-packet.ts` (new)
- `src/models/content-generation-contracts.ts` (new)
- `src/models/index.ts` (modify)
- `src/models/content-packet.ts` (delete)
- `src/models/saved-content-packet.ts` (modify)
- `src/models/concept-generator.ts` (modify if imports shift)
- `src/llm/**/*.ts` (modify, targeted to actual import sites)
- `src/server/**/*.ts` (modify, targeted to actual import sites)
- `test/**/*.ts` (modify, targeted to actual import sites)

## Out of Scope

- Renaming persisted-asset repository/service/route module names
- Changing any packet/context/origin/evaluation payload shapes
- Renaming user-facing route paths or product copy
- Introducing compatibility re-export files for deleted module paths

## Acceptance Criteria

### Tests That Must Pass

1. No active code imports from `src/models/content-packet.ts`; the file has been removed.
2. Projection helpers and projection validation now live in a dedicated module whose path matches their ownership.
3. Generation request/result contracts and taxonomy primitives compile cleanly from their dedicated modules without behavior changes.
4. Existing suites:
   - `npm run test:unit -- --runTestsByPath test/unit/models/content-taxonomy.test.ts test/unit/models/concept-seed-packet.test.ts test/unit/models/content-generation-contracts.test.ts test/unit/models/saved-content-packet.test.ts test/unit/models/index.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-packeter.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-taste-distiller.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`

### Invariants

1. The concept-stage projection remains distinct from the persisted saved asset in both naming and module ownership.
2. No alias exports, forwarding files, or transitional typedefs preserve the deleted `content-packet.ts` path.
3. Shared taxonomy primitives remain single-source-of-truth rather than duplicated across new modules.

## Test Plan

### New/Modified Tests

1. `test/unit/models/content-taxonomy.test.ts` — guard the shared taxonomy enums and validators in their dedicated module.
2. `test/unit/models/concept-seed-packet.test.ts` — keep lean projection helper coverage attached to the dedicated projection module.
3. `test/unit/models/content-generation-contracts.test.ts` — cover moved generation-context/origin/evaluation helper behavior in the dedicated generation-contract module.
4. `test/unit/models/saved-content-packet.test.ts` — ensure saved-asset validation still composes correctly with the moved projection helpers and no longer owns unrelated generation validation.
5. `test/unit/models/index.test.ts` — ensure the models barrel still re-exports the expected content-domain surface after the split.
6. `test/unit/llm/content-one-shot.test.ts`, `test/unit/llm/content-packeter.test.ts`, `test/unit/llm/content-evaluator.test.ts`, `test/unit/llm/content-sparkstormer.test.ts`, and `test/unit/llm/content-taste-distiller.test.ts` — ensure the direct generation-module consumers still compile and validate against the extracted contracts.
7. `test/unit/server/services/content-service.test.ts` and `test/unit/server/services/content-packet-artifact.test.ts` — ensure service composition still works when imports are split across focused modules.
8. `test/unit/llm/prompts/concept-*.test.ts` and verifier/evolver/stress tests — ensure concept-stage consumers still compile and render from the dedicated projection module.

### Commands

1. `npm run test:unit -- --runTestsByPath test/unit/models/content-taxonomy.test.ts test/unit/models/concept-seed-packet.test.ts test/unit/models/content-generation-contracts.test.ts test/unit/models/saved-content-packet.test.ts test/unit/models/index.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-packeter.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-taste-distiller.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`
2. `npm run typecheck`
3. `npm run lint`

## Outcome

- Completed on 2026-03-19.
- Replaced the monolithic `src/models/content-packet.ts` with three focused modules: `content-taxonomy.ts`, `concept-seed-packet.ts`, and `content-generation-contracts.ts`.
- Migrated direct imports in models, LLM generation/prompt code, server services/presenters, and tests to the new ownership-based modules.
- Removed generation-domain validation leakage from `saved-content-packet.ts` by moving `isContentEvaluation(...)` and the context/origin/source-artifact guards into `content-generation-contracts.ts`.
- Tightened test ownership beyond the original plan by splitting the old mixed model test into dedicated taxonomy, concept-seed, and generation-contract test files.
- Verification:
  - `npm run test:unit -- --runTestsByPath test/unit/models/content-taxonomy.test.ts test/unit/models/concept-seed-packet.test.ts test/unit/models/content-generation-contracts.test.ts test/unit/models/saved-content-packet.test.ts test/unit/models/index.test.ts test/unit/llm/content-one-shot.test.ts test/unit/llm/content-packeter.test.ts test/unit/llm/content-evaluator.test.ts test/unit/llm/content-sparkstormer.test.ts test/unit/llm/content-taste-distiller.test.ts test/unit/server/services/content-service.test.ts test/unit/server/services/content-packet-artifact.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/routes/content-packets-routes.test.ts test/unit/llm/prompts/concept-seeder-prompt.test.ts test/unit/llm/prompts/concept-architect-prompt.test.ts test/unit/llm/prompts/concept-engineer-prompt.test.ts test/unit/llm/prompts/concept-evolver-seeder-prompt.test.ts test/unit/llm/prompts/concept-verifier-prompt.test.ts test/unit/llm/concept-evolver.test.ts test/unit/llm/concept-verifier.test.ts test/unit/llm/concept-stress-tester.test.ts`
  - `npm run typecheck`
  - `npm run lint`
