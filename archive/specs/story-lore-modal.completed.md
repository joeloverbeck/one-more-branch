# Story Lore Modal — Canon Display on Play Page

**Status**: COMPLETED
**Priority**: Enhancement
**Scope**: UI feature — expose `globalCanon` and `globalCharacterCanon` to the player via a tabbed modal on the play page

## Reassessed Assumptions (Before Implementation)

This ticket was reassessed against the current codebase before implementation.

- `specs/story-role-modal.md` does not exist; the active ticket is `specs/story-lore-modal.md`.
- GET `/play/:storyId` already passes `story` into the template. Duplicating canon as separate top-level render fields would be redundant and less maintainable.
- POST `/play/:storyId/choice` currently returns the new `page` payload but not story-level canon fields; this is the required backend gap for live modal updates.
- The left sidebar is dynamically re-rendered after choices (`renderAffectPanel`, `renderInventoryPanel`, `renderHealthPanel`). A lore trigger anchored visually at the bottom must be explicitly kept at the end of `#left-sidebar-widgets` after each re-render.
- Client-side play tests depend on `test/unit/client/fixtures/html-fixtures.ts`; adding lore UI requires fixture updates in addition to new tests.

## Overview

`globalCanon` (world facts) and `globalCharacterCanon` (per-character facts) accumulate throughout a story as the state accountant LLM stage establishes permanent truths. These facts persist in `story.json` and feed into LLM prompt context (via the lorekeeper), but are invisible to the player. This ticket adds a "Story Lore" modal accessible from a button in the left sidebar, allowing players to consult accumulated canon as a living story bible.

## Data Source

### Global Canon

```typescript
// src/models/state/canon.ts
export type CanonFact = string;
export type GlobalCanon = readonly CanonFact[];
```

- Flat array of strings (e.g., `"The citadel stands"`, `"The year is 1972"`)
- Grows across branches as permanent truths are established
- Deduplicated case-insensitively by `addCanonFact()` in `src/engine/canon-manager.ts`
- Stored on `Story.globalCanon` in `stories/{storyId}/story.json`

### Global Character Canon

```typescript
// src/models/state/character-canon.ts
export type CharacterCanonFact = string;
export type CharacterCanon = readonly CharacterCanonFact[];
export type GlobalCharacterCanon = Readonly<Record<string, CharacterCanon>>;
```

- Record mapping character names to arrays of fact strings
- Example: `{ "Bobby Western": ["Bobby is in a coma", "Inherited gold"], "Dr Cohen": ["Psychiatrist at Stella Maris"] }`
- Character name lookup is case-insensitive but preserves first-seen casing
- Managed by `src/engine/character-canon-manager.ts`
- Stored on `Story.globalCharacterCanon` in `stories/{storyId}/story.json`

### Canon Production Flow

Only the **state accountant** LLM stage produces canon facts (`stateIntents.canon.worldAdd` and `stateIntents.canon.characterAdd`). These flow through reconciliation normalization (`src/engine/reconciler-canon-normalization.ts`), merge into the `StateReconciliationResult`, and are saved to the story via `updateStoryWithAllCanon()` in `src/engine/page-service.ts`.

## UI Design

### Trigger Button

- Location: inside `#left-sidebar-widgets`
- Always visible (even when canon is empty)
- Text: "Story Lore" with inline count badge showing total fact count
- Count = world facts count + sum of all character fact counts
- Styled as a subtle button consistent with sidebar panel aesthetic
- Attributes: `aria-haspopup="dialog"`, `aria-controls="lore-modal"`
- Must remain at the bottom of the left sidebar after dynamic sidebar panel re-renders

### Modal

- Follows existing insights modal interaction pattern
- Header: "Story Lore" title + close button (X)
- Close triggers: X button click, overlay/backdrop click, Escape key
- Two tabs with ARIA tab pattern (`role="tablist"`, `role="tab"`, `role="tabpanel"`)

### World Tab

- Default active tab
- Content: `<ul>` bullet list of all world facts in insertion order
- Empty state: "No world facts established yet" message

### Characters Tab

- Content: list of character name headers, each expandable/collapsible
- Click a character name to toggle visibility of their facts below it
- Facts displayed as `<ul>` bullet list under each character
- All characters start collapsed
- Empty state: "No character facts established yet" message

## Implementation

### 1. Backend — `src/server/routes/play.ts`

**GET `/:storyId` handler**

- No new render fields required.
- Use existing `story` object in the template (`story.globalCanon`, `story.globalCharacterCanon`).

**POST `/:storyId/choice` handler**

Add to the JSON response (top-level, alongside `page`):

```typescript
globalCanon: story?.globalCanon ?? [],
globalCharacterCanon: story?.globalCharacterCanon ?? {},
```

`story` is already loaded in the handler for act display info; no additional fetch should be added.

### 2. Template — `src/server/views/pages/play.ejs`

**Left sidebar trigger button**

Insert within `#left-sidebar-widgets` (after existing panels):

```html
<button type="button" class="lore-trigger-btn" id="lore-trigger-btn"
        aria-haspopup="dialog" aria-controls="lore-modal">
  Story Lore
  <span class="lore-count-badge" id="lore-count-badge">
    (<%= (story.globalCanon.length + Object.values(story.globalCharacterCanon).reduce((sum, facts) => sum + facts.length, 0)) %>)
  </span>
</button>
```

**Lore modal**

Insert near existing modal markup (with unique IDs):

```html
<div class="modal lore-modal" id="lore-modal" style="display: none;"
     role="dialog" aria-modal="true" aria-labelledby="lore-modal-title">
  <div class="modal-content lore-modal-content">
    <div class="lore-header">
      <h3 id="lore-modal-title">Story Lore</h3>
      <button type="button" class="lore-close-btn" id="lore-close-btn"
              aria-label="Close Story Lore">&times;</button>
    </div>
    <div class="lore-tabs" role="tablist">
      <button class="lore-tab lore-tab--active" role="tab" aria-selected="true"
              data-tab="world" id="lore-tab-world"
              aria-controls="lore-panel-world">World</button>
      <button class="lore-tab" role="tab" aria-selected="false"
              data-tab="characters" id="lore-tab-characters"
              aria-controls="lore-panel-characters">Characters</button>
    </div>
    <div class="lore-body" id="lore-modal-body">
      <div class="lore-tab-panel" id="lore-panel-world"
           role="tabpanel" aria-labelledby="lore-tab-world"></div>
      <div class="lore-tab-panel" id="lore-panel-characters"
           role="tabpanel" aria-labelledby="lore-tab-characters"
           style="display: none;"></div>
    </div>
  </div>
</div>
```

**JSON data script tag**

Insert near existing play-page JSON script tags:

```html
<script type="application/json" id="lore-data">
  <%- JSON.stringify({ worldFacts: story.globalCanon, characterCanon: story.globalCharacterCanon }) %>
</script>
```

### 3. Client JS — New file `public/js/src/05d-lore-modal.js`

Add lore modal logic in a dedicated module before controllers.

**`parseLoreDataFromDom()`**

- Reads and parses `#lore-data` script tag
- Returns `{ worldFacts: string[], characterCanon: Record<string, string[]> }`
- Returns `{ worldFacts: [], characterCanon: {} }` on missing/invalid data

**`createLoreModalController(initialData)`**

- Returns `{ update(worldFacts, characterCanon) }`
- On creation: renders tab panels, wires modal open/close, wires tab switching

Internal behavior:

- **Tab switching**: toggle `lore-tab--active`, panel visibility, and `aria-selected`
- **Modal open**: `#lore-trigger-btn` click sets `#lore-modal` to visible
- **Modal close**: close button, overlay click (`event.target === modal`), Escape key
- **World tab render**: list facts or empty-state message
- **Characters tab render**: collapsible character cards, all collapsed by default
- **`update(worldFacts, characterCanon)`**: re-render panels, update count badge
- **Trigger ordering invariant**: controller ensures `#lore-trigger-btn` is appended as the last child of `#left-sidebar-widgets` after each update so it stays visually at the bottom

### 4. Controller integration — `public/js/src/09-controllers.js`

In `initPlayPage()`:

```javascript
const loreController = createLoreModalController(parseLoreDataFromDom());
```

After successful choice response processing:

```javascript
loreController.update(data.globalCanon || [], data.globalCharacterCanon || {});
```

### 5. CSS — `public/css/styles.css`

Add styles consistent with existing theme:

- Lore trigger button + count badge
- Lore modal content/header/close button
- Lore tabs + active state
- Lore body and scroll behavior
- World fact list
- Character cards and expanded state
- Empty state text

### 6. Rebuild client bundle

After adding/modifying `public/js/src/*.js`:

```bash
node scripts/concat-client-js.js
```

## Testing

### Route handler tests (`test/unit/server/routes/play.test.ts`)

- Update POST choice success assertions to include `globalCanon` and `globalCharacterCanon`
- Add/adjust a focused POST test verifying canon fields are returned from loaded story
- Do **not** add GET render assertions for duplicated top-level canon fields (they should not exist)

### Client tests

- Add new lore modal test file (e.g., `test/unit/client/play-page/lore-modal.test.ts`) covering:
  - `parseLoreDataFromDom()` valid + invalid paths
  - modal open/close triggers
  - tab switching
  - empty states
  - character collapse/expand
  - `update()` updating list content and badge count
  - trigger staying at bottom after sidebar re-render driven by choice response
- Update `test/unit/client/fixtures/html-fixtures.ts` to include lore button/modal/data script markup used by client tests

### Verification commands

1. `npm run test:unit`
2. `npm run test:client`
3. `npm run lint`

## Manual Verification

1. Start a story and advance pages
2. Confirm "Story Lore" button is present in the left sidebar with count
3. Open modal and verify World/Characters tabs render expected facts
4. Switch tabs and toggle character cards
5. Make choices that generate canon updates
6. Confirm badge and modal content update without page reload
7. Verify close via X, overlay click, and Escape
8. Verify empty canon state is graceful
9. Verify button remains at sidebar bottom while panels appear/disappear
10. Verify behavior on narrow screens

## Key Invariants

- Canon data source is `Story` only; no duplicate GET render fields for canon
- Choice response canon fields reflect latest persisted story canon
- Lore UI remains stable when left sidebar panels are dynamically re-rendered
- Empty canon renders explicit empty states
- Modal accessibility: dialog semantics, keyboard escape, tab controls
- Count badge always matches rendered data

## Outcome

- Completion date: 2026-02-14
- Implemented:
  - Added Story Lore modal UI and trigger on play page (`src/server/views/pages/play.ejs`)
  - Added lore controller/parser module (`public/js/src/05d-lore-modal.js`) and integrated it in play controllers
  - Added canonical data fields to choice response (`src/server/routes/play.ts`)
  - Added lore styling (`public/css/styles.css`)
  - Updated client fixture DOM to include lore markup/data (`test/unit/client/fixtures/html-fixtures.ts`)
  - Added route and client tests for lore behavior (`test/unit/server/routes/play.test.ts`, `test/unit/client/play-page/lore-modal.test.ts`)
- Deviations from original plan:
  - Did not add duplicate canon fields to GET render locals; template reads from existing `story` object directly
  - Implemented lore module as `public/js/src/05d-lore-modal.js` (not `10-lore-modal.js`) to keep controller dependencies ordered with existing source layout
  - Explicitly moved lore update execution after left-sidebar panel re-renders so the trigger remains anchored at the bottom
- Verification:
  - `npm run test:unit` passed
  - `npm run test:client` passed
  - `npm run lint` passed
