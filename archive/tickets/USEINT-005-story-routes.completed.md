# USEINT-005: Story Creation Routes and View

## Status

Completed (2026-02-06)

## Summary

Implement server routes for new story form display, story creation, and story deletion, plus the corresponding `new-story` view.

## Reassessed Assumptions (2026-02-06)

- `src/server/routes/stories.ts` does not exist yet.
- `src/server/views/pages/new-story.ejs` does not exist yet.
- `src/server/routes/index.ts` currently mounts only `homeRoutes`; `storyRoutes` are not mounted.
- Existing page templates (`home.ejs`, `error.ejs`) are full HTML files with partial includes. The runtime does not use a `layout(...)` helper for pages.
- Existing server TypeScript import style uses local path imports without `.js` suffixes (e.g. `../../engine`, `./home`).
- Route unit tests in this codebase assert handlers directly from router stack (no `supertest` route-integration test pattern for route files).
- `home.ejs` already links to `/stories/new` and posts to `/stories/:storyId/delete`; this ticket must provide those handlers to make those UI actions functional.

## Updated Scope

- Create `src/server/routes/stories.ts` with:
  - `GET /new` rendering `pages/new-story` with `{ title, error: null, values: {} }`
  - `POST /create` validation for `characterConcept` and `apiKey` (minimum trimmed length 10)
  - `POST /create` calling `storyEngine.startStory` with trimmed inputs and redirecting to `/play/{storyId}?page=1&newStory=true`
  - `POST /create` rendering `pages/new-story` with HTTP 400 on validation failure and HTTP 500 on engine failure
  - `POST /:storyId/delete` calling `storyEngine.deleteStory` and redirecting to `/` for success and failure
- Create `src/server/views/pages/new-story.ejs` as a full HTML template consistent with existing pages (header/footer includes, no `layout(...)` helper).
- Modify `src/server/routes/index.ts` to mount `storyRoutes` at `/stories`.
- Create focused unit tests at `test/unit/server/routes/stories.test.ts` using mocked/spied `storyEngine` methods.

## Files to Create

- `src/server/routes/stories.ts`
- `src/server/views/pages/new-story.ejs`
- `test/unit/server/routes/stories.test.ts`

## Files to Modify

- `src/server/routes/index.ts`

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify layout or partials (USEINT-003)
- **DO NOT** add CSS styling (USEINT-007)
- **DO NOT** add play routes (USEINT-006)
- **DO NOT** implement client-side JavaScript (USEINT-008)

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/routes/stories.test.ts`:

**GET /stories/new:**
1. Returns 200 status
2. Renders `pages/new-story`
3. Passes null error and empty values

**POST /stories/create - Validation:**
4. Rejects empty character concept with 400 status
5. Rejects short character concept (<10 chars after trim) with 400 status
6. Rejects missing API key with 400 status
7. Rejects short API key (<10 chars after trim) with 400 status
8. Re-renders form with error message on validation failure
9. Preserves form values except API key on validation failure

**POST /stories/create - Success:**
10. Calls `storyEngine.startStory` with trimmed values
11. Redirects to `/play/{storyId}?page=1&newStory=true`

**POST /stories/create - Error:**
12. Returns 500 and re-renders form on engine error
13. Shows error message from `Error` instance

**POST /stories/:storyId/delete:**
14. Calls `storyEngine.deleteStory` with story ID
15. Redirects to `/` on success
16. Redirects to `/` on error

**Tests must mock/spy `storyEngine`** - no actual LLM calls.

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/routes/stories.test.ts
```

## Invariants That Must Remain True

1. **API Key Never Stored**: API key is passed directly to engine and never included in re-rendered form values
2. **Form Preservation**: Validation failures preserve user-entered non-secret fields
3. **Input Sanitization**: All text inputs passed to engine are trimmed
4. **Minimum Length**: Character concept and API key must each be at least 10 chars after trim
5. **Delete Safety**: Delete remains POST-only
6. **Redirect Pattern**: Success redirects; validation/creation failures re-render form

## Dependencies

- Depends on USEINT-001 for Express setup
- Depends on USEINT-002 for error handling
- Depends on USEINT-003 for shared partials
- Depends on USEINT-004 for home page links that target these routes

## Estimated Size

~220 LOC (source + tests)

## Outcome

Originally planned:
- Implement story creation/deletion routes and the new story page.

Actually changed:
- Added `src/server/routes/stories.ts` with `GET /stories/new`, `POST /stories/create`, and `POST /stories/:storyId/delete`.
- Mounted `storyRoutes` in `src/server/routes/index.ts`.
- Added `src/server/views/pages/new-story.ejs` using the repository’s existing full-page EJS + partial-include pattern.
- Added `test/unit/server/routes/stories.test.ts` with validation, success, error, and delete route coverage using mocked/spied `storyEngine`.
- Strengthened coverage of a trimmed-input edge case (`apiKey` too short after whitespace trim) to enforce the non-persistence/non-echo invariant for secret fields.
