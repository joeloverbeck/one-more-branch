# CHABUIPIP-20: EJS View and Client JavaScript

**Status**: NOT STARTED
**Dependencies**: CHABUIPIP-17
**Estimated diff size**: ~400 lines across 3 files

## Summary

Create the character webs EJS view, client-side JavaScript controller, and update the home page to link to the new feature. Also add the "Load Character Web" dropdown to the new-story page.

## File List

- `src/server/views/pages/character-webs.ejs` (CREATE)
- `public/js/src/11-character-webs.js` (CREATE)
- `src/server/views/pages/home.ejs` (MODIFY — add "Character Webs" card/link)
- `src/server/views/pages/new-story.ejs` (MODIFY — add "Load Character Web" dropdown)
- `public/js/app.js` (REGENERATE via `node scripts/concat-client-js.js`)

## Out of Scope

- Do NOT modify any backend service or route code
- Do NOT modify existing client JS files (01-10)
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

### `public/js/src/11-character-webs.js`:

Client controller following existing patterns (see `09-controllers.js`):
- Fetch webs list on page load
- AJAX calls for all CRUD operations
- Progress polling for generation endpoints (reuse existing spinner/progress pattern)
- DOM manipulation for panel switching
- API key handling (from session storage, matching existing pattern)

### `src/server/views/pages/home.ejs`:

Add a "Character Webs" card/link alongside existing navigation (kernels, concepts, etc.).

### `src/server/views/pages/new-story.ejs`:

Add optional "Load Character Web" dropdown:
- Fetches available webs via `/character-webs/api/list`
- When selected, populates a hidden `webId` field in the story creation form
- When not selected (or "None" chosen), story creation proceeds without web

### Regenerate `app.js`:

After creating `11-character-webs.js`, run:
```bash
node scripts/concat-client-js.js
```

## Acceptance Criteria

### Tests that must pass

- `npm run test:client` passes (client tests run against generated `app.js`)
- `npm run typecheck` passes
- `npm run lint` passes

### Invariants

- `app.js` is regenerated (NEVER edited directly)
- Client JS follows existing IIFE/module pattern from other `src/*.js` files
- Progress polling uses existing `STAGE_DISPLAY_NAMES` and `STAGE_PHRASE_POOLS` from `01-constants.js`
- API key handled via session storage (matching existing pattern in other views)
- Home page still shows all existing links/cards
- New-story page still works without selecting a web (backwards compatible)
- No new npm dependencies introduced
- All existing tests pass unchanged
