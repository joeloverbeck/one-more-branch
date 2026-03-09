# CHABUIPIP-20: EJS View and Client JavaScript

**Status**: COMPLETED
**Dependencies**: CHABUIPIP-17
**Estimated diff size**: ~700 lines across 8-10 files

## Summary

Finish the character-web UI surface that is still missing after the backend/service work: render the character-web page, add the client-side controller, expose entry points from the home page, and add the optional character-web selector to story creation.

## Reassessed Assumptions

- The backend is not "untouched" here. `src/server/routes/character-webs.ts` currently exposes JSON API endpoints only; it does not render `GET /character-webs`, so a route change is required for the page to exist.
- Story creation backend support for `webId` already exists. `src/server/services/story-creation-service.ts`, `src/server/routes/stories.ts`, and their tests already trim and forward `webId`. The missing work is the new-story UI control, not server-side story creation plumbing.
- The proposed client file name `public/js/src/11-character-webs.js` is stale. Files `11-15` already exist, so the new controller must use the next available slot and integrate with the current initialization flow in `public/js/src/09-controllers.js`.
- Progress display is no longer a hand-maintained constant concern. Stage labels/phrases are generated from `src/config/generation-stage-metadata.json` into `public/js/src/00-stage-metadata.js`; the character-web UI should reuse the existing loading-progress controller rather than invent its own spinner logic.
- Existing test coverage already includes route APIs for character webs and server-side `webId` trimming. The missing coverage is view rendering plus client behavior for the new page and new-story selector.

## File List

- `src/server/routes/character-webs.ts` (MODIFY — add page render route)
- `src/server/views/pages/character-webs.ejs` (CREATE)
- `public/js/src/16-character-webs-controller.js` (CREATE)
- `public/js/src/09-controllers.js` (MODIFY — initialize the new page controller)
- `src/server/views/pages/home.ejs` (MODIFY — add "Character Webs" card/link)
- `src/server/views/pages/new-story.ejs` (MODIFY — add "Load Character Web" dropdown)
- `test/unit/server/routes/character-webs.test.ts` (MODIFY — cover page render route)
- `test/unit/server/views/home.test.ts` (MODIFY — assert home navigation entry)
- `test/unit/server/views/new-story-template.test.ts` (MODIFY — assert character-web selector contract)
- `test/unit/client/new-story-page/form-submit.test.ts` (MODIFY — assert selected webId is POSTed)
- `test/unit/client/character-webs-page/*.test.ts` (CREATE — page controller behavior)
- `public/js/app.js` (REGENERATE via `node scripts/concat-client-js.js`)

## Out of Scope

- Do NOT modify backend service contracts unless a UI integration bug exposes a real contract gap
- Do NOT rewrite existing client controllers wholesale; keep changes surgical
- Do NOT modify the play page or any story-related views
- Do NOT modify the concat script itself
- Do NOT add new npm dependencies for frontend

## Detailed Changes

### `src/server/views/pages/character-webs.ejs`:

Single page with four panels:

1. **Web management panel**:
   - List existing webs with name, creation date, character count
   - "Create New Web" form: name field, optional kernel/concept selector, user notes textarea
   - Delete button per web

2. **Web display panel** (shown when a web is selected):
   - Cast roles displayed as cards (character name, story function, depth, archetype)
   - Relationship archetypes displayed as a relationship map/list
   - Cast dynamics summary
   - Generate/Regenerate buttons

3. **Character list panel**:
   - Shows each character from the web's assignments
   - Development status badges (stages 1-5, color-coded: grey=pending, yellow=in-progress, green=complete)
   - "Initialize" button for unstarted characters
   - Click to open character development panel

4. **Character development panel** (accordion):
   - 5 collapsible sections, one per stage
   - Each section shows: stage name, status, Generate/Regenerate button
   - When generated: displays stage output in readable format
   - Progress spinner during generation (uses existing spinner pattern)

### `src/server/routes/character-webs.ts`:

- Add `GET /character-webs` page rendering for `pages/character-webs`
- Keep existing JSON API behavior intact
- Prefer a single route module owning both HTML render and API endpoints for this feature area

### `public/js/src/16-character-webs-controller.js`:

Client controller following existing bundle patterns:

- Fetch webs list on page load
- AJAX calls for all CRUD operations
- Progress polling for generation endpoints via `createLoadingProgressController()`
- DOM manipulation for panel switching
- API key handling (from session storage, matching existing pattern)

### `src/server/views/pages/home.ejs`:

Add a "Character Webs" card/link alongside existing navigation (kernels, concepts, etc.).

### `src/server/views/pages/new-story.ejs`:

Add optional "Load Character Web" dropdown:

- Fetches available webs via `/character-webs/api/list`
- When selected, includes the chosen `webId` in spine generation and story creation AJAX payloads
- When not selected (or "None" chosen), story creation proceeds without `webId`
- The UI should make the tradeoff explicit: selecting a web augments character decomposition, but the free-text protagonist concept still remains required under the current story-creation contract

### Regenerate `app.js`:

After creating `16-character-webs-controller.js`, run:

```bash
node scripts/concat-client-js.js
```

## Acceptance Criteria

### Tests that must pass

- Focused route/view/client tests for this ticket
- `npm run test:client` passes (client tests run against generated `app.js`)
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants

- `app.js` is regenerated (NEVER edited directly)
- Client JS follows the current numbered-source IIFE pattern in `public/js/src/`
- Progress polling reuses generated stage metadata via the existing loading-progress controller
- API key handled via session storage (matching existing pattern in other views)
- Home page still shows all existing links/cards
- New-story page still works without selecting a web
- Story creation continues to require `characterConcept`; this ticket does not redefine the story input contract
- No new npm dependencies introduced
- All existing tests pass unchanged

## Architectural Notes

- The better long-term shape here is one feature-owned page controller plus small helpers, not more logic piled into `09-controllers.js`. Only the page bootstrap should be added there.
- Do not introduce alias routes, alternate payload names, or compatibility shims. The UI should target the existing `webId` contract directly.
- If implementation reveals that story creation should derive `characterConcept` from the selected web instead of requiring both, treat that as a separate architectural ticket rather than smuggling a backend contract rewrite into this UI task.

## Outcome

- Completion date: 2026-03-09
- What changed:
  - Added the rendered `GET /character-webs` page shell plus a dedicated client controller for web management, generation, character initialization, and per-stage character development.
  - Added home-page entry and new-story character-web selector UI, wiring selected `webId` through the existing story-creation contract.
  - Added route/view/client coverage and refreshed generated `public/js/app.js`.
- Deviations from original plan:
  - The ticket originally assumed no route changes; a render route was required and was added.
  - Saved kernel/concept selectors hydrate summary text into the existing create-web contract instead of changing backend create payloads to persist selector IDs.
  - The new client file landed as `16-character-webs-controller.js` because slots `11-15` were already occupied.
- Verification:
  - `npm test`
  - `npm run test:client`
  - `npm run lint`
  - `npm run typecheck`
