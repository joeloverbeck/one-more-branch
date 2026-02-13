# Story Briefing Landing Page

**Status**: COMPLETED
**Created**: 2026-02-13
**Reference Spec**: `specs/story-briefing-landing-page.md`

## Reassessed Assumptions

1. The ticket path originally referenced (`tickets/story-briefing-landing-page.md`) did not exist. This ticket is created now and treated as the execution source of truth; the spec remains reference-only.
2. Current architecture does **not** have a two-phase lifecycle. `startStory()`/`startNewStory()` generates both story preparation and page 1 in a single operation.
3. No briefing surface exists today:
- No `GET /play/:storyId/briefing` route
- No `POST /play/:storyId/begin` route
- No briefing EJS view
- No briefing client controller
- No briefing helper utilities
4. Home page currently routes all stories to `/play/:storyId?page=1`; there is no 0-page “awaiting briefing” state handling.
5. Generation progress currently supports flow types `new-story` and `choice` only.
6. Existing tests are built around the single-phase `startStory` behavior and need updates/expansion to validate the two-phase lifecycle.

## Architecture Decision

Adopt a clean two-phase lifecycle as the primary architecture:
- `prepareStory`: create + structure + decompose only
- `generateOpeningPage`: explicit begin step that creates page 1

Per current product direction, do not preserve backward-compatibility behavior in web flows. If existing call sites/tests break, update them to the new lifecycle rather than adding alias/compat shims in routes.

## Corrected Scope

1. Engine
- Add `prepareStory(options)` and `generateOpeningPage(storyId, apiKey, onGenerationStage?)`.
- Refactor shared preparation logic to avoid duplication.
- Keep idempotency guard for begin: if page 1 exists, return it.

2. Server routes
- `POST /stories/create` and `POST /stories/create-ajax` call `prepareStory` and redirect/respond for briefing.
- Add `GET /play/:storyId/briefing` and `POST /play/:storyId/begin`.
- Add play route guard: for requested page with no page 1, redirect to briefing.

3. Server utilities and views
- Add `briefing-helpers` for shaping protagonist/NPC/world fact data.
- Add `pages/briefing.ejs`.
- Update `pages/home.ejs` for 0-page stories to show “Awaiting briefing” and “View Briefing”.

4. Client and styling
- Add briefing page controller and wire it into initialization.
- Change new-story AJAX redirect to briefing.
- Extend generation progress flow type to include `begin-adventure`.
- Add briefing-specific CSS sections without rewriting unrelated styles.
- Regenerate `public/js/app.js` from `public/js/src/*`.

5. Testing
- Add/expand unit tests for:
  - engine prepare/begin flow
  - briefing helpers
  - play/stories/home route behavior changes
  - client redirect and begin-adventure flow behavior
- Run relevant hard suites and keep all touched suites passing.

## Out of Scope

- LLM prompt/schema redesign
- Persistence format changes
- Broad UI redesign outside briefing/home flow

## Implementation Constraints

- Keep edits surgical and DRY.
- Prefer shared internal helpers over duplicated logic.
- Do not rewrite entire files unless required by structural changes.

## Outcome

- **Completion date**: 2026-02-13
- **What changed**:
  - Introduced a true two-phase lifecycle in engine/service APIs: `prepareStory()` and `generateOpeningPage()`.
  - Updated story creation routes to prepare first and route to briefing.
  - Added briefing routes (`GET /play/:storyId/briefing`, `POST /play/:storyId/begin`) plus play-page guard redirect behavior.
  - Added briefing data helpers, a new briefing page template, briefing client controller, and briefing/home CSS updates.
  - Updated home page zero-page state to “Awaiting briefing” with “View Briefing” routing.
  - Expanded generation progress flow types with `begin-adventure`.
  - Added and updated unit/client/view tests for new behavior.
- **Deviations from original plan**:
  - Backward-compatibility behavior in web flows was not retained by design; routes now follow prepare→briefing→begin architecture.
  - Client redirect assertions were validated through request/flow tests instead of direct location mutation assertions due jsdom navigation limitations.
- **Verification**:
  - `npm run build`
  - `npx jest test/unit/engine/story-service.test.ts test/unit/engine/story-engine.test.ts test/unit/engine/index.test.ts test/unit/server/routes/stories.test.ts test/unit/server/routes/play.test.ts test/unit/server/services/generation-progress.test.ts test/unit/server/utils/briefing-helpers.test.ts test/unit/server/views/briefing.test.ts test/unit/server/views/home.test.ts test/unit/server/views-copy.test.ts test/unit/client/new-story-page/form-submit.test.ts test/unit/client/briefing-page/begin-adventure.test.ts`
  - `npm run lint`
  - `npm run typecheck`
