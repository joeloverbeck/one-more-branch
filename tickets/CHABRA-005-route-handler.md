# CHABRA-005: Character brainstormer route handler and registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHABRA-001, CHABRA-004

## Problem

Need Express route handlers for the character brainstormer page: a GET endpoint to render the page with selector data, and a POST endpoint to accept generation requests, load context, call the generation function, and return results.

## Assumption Reassessment (2026-03-25)

1. Route handlers follow the pattern in `character-webs.ts`: Router export, `wrapAsyncRoute()` for async handlers, `generationProgressService` for progress tracking.
2. Route registration in `index.ts` uses `router.use('/path', importedRoutes)`.
3. Concept loading: `listConcepts()` from concept repository, `loadConcept()` for single.
4. Kernel loading: uses concept's `sourceKernelId` to load kernel.
5. Worldbuilding loading: `listWorldbuildings()` and `loadWorldbuildingById()` from worldbuilding service.
6. Character web loading: `listCharacterWebs()` from character-web repository, filter by `sourceConceptId`.
7. Developed characters: `listDevelopedCharactersByWebId()` from developed-character repository.
8. Error formatting: `buildLlmRouteErrorResult()` from server utils.

## Architecture Check

1. Follows the standard route handler pattern — no novel architecture.
2. The POST endpoint assembles the `CharacterBrainstormerContext` by loading concept, kernel, worldbuilding, and existing character summaries.
3. No backwards-compatibility shims needed.

## What to Change

### 1. Create route handler

File: `src/server/routes/character-brainstormer.ts`

**GET `/`** (renders `/character-brainstormer`):
- Load concepts and worldbuildings in parallel
- Render `pages/character-brainstormer` with `{ title, concepts, worldbuildings }`

**POST `/api/generate`**:
- Validate required fields: `conceptId`, `worldbuildingId`, `apiKey`
- Load concept, kernel, worldbuilding
- Load character webs for the concept, collect existing character summaries
- Build `CharacterBrainstormerContext`
- Set up progress tracking if `progressId` provided
- Call `generateCharacterBrainstorm()`
- Return `{ success: true, result }`
- On error: return `{ success: false, error }` via `buildLlmRouteErrorResult()`

### 2. Register route in index.ts

Import `characterBrainstormerRoutes` and add `router.use('/character-brainstormer', characterBrainstormerRoutes)`.

## Files to Touch

- `src/server/routes/character-brainstormer.ts` (new)
- `src/server/routes/index.ts` (modify — add import and registration)

## Out of Scope

- EJS template (CHABRA-006)
- Client-side controller (CHABRA-007)
- Header navigation (CHABRA-008)
- Generation function internals (CHABRA-004)
- Any modification to existing routes or services
- Authentication/authorization (project uses client-side API key only)
- Persistence of brainstormed characters (ephemeral by design)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: GET `/` renders `pages/character-brainstormer` with concepts and worldbuildings
2. Unit test: POST `/api/generate` returns 400 when `conceptId` is missing
3. Unit test: POST `/api/generate` returns 400 when `worldbuildingId` is missing
4. Unit test: POST `/api/generate` returns 400 when `apiKey` is missing
5. Unit test: POST `/api/generate` loads concept, kernel, worldbuilding and calls `generateCharacterBrainstorm()` with correct context
6. Unit test: POST `/api/generate` collects existing character summaries from character webs matching the concept
7. Unit test: POST `/api/generate` returns `{ success: true, result }` on success
8. Unit test: POST `/api/generate` returns error result on generation failure
9. Unit test: POST `/api/generate` passes `userNotes` through when provided (empty string when omitted)
10. `npm run typecheck` passes
11. `npm run lint` passes
12. Existing suite: `npm test` — no regressions

### Invariants

1. GET handler always renders with valid `concepts` and `worldbuildings` arrays (possibly empty)
2. POST handler never persists brainstormed characters to disk
3. API key is never logged or persisted
4. `wrapAsyncRoute()` is used for all async handlers
5. Error responses use `buildLlmRouteErrorResult()` for consistent formatting
6. Existing routes in `index.ts` are not reordered or modified

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/character-brainstormer.test.ts` — GET rendering, POST validation, context assembly, success/error responses

### Commands

1. `npm run test:unit -- --testPathPattern="character-brainstormer"` — targeted test
2. `npm run typecheck`
3. `npm run lint`
4. `npm test` — full suite
