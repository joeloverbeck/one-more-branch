# EVOLVE-03: Create Evolution Routes

**Status**: COMPLETED
**Priority**: HIGH
**Depends on**: EVOLVE-02
**Blocks**: EVOLVE-04, EVOLVE-05

## Summary

Create Express routes for the evolution page: page rendering, concept filtering by kernel, and the evolution API endpoint.

## Reassessed Assumptions and Scope

### What already exists (do not re-implement)

- `src/server/services/evolution-service.ts` already exists and provides the evolve -> evaluate -> verify pipeline.
- Generation progress infrastructure already supports `concept-evolution` flow type and `EVOLVING_CONCEPTS` stage.
- LLM evolver stage, prompt, and schema are already implemented and tested.

### Discrepancies corrected

- `src/server/routes/evolution.ts` does **not** exist yet (still required).
- `src/server/routes/index.ts` does **not** mount `/evolve` yet (still required).
- `GET /evolve` should **not** preload concepts. Concepts should be fetched on-demand via `/evolve/api/concepts-by-kernel/:kernelId` after kernel selection. This keeps rendering fast and preserves a clean API-driven flow.
- The stage-model note in EVOLVE-05 is stale for this ticket; no stage-model changes are required in EVOLVE-03.

### Scope for EVOLVE-03 (updated)

1. Add `src/server/routes/evolution.ts` with:
   - `GET /` rendering `pages/evolution` (no concept preload requirement).
   - `GET /api/concepts-by-kernel/:kernelId` filtering `listConcepts()` by `sourceKernelId`.
   - `POST /api/evolve` with strict validation + repository lookups + evolution service orchestration + route progress integration + concepts-style error formatting.
2. Mount `evolutionRoutes` at `/evolve` in `src/server/routes/index.ts`.
3. Add focused unit tests for evolution route handlers.

## Files to Create

1. **`src/server/routes/evolution.ts`**

## Routes

### `GET /evolve` -- Page Render

- Renders `pages/evolution` with `{ title }`
- Does not preload concepts; client loads by kernel via API

### `GET /evolve/api/concepts-by-kernel/:kernelId` -- Filter Concepts

- Loads all concepts via `listConcepts()`
- Filters to those where `sourceKernelId === kernelId`
- Returns `{ success: true, concepts: SavedConcept[] }`
- Returns 200 with empty array if no matches

### `POST /evolve/api/evolve` -- Run Evolution Pipeline

Request body:
```typescript
{
  conceptIds: string[];       // 2-3 saved concept IDs
  kernelId: string;           // kernel to anchor mutations
  apiKey: string;             // OpenRouter API key
  progressId?: unknown;       // for progress tracking
}
```

Validation:
- `apiKey` required, min 10 chars
- `conceptIds` required, 2-3 items
- `kernelId` required
- Load each concept via `loadConcept()`, verify all exist
- Load kernel via `loadKernel()`, verify it exists
- Verify all concepts share `sourceKernelId === kernelId`

Pipeline execution:
- Create progress tracker via `createRouteGenerationProgress()`
- Call `evolutionService.evolveConcepts({ parentConcepts, kernel, apiKey, onGenerationStage })`
- On success: return `{ success, evaluatedConcepts, verifications }`
- On error: same error handling pattern as concepts route (LLMError formatting, progress.fail())

Note: Saving is handled by the existing `POST /concepts/api/save` endpoint -- no new save route needed.

## Files to Modify

1. **`src/server/routes/index.ts`** -- Add import and mount:
   ```typescript
   import { evolutionRoutes } from './evolution';
   router.use('/evolve', evolutionRoutes);
   ```

## Acceptance Criteria

- [x] GET /evolve renders evolution page
- [x] GET /evolve/api/concepts-by-kernel/:kernelId returns filtered concepts
- [x] POST /evolve/api/evolve validates inputs and runs pipeline
- [x] Error responses follow same format as concepts routes
- [x] Progress tracking works with existing generation-progress endpoint
- [x] Uses wrapAsyncRoute for async handlers
- [x] Unit tests for route handlers

## Outcome

- **Completion date**: 2026-02-21
- **What changed**:
  - Added `src/server/routes/evolution.ts` with:
    - `GET /evolve` page render route
    - `GET /evolve/api/concepts-by-kernel/:kernelId` kernel-filtered concept listing
    - `POST /evolve/api/evolve` validation + concept/kernel loading + `evolutionService` orchestration + progress tracking + LLM/non-LLM error handling
  - Mounted evolution routes at `/evolve` in `src/server/routes/index.ts`
  - Added route tests in `test/unit/server/routes/evolution.test.ts`
- **Deviations from original plan**:
  - `GET /evolve` intentionally does **not** preload concepts; concepts are loaded on-demand via API after kernel selection for cleaner separation of concerns and better extensibility.
  - Added a stricter invariant: duplicate parent concept IDs are rejected (`400`) to prevent invalid evolution inputs.
- **Verification**:
  - `npm test` passed
  - `npm run lint` passed
  - `npm run typecheck` passed
