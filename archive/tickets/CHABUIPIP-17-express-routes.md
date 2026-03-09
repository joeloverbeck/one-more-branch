# CHABUIPIP-17: Express Routes for Character Webs

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-16
**Estimated diff size**: ~350 lines

## Summary

Create API-first Express routes for character web management and individual character development, then register them in the route index. Follow the established JSON route pattern used by `content-packets.ts` and the LLM/progress/error pattern used by `kernels.ts`.

The ticket originally assumed a page-rendering route could be delivered here. That is incorrect for the current architecture: there is no `pages/character-webs.ejs` view yet, and the spec explicitly leaves UI to CHABUIPIP-20. This ticket should therefore deliver the server API surface only, plus the minimum supporting wiring required for progress-tracked generation endpoints.

## File List

- `src/server/routes/character-webs.ts` (CREATE)
- `src/server/routes/index.ts` (MODIFY — register new routes)
- `src/server/services/generation-progress.ts` (MODIFY — register character-web route flow types)
- `test/unit/server/routes/character-webs.test.ts` (CREATE)
- `test/unit/server/services/generation-progress.test.ts` (MODIFY — extend flow-type coverage)

## Out of Scope

- Do NOT create EJS views or client JS (CHABUIPIP-20)
- Do NOT modify existing route behavior outside the new route registration
- Do NOT refactor `characterWebService` unless route implementation exposes a real defect
- Do NOT add story-creation integration or entity decomposer changes

## Reassessed Assumptions

- `characterWebService` already exists and is the required orchestration boundary. The routes should call the service, not repositories or LLM modules directly.
- `loadCharacter()` returns `null` for missing characters by normalizing the repository's throw-only contract. The routes should rely on that behavior rather than duplicate repository semantics.
- Progress tracking support is not route-only. `createRouteGenerationProgress()` requires a `GenerationFlowType`, and `src/server/services/generation-progress.ts` does not yet include any character-web flow identifiers. This ticket must add them.
- There is currently no `src/server/views/pages/character-webs.ejs`. Delivering `GET /character-webs` as a render route would either force placeholder UI or create hidden coupling to the future UI ticket. That is the wrong architectural boundary.
- The ticket's original line "Do NOT modify the progress tracking service" conflicts with the stated requirement to use `createRouteGenerationProgress()`. The progress flow registry change is required and in scope.

## Detailed Changes

### `src/server/routes/character-webs.ts`:

```
GET  /character-webs/api/list                           → List saved webs (JSON)
GET  /character-webs/api/:webId                         → Load web + character statuses (JSON)
POST /character-webs/api/create                         → Create empty web (body: { name, inputs })
POST /character-webs/api/:webId/generate                → Generate web (body: { apiKey, progressId? })
POST /character-webs/api/:webId/regenerate              → Regenerate web (body: { apiKey, progressId? })
DELETE /character-webs/api/:webId                       → Delete web + all characters

GET  /character-webs/api/:webId/characters              → List developed characters for web
POST /character-webs/api/:webId/characters/init         → Init character (body: { characterName })
POST /character-webs/api/characters/:charId/generate    → Generate stage (body: { stage, apiKey, progressId? })
POST /character-webs/api/characters/:charId/regenerate  → Regenerate stage (body: { stage, apiKey, progressId? })
GET  /character-webs/api/characters/:charId             → Load developed character
DELETE /character-webs/api/characters/:charId           → Delete developed character
```

Implementation notes:

- Export `characterWebRoutes` to match the repo's route naming pattern.
- Mount under `/character-webs` from `src/server/routes/index.ts`; the route file itself only defines relative paths such as `/api/list`.
- `GET /api/:webId` should return `{ success: true, web, characters }`, where `characters` is the current list of developed characters for the web. This is the cleanest API contract for the future UI and avoids a second mandatory fetch just to compute status badges.
- JSON endpoints should follow the repo's existing response shape: `{ success: true, ...payload }` on success and `{ success: false, error }` for non-LLM validation/domain failures.
- All async handlers use `wrapAsyncRoute()`.
- LLM-backed endpoints catch `LLMError` and return `buildLlmRouteErrorResult(error).response`, matching the current route architecture.
- Progress-tracked endpoints use `createRouteGenerationProgress()`.
- Use distinct route flow types:
  - `character-web-generation` for web generation and regeneration
  - `character-stage-generation` for per-character stage generation and regeneration
- Validation stays at the route boundary for malformed request bodies (`400`) while domain constraints from the service remain service-owned (`404` for missing resources, `400` for invalid input / duplicates / missing API key).

### `src/server/services/generation-progress.ts`:

Add the two new flow types required by `createRouteGenerationProgress()`:

```typescript
'character-web-generation',
'character-stage-generation',
```

Do not introduce aliases or generic catch-all flow names. These are separate user-visible operations and should remain distinct.

### `src/server/routes/index.ts`:

Add import and registration:
```typescript
import { characterWebRoutes } from './character-webs';
router.use('/character-webs', characterWebRoutes);
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/server/routes/character-webs.test.ts`:
  - GET `/character-webs/api/list` returns `{ success: true, webs }`
  - GET `/character-webs/api/:webId` returns `{ web, characters }` or 404
  - POST `/character-webs/api/create` creates web and returns 201
  - POST `/character-webs/api/:webId/generate` calls service and returns updated web
  - DELETE `/character-webs/api/:webId` removes web and returns 204
  - POST `/character-webs/api/:webId/characters/init` creates character and returns 201
  - POST `/character-webs/api/characters/:charId/generate` calls stage generation
  - GET `/character-webs/api/characters/:charId` returns character or 404
  - LLMError responses include structured debug info in non-production
  - Missing apiKey returns 400
- `test/unit/server/services/generation-progress.test.ts`:
  - includes `character-web-generation`
  - includes `character-stage-generation`

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- All async routes wrapped with `wrapAsyncRoute()`
- Routes registered in `index.ts`
- Error handling matches existing JSON route patterns for validation/service errors and existing kernel route patterns for `LLMError`
- No view/template files created by this ticket

## Outcome

- Completion date: 2026-03-09
- What actually changed:
  - Added `src/server/routes/character-webs.ts` with API-first character-web and character-stage routes.
  - Registered the route module in `src/server/routes/index.ts`.
  - Added `character-web-generation` and `character-stage-generation` to `src/server/services/generation-progress.ts`.
  - Refactored `characterWebService` to use typed `EngineError` failures for validation, not-found, and conflict cases so routes no longer infer domain semantics from error-message text.
  - Added targeted route coverage in `test/unit/server/routes/character-webs.test.ts`.
  - Extended `test/unit/server/services/generation-progress.test.ts` for the new flow types and strengthened `test/unit/server/services/character-web-service.test.ts` around the typed error contract.
- Deviations from the original plan:
  - Did not implement `GET /character-webs` page rendering because the view does not exist and CHABUIPIP-20 owns UI delivery.
  - Tightened the API contract to existing repo conventions: success/error JSON envelopes and service-backed status aggregation on `GET /api/:webId`.
  - Expanded scope slightly into progress-flow registration because route-level progress tracking could not compile or operate cleanly without it.
  - Tightened route semantics further than originally planned by using `409 Conflict` for duplicate character initialization instead of folding that case into generic `400` handling.
- Verification results:
  - `npm run test:unit -- --coverage=false test/unit/server/routes/character-webs.test.ts test/unit/server/services/generation-progress.test.ts`
  - `npm run test:unit -- --coverage=false`
  - `npm run typecheck`
  - `npm run lint`
