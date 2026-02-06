# USEINT-006: Play Routes and View

## Status

Completed (2026-02-06)

## Summary

Implement play route handlers and play page template so users can load a story page, submit choices over JSON, and restart from page 1.

## Reassessed Assumptions (2026-02-06)

- `src/server/routes/play.ts` does not exist yet.
- `src/server/views/pages/play.ejs` does not exist yet.
- `src/server/routes/index.ts` currently mounts `homeRoutes` and `storyRoutes`, but not `playRoutes`.
- Existing page templates in `src/server/views/pages/` are full HTML files with partial includes; runtime is not configured for `<% layout(...) %>` helper usage.
- Existing server TypeScript imports use local module paths without `.js` suffixes.
- Current route unit tests in this repo call handlers directly from the router stack and spy on `storyEngine`; they do not primarily use `supertest` for route-file unit tests.
- `home.ejs` and `stories.ts` already link/redirect to `/play/:storyId`, so this ticket must provide the corresponding route implementation.

## Updated Scope

- Create `src/server/routes/play.ts` with:
  - `GET /:storyId` that loads story/page and renders `pages/play`
  - `POST /:storyId/choice` JSON endpoint that validates `pageId`, `choiceIndex`, and `apiKey`, then calls `storyEngine.makeChoice`
  - `GET /:storyId/restart` that redirects to `/play/:storyId?page=1`
- Create `src/server/views/pages/play.ejs` as a full HTML template consistent with existing view conventions, including required IDs/classes/data attributes used by planned client JS work.
- Modify `src/server/routes/index.ts` to mount `playRoutes` at `/play`.
- Add route unit tests at `test/unit/server/routes/play.test.ts` following the existing route-test pattern.
- Harden page-query handling so non-positive page values are treated as page 1.

## Files to Create

- `src/server/routes/play.ts`
- `src/server/views/pages/play.ejs`
- `test/unit/server/routes/play.test.ts`

## Files to Modify

- `src/server/routes/index.ts`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify layout or partials (USEINT-003)
- **DO NOT** add CSS styling (USEINT-007)
- **DO NOT** implement client-side JavaScript (USEINT-008)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/routes/play.test.ts`:

**GET /play/:storyId**
1. Renders `pages/play` with story/page/pageId for valid story and page.
2. Returns 404 and renders error page when story is missing.
3. Returns 404 and renders error page when page is missing.
4. Defaults to page 1 when `page` query is missing.
5. Defaults to page 1 when `page` query is not a positive integer.
6. Sets title as `${story.characterConcept.slice(0, 50)} - One More Branch`.

**POST /play/:storyId/choice validation**
7. Returns 400 JSON when `pageId` is missing.
8. Returns 400 JSON when `choiceIndex` is missing.
9. Returns 400 JSON when `apiKey` is missing.

**POST /play/:storyId/choice success**
10. Calls `storyEngine.makeChoice` with `storyId`, `pageId`, `choiceIndex`, and `apiKey`.
11. Returns 200 JSON with `success: true`.
12. Returns `page` payload fields: `id`, `narrativeText`, `choices`, `stateChanges`, `isEnding`.
13. Returns `wasGenerated`.

**POST /play/:storyId/choice error**
14. Returns 500 JSON with error message when engine throws.

**GET /play/:storyId/restart**
15. Redirects to `/play/:storyId?page=1`.

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/routes/play.test.ts
```

## Invariants That Must Remain True

1. **No Back Button**: Play UI provides no explicit navigation to previous pages.
2. **Deterministic Display**: Rendering a stored page is read-only and deterministic.
3. **Explored Marker**: Choices with `nextPageId` show the explored indicator.
4. **Ending Consistency**: Ending pages show `THE END` and no choice buttons.
5. **AJAX for Choices**: Choice endpoint is JSON-based.
6. **API Key Required**: Choice endpoint rejects requests without `apiKey`.
7. **Safe Page Parsing**: Invalid or non-positive query page values resolve to page 1.

## Dependencies

- Depends on USEINT-001 for Express setup
- Depends on USEINT-002 for error handling
- Depends on USEINT-003 for shared partials and page structure conventions
- Depends on USEINT-004 and USEINT-005 for links/redirects that target `/play`

## Estimated Size

~280 LOC (source + tests)

## Outcome

Originally planned:
- Implement play routes/view and add route tests.

Actually changed:
- Added `src/server/routes/play.ts` with `GET /play/:storyId`, `POST /play/:storyId/choice`, and `GET /play/:storyId/restart`.
- Mounted `playRoutes` in `src/server/routes/index.ts`.
- Added `src/server/views/pages/play.ejs` as a full HTML page with existing shared partial include pattern.
- Added `test/unit/server/routes/play.test.ts` covering route success, validation, error, and restart behavior with `storyEngine` spies.
- Strengthened an uncovered edge case by enforcing and testing safe page parsing for non-positive `page` query values (defaults to page 1).
