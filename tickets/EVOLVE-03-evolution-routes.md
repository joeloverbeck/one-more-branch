# EVOLVE-03: Create Evolution Routes

**Priority**: HIGH
**Depends on**: EVOLVE-02
**Blocks**: EVOLVE-04, EVOLVE-05

## Summary

Create Express routes for the evolution page: page rendering, concept filtering by kernel, and the evolution API endpoint.

## Files to Create

1. **`src/server/routes/evolution.ts`**

## Routes

### `GET /evolve` -- Page Render

- Loads all saved concepts via `listConcepts()`
- Renders `pages/evolution` with `{ title, concepts }`

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

- [ ] GET /evolve renders evolution page
- [ ] GET /evolve/api/concepts-by-kernel/:kernelId returns filtered concepts
- [ ] POST /evolve/api/evolve validates inputs and runs pipeline
- [ ] Error responses follow same format as concepts routes
- [ ] Progress tracking works with existing generation-progress endpoint
- [ ] Uses wrapAsyncRoute for async handlers
- [ ] Unit tests for route handlers
