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

- [ ] Unit test: `GET /content-packets` returns list from repository
- [ ] Unit test: `GET /content-packets/:id` returns 404 for nonexistent ID
- [ ] Unit test: `POST /content-packets/generate` calls `contentService.generateContentQuick` by default
- [ ] Unit test: `POST /content-packets/generate` with `pipeline=true` calls `contentService.generateContentPipeline`
- [ ] Unit test: `POST /content-packets/:id/save` persists packet to repository
- [ ] Unit test: `PATCH /content-packets/:id/pin` toggles pinned state
- [ ] Unit test: `DELETE /content-packets/:id` removes packet from repository
- [ ] Unit test: all routes require `apiKey` in request body for generation endpoints
- [ ] Unit test: all routes use `wrapAsyncRoute` for async safety
- [ ] Client test: `11-content-packets.js` is included in generated `app.js`

### Invariants

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] All existing tests pass unchanged
- [ ] `node scripts/concat-client-js.js` succeeds
- [ ] No changes to existing route handlers
- [ ] API key never persisted to disk (session storage only)
