**Status**: COMPLETED

# WILCONPIP-09: Content Packet Routes and Client UI

**Effort**: L
**Dependencies**: WILCONPIP-02, WILCONPIP-08
**Spec reference**: "Routes and UI"

## Summary

Add Express routes for content packet CRUD and generation, plus taste profile generation. Add a client-side JavaScript source file for the content packets UI.

## Files to Touch

- `src/server/routes/content-packets.ts` — NEW: route handlers for content packet endpoints
- `src/server/routes/index.ts` — register content packet routes
- `src/server/views/pages/content-packets.ejs` — NEW: content packets browsing/management page
- `public/js/src/11-content-packets.js` — NEW: client-side logic for content packet UI (generation, pinning, deletion)
- `public/js/app.js` — regenerated via `node scripts/concat-client-js.js`

## Out of Scope

- Concept pipeline integration — WILCONPIP-10+
- Evaluator dimension changes — WILCONPIP-12
- Content packet generation logic (handled by ContentService in WILCONPIP-08)
- Changes to play page, briefing page, or story creation flow

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/content-packets` | List all saved content packets |
| `GET` | `/content-packets/:id` | Load single content packet |
| `POST` | `/content-packets/generate` | Generate packets (quick or full pipeline) |
| `POST` | `/content-packets/:id/save` | Save a generated packet |
| `PATCH` | `/content-packets/:id/pin` | Pin/unpin a packet |
| `DELETE` | `/content-packets/:id` | Delete a packet |
| `GET` | `/taste-profiles` | List taste profiles |
| `POST` | `/taste-profiles/generate` | Generate a taste profile |

## Acceptance Criteria

### Tests

- [x] Unit test: `GET /content-packets` returns list from repository
- [x] Unit test: `GET /content-packets/:id` returns 404 for nonexistent ID
- [x] Unit test: `POST /content-packets/generate` calls `contentService.generateContentQuick` by default
- [x] Unit test: `POST /content-packets/generate` with `pipeline=true` calls `contentService.generateContentPipeline`
- [x] Unit test: `POST /content-packets/:id/save` persists packet to repository
- [x] Unit test: `PATCH /content-packets/:id/pin` toggles pinned state
- [x] Unit test: `DELETE /content-packets/:id` removes packet from repository
- [x] Unit test: all routes require `apiKey` in request body for generation endpoints
- [x] Unit test: all routes use `wrapAsyncRoute` for async safety
- [x] Client test: `11-content-packets.js` is included in generated `app.js`

### Invariants

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] All existing tests pass unchanged
- [x] `node scripts/concat-client-js.js` succeeds
- [x] No changes to existing route handlers
- [x] API key never persisted to disk (session storage only)

## Outcome

- **Completion date**: 2026-03-07
- **What was changed**:
  - Created `src/server/routes/content-packets.ts` with 9 route handlers (8 ticket routes + 1 JSON list API)
  - Registered routes in `src/server/routes/index.ts`
  - Added `'content-generation'` flow type to `generation-progress.ts`
  - Created `src/server/views/pages/content-packets.ejs` browsing/management page
  - Created `public/js/src/11-content-packets.js` client-side controller
  - Regenerated `public/js/app.js` (36 source files)
  - Created 17 unit tests in `test/unit/server/routes/content-packets-routes.test.ts`
  - Updated `generation-progress.test.ts` for new flow type
- **Deviations**: Taste profile routes are nested under `/content-packets/taste-profiles/api/*` rather than top-level `/taste-profiles/*`, keeping them grouped under the content-packets router
- **Verification**: typecheck passes, lint 0 errors, 271 test suites / 3237 tests pass
