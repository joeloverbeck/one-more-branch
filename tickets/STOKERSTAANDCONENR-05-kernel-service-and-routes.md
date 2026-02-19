# STOKERSTAANDCONENR-05: Kernel Service & Routes

**Status**: PENDING
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-02, STOKERSTAANDCONENR-04
**Spec Phase**: 4a, 4b

## Summary

Create the kernel service layer and Express route handlers. Register kernel routes in the route index. This provides the backend API for kernel CRUD and generation.

## File List

### New Files
- `src/server/services/kernel-service.ts` -- Kernel service (orchestrates generation, delegates to stage runner)
- `src/server/routes/kernels.ts` -- Express route handlers for kernel CRUD + generation

### Modified Files
- `src/server/routes/index.ts` -- Register `kernelRoutes` under `/kernels`
- `src/server/services/index.ts` -- Export kernel service instance (if services are instantiated here; check pattern)

### Test Files
- `test/unit/server/services/kernel-service.test.ts` -- Service layer tests with mocked stage runner
- `test/unit/server/routes/kernels.test.ts` -- Route handler tests with mocked service/repository (or add to integration tests)

## Detailed Requirements

### `src/server/services/kernel-service.ts`

Mirror `src/server/services/concept-service.ts` pattern.

```typescript
interface GenerateKernelsInput {
  thematicInterests?: string;
  emotionalCore?: string;
  sparkLine?: string;
  apiKey: string;
  onGenerationStage?: GenerationStageCallback;
}

interface KernelServiceResult {
  evaluatedKernels: readonly EvaluatedKernel[];
}
```

Method: `generateKernels(input: GenerateKernelsInput): Promise<KernelServiceResult>`
- Calls `runKernelStage` with seed input and stage callback
- Returns all evaluated kernels

### `src/server/routes/kernels.ts`

Mirror `src/server/routes/concepts.ts` pattern. All endpoints:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Render kernels page (renders `pages/kernels` view) |
| GET | `/api/list` | List all saved kernels (JSON) |
| GET | `/api/:kernelId` | Get single kernel (JSON, 404 if not found) |
| POST | `/api/generate` | Generate + evaluate kernels |
| POST | `/api/save` | Save an evaluated kernel |
| PUT | `/api/:kernelId` | Update kernel name/fields |
| DELETE | `/api/:kernelId` | Delete kernel |

**POST `/api/generate`** accepts:
```json
{
  "thematicInterests": "optional",
  "emotionalCore": "optional",
  "sparkLine": "optional",
  "apiKey": "required (min 10 chars)",
  "progressId": "optional"
}
```

Validation: API key required (min 10 chars). At least one seed field must be non-empty, OR all empty is allowed (spec says seeds are optional for kernel).

Progress tracking: If `progressId` provided, use `generationProgressService` to track stages (same pattern as concept routes).

Error handling: Catch `LLMError` separately, format with `formatLLMError`, report to progress service.

**POST `/api/save`** accepts:
```json
{
  "evaluatedKernel": { ... },
  "seeds": { ... },
  "name": "optional"
}
```

Creates `SavedKernel` with UUID, timestamps, stripped seeds. Default name from `dramaticThesis` truncated to 80 chars.

### `src/server/routes/index.ts` modification

Add:
```typescript
import { kernelRoutes } from './kernels';
router.use('/kernels', kernelRoutes);
```

## Out of Scope

- Kernel UI (STOKERSTAANDCONENR-06, -07)
- Concept changes (STOKERSTAANDCONENR-09, -10)
- Home page navigation (STOKERSTAANDCONENR-08)
- Prompt documentation (STOKERSTAANDCONENR-11)
- Changes to concept routes or concept service

## Acceptance Criteria

### Tests That Must Pass
- GET `/kernels` renders `pages/kernels` view
- GET `/kernels/api/list` returns `{ success: true, kernels: [...] }`
- GET `/kernels/api/:id` returns 404 for non-existent kernel
- GET `/kernels/api/:id` returns kernel for valid ID
- POST `/kernels/api/generate` returns 400 without API key
- POST `/kernels/api/generate` calls kernel service and returns evaluated kernels
- POST `/kernels/api/generate` saves generation batch
- POST `/kernels/api/generate` reports progress stages when progressId provided
- POST `/kernels/api/save` creates SavedKernel with UUID and timestamps
- POST `/kernels/api/save` strips apiKey from seeds
- PUT `/kernels/api/:id` returns 404 for non-existent kernel
- PUT `/kernels/api/:id` updates name and/or kernel fields
- DELETE `/kernels/api/:id` returns 404 for non-existent kernel
- DELETE `/kernels/api/:id` removes kernel

### Invariants
- API key is NEVER persisted (stripped from seeds before save)
- All async route handlers use `wrapAsyncRoute`
- Progress tracking uses existing `generationProgressService`
- Error responses follow `{ success: false, error: string }` pattern
- Route is registered in `index.ts` under `/kernels`
- No changes to existing concept routes
