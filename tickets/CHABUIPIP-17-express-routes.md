# CHABUIPIP-17: Express Routes for Character Webs

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-16
**Estimated diff size**: ~200 lines

## Summary

Create Express routes for character web management and individual character development. Register in the route index. Follows the `kernels.ts` route pattern with progress tracking.

## File List

- `src/server/routes/character-webs.ts` (CREATE)
- `src/server/routes/index.ts` (MODIFY — register new routes)
- `test/unit/server/routes/character-webs.test.ts` (CREATE)

## Out of Scope

- Do NOT create EJS views or client JS (CHABUIPIP-20)
- Do NOT modify any existing route files (except index.ts for registration)
- Do NOT modify the character web service
- Do NOT modify the progress tracking service

## Detailed Changes

### `src/server/routes/character-webs.ts`:

```
GET  /character-webs                                    → render character-webs.ejs
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

All async handlers use `wrapAsyncRoute()`.
Error handling follows the kernel routes pattern — catches `LLMError` separately with structured debug info in non-production mode.
Progress-tracked endpoints use `createRouteGenerationProgress()`.

### `src/server/routes/index.ts`:

Add import and registration:
```typescript
import { characterWebsRouter } from './character-webs.js';
router.use('/character-webs', characterWebsRouter);
```

## Acceptance Criteria

### Tests that must pass

- `test/unit/server/routes/character-webs.test.ts`:
  - GET `/character-webs` renders the EJS template
  - GET `/character-webs/api/list` returns JSON array
  - GET `/character-webs/api/:webId` returns web data or 404
  - POST `/character-webs/api/create` creates web and returns 201
  - POST `/character-webs/api/:webId/generate` calls service and returns updated web
  - DELETE `/character-webs/api/:webId` removes web and returns 204
  - POST `/character-webs/api/:webId/characters/init` creates character and returns 201
  - POST `/character-webs/api/characters/:charId/generate` calls stage generation
  - GET `/character-webs/api/characters/:charId` returns character or 404
  - LLMError responses include structured debug info in non-production
  - Missing apiKey returns 400

### Invariants

- `npm run typecheck` passes
- `npm run lint` passes
- All async routes wrapped with `wrapAsyncRoute()`
- Routes registered in `index.ts`
- No existing routes modified
- Error handling matches existing route patterns (kernel routes)
