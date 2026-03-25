# CONPACCLEAN-001: Remove one-shot content generation path

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — content service, content generation contracts, route handler, client JS
**Deps**: None

## Problem

The content-packets surface currently supports two mutually exclusive architectures:

1. a one-shot generation path
2. the staged pipeline (`taste distiller -> sparkstormer -> packeter -> evaluator`)

The codebase, saved-packet contract, progress UI, and evaluation UX all now center the staged pipeline. The one-shot path is still wired through the route, service, prompt/schema stack, and UI checkbox, but it adds a second content-generation contract that the rest of the architecture no longer benefits from carrying. Keeping both paths increases maintenance cost, multiplies test fixtures, and weakens the domain model by allowing two provenance modes (`quick` and `pipeline`) plus two source-artifact types (`EXEMPLAR` and `SPARK`) for the same feature.

## Assumption Reassessment (2026-03-25)

1. `src/server/services/content-service.ts` has two paths: `generateContentQuick` (one-shot) and `generateContentPipeline` — confirmed at lines 229-258 vs 260-322.
2. `src/server/routes/content-packets.ts` branches on `body.pipeline` (line 108) — confirmed.
3. `ConceptSeedPacketerPacket extends ConceptSeedOneShotPacket` (line 60 of `content-generation-contracts.ts`) — removing `ConceptSeedOneShotPacket` requires refactoring `ConceptSeedPacketerPacket` to extend `ConceptSeedPacket & ContentPacketContext` directly.
4. `ContentPacketOrigin.generationMode` is `'quick' | 'pipeline'` (line 50) — with quick removed, becomes `'pipeline'` only. `isContentPacketOrigin` validator must be updated.
5. `ContentPacketSourceArtifact.artifactType` is `'EXEMPLAR' | 'SPARK'` (line 41) — `'EXEMPLAR'` was for quick path tracing to source exemplars. With quick path removed, this becomes `'SPARK'` only. Update type + `isContentPacketSourceArtifact` validator.
6. `formatContentExemplarId` (line 183) is only used in `buildQuickSourceArtifacts` — can be removed.
7. `GENERATING_CONTENT` stage in `00-stage-metadata.js` (line 1500, 1711) is the one-shot stage — pipeline uses `DISTILLING_TASTE`, `GENERATING_SPARKS`, `PACKAGING_CONTENT`, `EVALUATING_CONTENT`.
8. `src/models/index.ts` and `src/server/services/index.ts` both re-export one-shot/quick types — both must be updated.
9. Quick-mode lineage no longer appears in runtime source files outside the content service/contracts stack, but it is still embedded in multiple tests and fixtures:
   - `test/unit/models/content-generation-contracts.test.ts`
   - `test/unit/server/presenters/content-packet-card.test.ts`
   - `test/unit/server/services/saved-content-packet-artifact.test.ts`
   - `test/unit/persistence/saved-content-packet-repository.test.ts`
   - `test/unit/group-saved-content-packets-by-kind.test.ts`
   These are part of the real blast radius and must be updated, not left as stale quick-mode fixtures.
10. `CONPACCLEAN-002` is already completed and archived at `archive/tickets/CONPACCLEAN-002-fix-spinner-modal.md`; the spinner dependency is no longer a blocker.

## Architecture Check

1. Removing the one-shot path is beneficial relative to the current architecture because the staged pipeline is already the only path that produces the full domain artifact set the page actually values: `tasteProfile`, `sparks`, `packets`, `evaluations`, stage-by-stage progress, and consistent provenance from sparks.
2. The cleaner long-term architecture is not "keep both modes and paper over the differences"; it is to make content packet generation a single pipeline contract end-to-end. That keeps the model honest: packets come from sparks, provenance is pipeline-only, and evaluation is always part of generation rather than an optional sidecar.
3. No backwards-compatibility shims or aliasing should be added. If quick-mode assumptions break tests or helpers, update them to the pipeline contract directly.
4. A broader redesign of the four-stage pipeline itself is out of scope. This ticket is about collapsing the architecture to one path, not changing the remaining path's stage responsibilities.

## What to Change

### 1. Delete one-shot files

- `prompts/content-one-shot-prompt.md`
- `src/llm/content-one-shot-generation.ts`
- `src/llm/prompts/content-one-shot-prompt.ts`
- `src/llm/schemas/content-one-shot-schema.ts`
- `test/unit/llm/content-one-shot.test.ts`

### 2. Refactor type hierarchy in `src/models/content-generation-contracts.ts`

- Remove `ConceptSeedOneShotPacket` interface (line 54)
- Remove `ConceptSeedOneShotLineagedPacket` interface (lines 56-58)
- Remove `ContentOneShotContext` interface (lines 114-120)
- Remove `ContentOneShotResult` interface (lines 122-125)
- Change `ConceptSeedPacketerPacket` from `extends ConceptSeedOneShotPacket` to `extends ConceptSeedPacket, ContentPacketContext`
- Change `ContentPacketOrigin.generationMode` from `'quick' | 'pipeline'` to `'pipeline'`
- Change `ContentPacketSourceArtifact.artifactType` from `'EXEMPLAR' | 'SPARK'` to `'SPARK'`
- Update `isContentPacketOrigin` validator: remove `'quick'` check
- Update `isContentPacketSourceArtifact` validator: remove `'EXEMPLAR'` check
- Remove `formatContentExemplarId` function

### 3. Remove one-shot from `src/models/index.ts`

- Remove re-exports of deleted types/functions

### 3b. Remove quick-path types from `src/server/services/index.ts`

- Remove `ContentQuickInput` and `ContentQuickResult` re-exports

### 4. Remove quick path from `src/server/services/content-service.ts`

- Remove `import { generateContentOneShot }` (line 5)
- Remove `ContentQuickInput` interface (lines 31-39)
- Remove `ContentQuickResult` interface (lines 83-86)
- Remove `ContentServiceDeps.generateContentOneShot` field
- Remove `generateContentOneShot` from `defaultDeps`
- Remove `buildQuickSourceArtifacts` function (lines 175-191)
- Remove `generateContentQuick` method from the service (lines 229-258)
- Remove `generateContentQuick` from `ContentService` interface (line 114)

### 5. Remove quick-path route branch from `src/server/routes/content-packets.ts`

- Remove `genreVibes`, `moodKeywords`, `pipeline` from body type (lines 73-78)
- Remove the `if (!body.pipeline)` else branch (lines 139-159) — always use pipeline
- The route always calls `contentService.generateContentPipeline`

### 6. Update client JS `public/js/src/11-content-packets.js`

- Remove `usePipeline` checkbox read (lines 109-110)
- Remove `pipeline` from payload (line 118)
- Remove `moodKeywords`/`moodOrGenre` conditional branching (lines 121-127) — always send `moodOrGenre`

### 7. Remove checkbox from `src/server/views/pages/content-packets.ejs`

- Remove lines 49-54 (the checkbox `<div class="form-group">` block)

### 8. Remove one-shot stage from `public/js/src/00-stage-metadata.js`

- Remove `GENERATING_CONTENT` entry from `STAGE_PHRASE_POOLS` (line 1500 area)
- Remove `GENERATING_CONTENT` entry from `STAGE_DISPLAY_NAMES` (line 1711)

### 9. Regenerate app.js

- Run `node scripts/concat-client-js.js`

### 10. Update tests

- Remove `test/unit/llm/content-one-shot.test.ts` (deleted above)
- `test/unit/server/routes/content-packets-routes.test.ts` — remove quick-path test cases
- `test/unit/server/services/content-service.test.ts` — remove `generateContentQuick` test cases
- `test/unit/llm/prompt-doc-alignment.test.ts` — remove one-shot prompt doc alignment case
- `test/unit/models/content-generation-contracts.test.ts` — remove `formatContentExemplarId` coverage and assert quick/EXEMPLAR are rejected
- `test/unit/server/presenters/content-packet-card.test.ts` — update saved/generated packet fixtures to pipeline-only origin artifacts
- `test/unit/server/services/saved-content-packet-artifact.test.ts` — replace quick lineage preservation case with pipeline lineage cloning/assertions
- `test/unit/persistence/saved-content-packet-repository.test.ts` — update saved packet fixture to pipeline-only origin artifacts
- `test/unit/group-saved-content-packets-by-kind.test.ts` — update saved packet fixture to pipeline-only origin artifacts

## Files to Touch

- `prompts/content-one-shot-prompt.md` (delete)
- `src/llm/content-one-shot-generation.ts` (delete)
- `src/llm/prompts/content-one-shot-prompt.ts` (delete)
- `src/llm/schemas/content-one-shot-schema.ts` (delete)
- `test/unit/llm/content-one-shot.test.ts` (delete)
- `src/models/content-generation-contracts.ts` (modify)
- `src/models/index.ts` (modify)
- `src/server/services/index.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/00-stage-metadata.js` (modify)
- `public/js/app.js` (regenerate)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)
- `test/unit/models/content-generation-contracts.test.ts` (modify)
- `test/unit/server/presenters/content-packet-card.test.ts` (modify)
- `test/unit/server/services/saved-content-packet-artifact.test.ts` (modify)
- `test/unit/persistence/saved-content-packet-repository.test.ts` (modify)
- `test/unit/group-saved-content-packets-by-kind.test.ts` (modify)

## Out of Scope

- Removing the taste profile standalone generation endpoint (still useful)
- Changing the pipeline stages themselves
- Changing the `SavedContentPacket` shape itself beyond tightening provenance validation to pipeline-only data
- Refactoring the presenter or persistence layers beyond what is required to remove quick-mode assumptions

## Acceptance Criteria

### Tests That Must Pass

1. Pipeline generation route returns success with packets, evaluations, tasteProfile, sparks
2. Route rejects missing exemplarIdeas
3. Route rejects missing apiKey
4. Content service `generateContentPipeline` calls all 4 stages in order
5. `ConceptSeedPacketerPacket` type correctly extends `ConceptSeedPacket & ContentPacketContext`
6. `isContentPacketOrigin` rejects `generationMode: 'quick'`
7. `isContentPacketSourceArtifact` rejects `artifactType: 'EXEMPLAR'`
8. Saved/generated content packet fixtures across model/presenter/persistence tests use pipeline provenance instead of quick provenance
9. Existing suite: `npm test`

### Invariants

1. No `generateContentOneShot` import or usage anywhere in codebase
2. No `pipeline` boolean in request/response contracts
3. `ContentPacketOrigin.generationMode` is always `'pipeline'`
4. `ContentPacketSourceArtifact.artifactType` is always `'SPARK'`

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/content-service.test.ts` — remove quick tests, verify pipeline-only behavior
2. `test/unit/server/routes/content-packets-routes.test.ts` — remove quick-path tests, verify pipeline is default
3. `test/unit/llm/prompt-doc-alignment.test.ts` — remove one-shot entry
4. `test/unit/models/content-generation-contracts.test.ts` — assert `quick`/`EXEMPLAR` are rejected and remove exemplar ID formatter coverage
5. `test/unit/server/presenters/content-packet-card.test.ts` — assert saved/generated card rendering still works with pipeline-only provenance
6. `test/unit/server/services/saved-content-packet-artifact.test.ts` — assert artifact creation preserves pipeline spark lineage
7. `test/unit/persistence/saved-content-packet-repository.test.ts` — keep repository round-trip coverage with pipeline-only saved packets
8. `test/unit/group-saved-content-packets-by-kind.test.ts` — keep grouping tests on pipeline-origin packets

### Commands

1. `npm run test:unit -- --testPathPattern content`
2. `npm run lint && npm run typecheck && npm test`

## Outcome

- Completion date: 2026-03-25
- Actual changes:
  - Removed the one-shot content generation prompt, schema, generator, service path, route branch, and UI checkbox.
  - Collapsed content packet provenance to the single pipeline contract: `generationMode: 'pipeline'` and `artifactType: 'SPARK'`.
  - Simplified the content-packets route and client payloads so generation always runs through the staged pipeline and always returns evaluations, taste profile, and sparks.
  - Updated `src/models/index.ts` and `src/server/services/index.ts` to stop exporting deleted quick/one-shot types.
  - Regenerated `public/js/app.js`.
  - Updated the broader test surface that still encoded quick-mode fixtures, including model, presenter, persistence, service, route, and client tests.
- Deviations from original plan:
  - The reassessment found a wider test blast radius than the original ticket listed, so the completed work also updated `test/unit/server/presenters/content-packet-card.test.ts`, `test/unit/server/services/saved-content-packet-artifact.test.ts`, `test/unit/persistence/saved-content-packet-repository.test.ts`, and `test/unit/group-saved-content-packets-by-kind.test.ts`.
  - The architecture cleanup did not change the remaining four-stage pipeline itself; it only removed the parallel one-shot path and tightened the contracts around the existing pipeline.
- Verification results:
  - `node scripts/concat-client-js.js` passed.
  - `npm run test:unit -- --runInBand test/unit/server/routes/content-packets-routes.test.ts test/unit/server/services/content-service.test.ts test/unit/llm/prompt-doc-alignment.test.ts test/unit/models/content-generation-contracts.test.ts test/unit/server/presenters/content-packet-card.test.ts test/unit/server/services/saved-content-packet-artifact.test.ts test/unit/persistence/saved-content-packet-repository.test.ts test/unit/group-saved-content-packets-by-kind.test.ts test/unit/client/content-packets-page/controller.test.ts` passed.
  - `npm run typecheck` passed.
  - `npm run lint` passed.
  - `npm test` passed.
