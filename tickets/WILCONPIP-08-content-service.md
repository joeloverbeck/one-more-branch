# WILCONPIP-08: ContentService Orchestration Layer

**Effort**: M
**Dependencies**: WILCONPIP-02, WILCONPIP-03, WILCONPIP-04, WILCONPIP-05, WILCONPIP-06, WILCONPIP-07
**Spec reference**: "Service Layer Design"

## Summary

Create the `ContentService` that orchestrates content packet generation. It provides two paths:
- `generateContentQuick()` — runs the one-shot prompt (default path)
- `generateContentPipeline()` — runs the full 4-stage pipeline (Taste Distiller -> Sparkstormer -> Packeter -> Evaluator)

Also exposes individual stage methods for fine-grained control. Follows the `createConceptService()` factory pattern.

## Files to Touch

- `src/server/services/content-service.ts` — NEW: `ContentService` interface, `createContentService()` factory, `contentService` singleton export
- `src/config/generation-stage-metadata.json` — add 4 new stage entries: `DISTILLING_TASTE`, `GENERATING_SPARKS`, `PACKAGING_CONTENT`, `EVALUATING_CONTENT` with display names and phrase pools
- `src/config/stage-model.ts` — add model selection entries for the 4 new stages (if this file maps stage IDs to models)

## Out of Scope

- Routes and UI — WILCONPIP-09
- Concept pipeline integration — WILCONPIP-10+
- Persistence of generated packets (the service generates; routes handle saving via WILCONPIP-09)
- Changes to ConceptService

## Acceptance Criteria

### Tests

- [ ] Unit test: `generateContentQuick` calls `generateContentOneShot` with correct context
- [ ] Unit test: `generateContentPipeline` calls all 4 stages in order: distillTaste -> generateSparks -> packageContent -> evaluatePackets
- [ ] Unit test: `generateContentPipeline` passes taste profile output as input to sparkstormer
- [ ] Unit test: `generateContentPipeline` passes sparks output as input to packeter
- [ ] Unit test: `generateContentPipeline` passes packets output as input to evaluator
- [ ] Unit test: `distillTaste` calls taste distiller generation with correct context
- [ ] Unit test: `generateSparks` calls sparkstormer generation with correct context
- [ ] Unit test: each method fires `onGenerationStage` callbacks for its stage
- [ ] Unit test: `generateContentQuick` requires apiKey (throws on missing)
- [ ] Unit test: generation-stage-metadata.json includes all 4 new stages with non-empty phrase pools

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] No changes to ConceptService or its tests
- [ ] Service uses dependency injection (deps parameter) following ConceptService pattern
