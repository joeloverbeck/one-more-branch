# STOKERSTAANDCONENR-05: Kernel Service & Routes

**Status**: COMPLETED
**Priority**: HIGH
**Depends On**: STOKERSTAANDCONENR-02, STOKERSTAANDCONENR-04
**Spec Phase**: 4a, 4b

## Summary

Create the kernel service layer and Express route handlers. Register kernel routes in the route index. This provides the backend API for kernel CRUD and generation.

## Reassessed Assumptions (Validated Against Current Code)

- `src/models/story-kernel.ts`, `src/models/saved-kernel.ts`, `src/persistence/kernel-repository.ts`, and `src/llm/kernel-stage-runner.ts` are already implemented and have tests.
- Route API behavior is tested in integration files under `test/integration/server/*-routes.test.ts`.
- `GeneratedKernelBatch` currently uses `generatedAt` (not `createdAt`).
- `src/server/views/pages/kernels.ejs` does not exist yet and is part of STOKERSTAANDCONENR-06, so this ticket focuses on backend API routes/service registration.
- Existing architecture keeps orchestration/validation in services and persistence writes in routes (concept flow). Kernel implementation should mirror this for consistency and extensibility.

## File List

### New Files
- `src/server/services/kernel-service.ts` -- Kernel service (orchestrates generation, delegates to stage runner)
- `src/server/routes/kernels.ts` -- Express route handlers for kernel CRUD + generation

### Modified Files
- `src/server/routes/index.ts` -- Register `kernelRoutes` under `/kernels`
- `src/server/services/index.ts` -- Export kernel service instance
- `src/server/services/generation-progress.ts` -- Add dedicated `kernel-generation` flow type

### Test Files
- `test/unit/server/services/kernel-service.test.ts` -- Service layer tests with mocked stage runner
- `test/integration/server/kernel-routes.test.ts` -- Route integration tests with mocked service/repository
- `test/unit/server/services/generation-progress.test.ts` -- Flow type coverage update

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

Mirror `src/server/routes/concepts.ts` API pattern. Endpoints in scope:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/list` | List all saved kernels (JSON) |
| GET | `/api/:kernelId` | Get single kernel (JSON, 404 if not found) |
| POST | `/api/generate` | Generate + evaluate kernels |
| POST | `/api/save` | Save an evaluated kernel |
| PUT | `/api/:kernelId` | Update kernel name/fields |
| DELETE | `/api/:kernelId` | Delete kernel |

`GET /kernels` rendering is handled by STOKERSTAANDCONENR-06 when the kernels page exists.

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

Validation: API key required (min 10 chars). Seed fields are optional and may all be empty.

Progress tracking: If `progressId` provided, use `generationProgressService` to track stages (same pattern as concept routes) with `kernel-generation` flow type.

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

- Kernel UI/page rendering (STOKERSTAANDCONENR-06, -07)
- Concept changes (STOKERSTAANDCONENR-09, -10)
- Home page navigation (STOKERSTAANDCONENR-08)
- Prompt documentation (STOKERSTAANDCONENR-11)
- Changes to concept routes or concept service

## Acceptance Criteria

### Tests That Must Pass
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

## Outcome

- **Completion date**: February 19, 2026
- **What changed**:
  - Added `src/server/services/kernel-service.ts` and exported it from `src/server/services/index.ts`.
  - Added `src/server/routes/kernels.ts` with kernel CRUD + generation API endpoints.
  - Registered kernel routes in `src/server/routes/index.ts`.
  - Added `kernel-generation` flow type in `src/server/services/generation-progress.ts`.
  - Added/updated tests:
    - `test/unit/server/services/kernel-service.test.ts`
    - `test/integration/server/kernel-routes.test.ts`
    - `test/unit/server/services/generation-progress.test.ts`
- **Deviations vs original plan**:
  - `GET /kernels` page rendering was intentionally left out of this ticket and kept in STOKERSTAANDCONENR-06, because `src/server/views/pages/kernels.ejs` is not yet present.
  - Route testing was implemented in integration style (`test/integration/server/...`) to match existing repository testing architecture.
- **Verification**:
  - `npm test` passed.
  - `npm run lint` passed.
  - `npm run typecheck` passed.
