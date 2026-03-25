# CONPACCLEAN-001: Remove one-shot content generation path

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: Yes — content service, content generation contracts, route handler, client JS
**Deps**: CONPACCLEAN-002 (implement first so spinner works for the remaining pipeline path)

## Problem

The one-shot content packet generation path (invoked when the "Use full pipeline" checkbox is unchecked) is dead code — users always use the full pipeline. This checkbox, the one-shot prompt, schema, generation code, service method, route branch, and associated tests are unnecessary complexity.

## Assumption Reassessment (2025-03-25)

1. `src/server/services/content-service.ts` has two paths: `generateContentQuick` (one-shot) and `generateContentPipeline` — confirmed at lines 229-258 vs 260-322.
2. `src/server/routes/content-packets.ts` branches on `body.pipeline` (line 108) — confirmed.
3. `ConceptSeedPacketerPacket extends ConceptSeedOneShotPacket` (line 60 of `content-generation-contracts.ts`) — removing `ConceptSeedOneShotPacket` requires refactoring `ConceptSeedPacketerPacket` to extend `ConceptSeedPacket & ContentPacketContext` directly.
4. `ContentPacketOrigin.generationMode` is `'quick' | 'pipeline'` (line 50) — with quick removed, becomes `'pipeline'` only. `isContentPacketOrigin` validator must be updated.
5. `ContentPacketSourceArtifact.artifactType` is `'EXEMPLAR' | 'SPARK'` (line 41) — `'EXEMPLAR'` was for quick path tracing to source exemplars. With quick path removed, this becomes `'SPARK'` only. Update type + `isContentPacketSourceArtifact` validator.
6. `formatContentExemplarId` (line 183) is only used in `buildQuickSourceArtifacts` — can be removed.
7. `GENERATING_CONTENT` stage in `00-stage-metadata.js` (line 1500, 1711) is the one-shot stage — pipeline uses `DISTILLING_TASTE`, `GENERATING_SPARKS`, `PACKAGING_CONTENT`, `EVALUATING_CONTENT`.
8. `src/models/index.ts` re-exports — need to check and remove one-shot types.

## Architecture Check

1. Removing dead code reduces maintenance burden and cognitive load. No alternative is cleaner.
2. No backwards-compatibility shims — no saved packets use `generationMode: 'quick'` (user confirms one-shot was never used).

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

## Files to Touch

- `prompts/content-one-shot-prompt.md` (delete)
- `src/llm/content-one-shot-generation.ts` (delete)
- `src/llm/prompts/content-one-shot-prompt.ts` (delete)
- `src/llm/schemas/content-one-shot-schema.ts` (delete)
- `test/unit/llm/content-one-shot.test.ts` (delete)
- `src/models/content-generation-contracts.ts` (modify)
- `src/models/index.ts` (modify)
- `src/server/services/content-service.ts` (modify)
- `src/server/routes/content-packets.ts` (modify)
- `public/js/src/11-content-packets.js` (modify)
- `src/server/views/pages/content-packets.ejs` (modify)
- `public/js/src/00-stage-metadata.js` (modify)
- `public/js/app.js` (regenerate)
- `test/unit/server/routes/content-packets-routes.test.ts` (modify)
- `test/unit/server/services/content-service.test.ts` (modify)
- `test/unit/llm/prompt-doc-alignment.test.ts` (modify)

## Out of Scope

- Removing the taste profile standalone generation endpoint (still useful)
- Changing the pipeline stages themselves
- Modifying persisted `SavedContentPacket` schema (no saved quick-mode data exists)

## Acceptance Criteria

### Tests That Must Pass

1. Pipeline generation route returns success with packets, evaluations, tasteProfile, sparks
2. Route rejects missing exemplarIdeas
3. Route rejects missing apiKey
4. Content service `generateContentPipeline` calls all 4 stages in order
5. `ConceptSeedPacketerPacket` type correctly extends `ConceptSeedPacket & ContentPacketContext`
6. `isContentPacketOrigin` rejects `generationMode: 'quick'`
7. `isContentPacketSourceArtifact` rejects `artifactType: 'EXEMPLAR'`
8. Existing suite: `npm test`

### Invariants

1. No `generateContentOneShot` import or usage anywhere in codebase
2. No `pipeline` boolean in request/response contracts
3. `ContentPacketOrigin.generationMode` is always `'pipeline'`

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/content-service.test.ts` — remove quick tests, verify pipeline-only behavior
2. `test/unit/server/routes/content-packets-routes.test.ts` — remove quick-path tests, verify pipeline is default
3. `test/unit/llm/prompt-doc-alignment.test.ts` — remove one-shot entry

### Commands

1. `npm run test:unit -- --testPathPattern content`
2. `npm run lint && npm run typecheck && npm test`
