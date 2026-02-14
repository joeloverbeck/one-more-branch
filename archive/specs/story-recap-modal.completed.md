# Story Recap Modal — "The Story So Far" on Play Page

**Status**: COMPLETED
**Priority**: Enhancement
**Scope**: UI feature — expose chronological scene summaries from the current branch as a scrollable recap modal on the play page

## Overview

Players in long story sessions lose track of what happened earlier in their branch. The engine already generates a `sceneSummary` string for every page and stores it in `page_N.json`. This feature surfaces those summaries as a chronological recap — a "The Story So Far" modal showing all ancestor summaries from page 1 through the current page.

## Assumption Reassessment (2026-02-14)

- **CSS location correction**: Play-page modal/button styling is maintained in `public/css/styles.css`, not inline in `src/server/views/pages/play.ejs`. This spec updates styling work to that stylesheet.
- **Client runtime/test harness correction**: Client tests execute generated `public/js/app.js` (via `test/unit/client/helpers/app-loader.ts`). Any new source file in `public/js/src/` requires bundle regeneration with `npm run concat:js` before client tests.
- **Modal pattern correction**: Existing modals are split by placement:
  - Insights trigger lives in `#story-header-actions` and is managed by `05c-analyst-insights.js`.
  - Lore trigger is anchored in left sidebar (`#left-sidebar-widgets`) and managed by `05d-lore-modal.js`.
  For recap in header actions, follow the **insights** placement pattern for trigger location and the shared modal open/close interaction pattern.
- **Engine boundary correction**: Route modules currently consume engine functionality through `src/engine/index.ts`. New recap collection should be exported via the engine barrel and imported from `../../engine/index.js` in `src/server/routes/play.ts` to keep route dependencies stable and explicit.
- **Data edge-case correction**: `Page.sceneSummary` is always a string, but can be empty after normalization (`trim()` in `createPage`). Recap collection/rendering should skip empty summaries.

## Data Source

### Scene Summary

```typescript
// src/models/page.ts
export interface Page {
  readonly sceneSummary: string; // Brief summary of what happened on this page
  readonly parentPageId: PageId | null; // Link to parent for chain walking
  // ...
}
```

- Simple string field on every `Page`, stored in `stories/{storyId}/page_N.json`
- Produced by the writer LLM stage during page generation
- Already consumed by prompts via `ancestor-collector.ts` for narrative continuity

### Ancestor Chain Walking

`src/engine/ancestor-collector.ts` already walks the parent chain to collect `AncestorSummary[]` for LLM prompts, but it:
- Caps at 10 ancestors (constant `MAX_ANCESTORS`)
- Skips the parent and grandparent summaries (uses full narrative text instead)
- Only collects summaries for pages 3+ back

The recap feature needs a simpler, uncapped variant that collects ALL page summaries in the branch.

### Existing Prompt Usage

Scene summaries feed into three prompt stages (for reference, not modified by this spec):
- **Planner prompt** (`src/llm/prompts/sections/continuation/continuation-context.ts`): `EARLIER SCENE SUMMARIES` section
- **Lorekeeper prompt** (`src/llm/prompts/lorekeeper-prompt.ts`): `ANCESTOR PAGE SUMMARIES` section
- **Writer prompt** (`src/llm/prompts/sections/continuation/context-sections.ts`): `EARLIER SCENE SUMMARIES` section (replaced by Story Bible when present)

## Design Decisions

- **Scope**: Current branch only (ancestor chain from page 1 to current page)
- **Placement**: Header actions bar, next to "Story Insights" button
- **Data loading**: Eager/embedded (JSON block injected into page HTML, like `#lore-data`)

## UI Design

### Trigger Button

- Location: inside `#story-header-actions` div (alongside existing "Story Insights" button)
- Always visible (even on page 1 with just one summary)
- Text: scroll emoji + "Story So Far"
- Attributes: `aria-haspopup="dialog"`, `aria-controls="recap-modal"`

### Modal

- Follows existing insights/lore modal interaction pattern
- Header: "The Story So Far" title + close button (X)
- Close triggers: X button click, overlay/backdrop click, Escape key
- Body: scrollable list of summaries in chronological order (oldest first)
- Each summary rendered as a paragraph with a subtle page number label
- Scrollable when content exceeds viewport (`max-height: 88vh`, `overflow-y: auto`)

## Implementation

### 1. New utility — `src/engine/recap-collector.ts`

```typescript
import type { PageId, StoryId } from '../models';
import { storage } from '../persistence';
import type { Page } from '../models';

export interface RecapEntry {
  readonly pageId: PageId;
  readonly summary: string;
}

/**
 * Walks the full ancestor chain from the given page back to page 1,
 * collecting scene summaries in chronological (oldest-first) order.
 * No cap on ancestor count. Includes the current page's own summary.
 * Skips pages with empty/missing sceneSummary.
 */
export async function collectRecapSummaries(
  storyId: StoryId,
  currentPage: Page
): Promise<readonly RecapEntry[]> {
  // Collect current page + all ancestors
  const entries: RecapEntry[] = [];

  if (currentPage.sceneSummary) {
    entries.push({ pageId: currentPage.id, summary: currentPage.sceneSummary });
  }

  let currentPageId: PageId | null = currentPage.parentPageId;
  while (currentPageId !== null) {
    const page = await storage.loadPage(storyId, currentPageId);
    if (!page) break;
    if (page.sceneSummary) {
      entries.push({ pageId: page.id, summary: page.sceneSummary });
    }
    currentPageId = page.parentPageId;
  }

  // Reverse to chronological order (oldest first)
  return entries.reverse();
}
```

### 2. Backend — `src/server/routes/play.ts`

**GET `/:storyId` handler** (~line 209):

- Import `collectRecapSummaries` from `../../engine/index.js` (engine barrel export)
- After loading the page (~line 222), call: `const recapSummaries = await collectRecapSummaries(storyId as StoryId, page);`
- Add `recapSummaries` to the `res.render()` locals

**POST `/:storyId/choice` handler** (~line 280):

- After getting `result.page`, call: `const recapSummaries = await collectRecapSummaries(storyId as StoryId, result.page);`
- Add `recapSummaries` to the JSON response (top-level, alongside `page`)

### 3. Template — `src/server/views/pages/play.ejs`

**Trigger button** (in `#story-header-actions`, ~line 88):

```html
<button type="button" class="recap-btn" id="recap-btn"
        aria-haspopup="dialog" aria-controls="recap-modal">
  <span class="recap-btn__icon" aria-hidden="true">&#x1f4dc;</span>
  <span class="recap-btn__label">Story So Far</span>
</button>
```

**Modal HTML** (near existing modal markup):

```html
<div class="modal recap-modal" id="recap-modal" style="display: none;"
     role="dialog" aria-modal="true" aria-labelledby="recap-modal-title">
  <div class="modal-content recap-modal-content">
    <div class="recap-header">
      <h3 id="recap-modal-title">The Story So Far</h3>
      <button type="button" class="recap-close-btn" id="recap-close-btn"
              aria-label="Close Story Recap">&times;</button>
    </div>
    <div class="recap-body" id="recap-modal-body"></div>
  </div>
</div>
```

**JSON data block** (near existing `#lore-data`):

```html
<script type="application/json" id="recap-data">
  <%- JSON.stringify(recapSummaries) %>
</script>
```

### 4. Client JS — New file `public/js/src/05e-recap-modal.js`

**`parseRecapDataFromDom()`**

- Reads and parses `#recap-data` script tag
- Returns `RecapEntry[]` (array of `{pageId, summary}`)
- Returns `[]` on missing/invalid data

**`createRecapModalController(initialData)`**

- Returns `{ update(newRecapData) }`
- On creation: renders summaries, wires modal open/close

Internal behavior:

- **Modal open**: `#recap-btn` click sets `#recap-modal` to `display: flex`
- **Modal close**: close button click, overlay click (`event.target === modal`), Escape key
- **Render**: Each recap entry as a paragraph block with subtle page number label (e.g., "Scene 1", "Scene 2")
- **Empty state**: "No scenes recorded yet" message (edge case for page 1 before summary exists)
- **`update(recapEntries)`**: re-render body with new data

### 5. Controller integration — `public/js/src/09-controllers.js`

In `initPlayPage()`:

```javascript
var recapController = createRecapModalController(parseRecapDataFromDom());
```

After successful choice response processing (~line 257):

```javascript
recapController.update(data.recapSummaries || []);
```

### 6. CSS

Add styles in `public/css/styles.css` (consistent with existing insights/lore modal styling):

- `.recap-btn` — styled like `.insights-btn`
- `.recap-modal-content` — `width: min(92vw, 600px)`, `max-height: 88vh`, flex column
- `.recap-header` — flex row, space-between, border bottom
- `.recap-close-btn` — styled like `.insights-close-btn`
- `.recap-body` — `overflow-y: auto`, `flex: 1`, padding
- `.recap-entry` — paragraph styling with bottom border/spacing
- `.recap-page-label` — subtle, smaller text for "Scene N"

### 7. Rebuild client bundle

```bash
node scripts/concat-client-js.js
```

## Files to Modify

| File | Action |
|------|--------|
| `src/engine/recap-collector.ts` | **Create** — ancestor chain walker for recap |
| `src/engine/index.ts` | **Edit** — export recap collector through engine barrel |
| `src/server/routes/play.ts` | **Edit** — add recap data to GET and POST responses |
| `src/server/views/pages/play.ejs` | **Edit** — add button, modal HTML, JSON block, CSS |
| `public/js/src/05e-recap-modal.js` | **Create** — recap modal controller |
| `public/js/src/09-controllers.js` | **Edit** — init and update recap controller |
| `public/css/styles.css` | **Edit** — recap button/modal/entries styling |
| `public/js/app.js` | **Regenerated** via concat script |

## Reusable Existing Code

- **Modal pattern**: Copy structure from `public/js/src/05d-lore-modal.js` (open/close/escape/overlay)
- **CSS classes**: Reuse `.modal`, `.modal-content` base styles
- **Storage access**: Use `storage.loadPage()` from `src/persistence/` (same as ancestor-collector)
- **JSON injection pattern**: Follow `#lore-data` / `#insights-context` embedding pattern
- **Controller update pattern**: Follow `loreController.update()` / `insightsController.update()` in `09-controllers.js`

## Testing

### Unit tests — `test/unit/engine/recap-collector.test.ts`

- Single page (no ancestors) returns just current page summary
- Linear chain of 5 pages returns all 5 in chronological order
- Pages with empty `sceneSummary` are skipped
- Broken chain (missing page in middle) stops at break point
- Page 1 with no parent returns single entry

### Route handler tests — `test/unit/server/routes/play.test.ts`

- GET play response includes `recapSummaries` in render locals
- POST choice success response includes `recapSummaries` array

### Server view tests — `test/unit/server/views/play.test.ts`

- Template includes recap button, recap modal scaffold, and `#recap-data` JSON script node

### Client tests — `test/unit/client/play-page/recap-modal.test.ts`

- `parseRecapDataFromDom()` valid + invalid paths
- Modal open/close triggers (button, X, overlay, Escape)
- Renders summaries in correct order with page labels
- Empty state rendering
- `update()` replaces content with new data

### Client fixture update — `test/unit/client/fixtures/html-fixtures.ts`

- Add recap button, modal, and `#recap-data` script markup

### Verification commands

```bash
npm run build        # No TypeScript errors
npm run lint         # No warnings
npm run test:unit    # All unit tests pass
npm run test:client  # Client tests pass
```

## Manual Verification

1. Start a story and advance through several pages
2. Confirm "Story So Far" button appears in header actions bar
3. Click button — modal opens showing all scene summaries in chronological order
4. Verify each summary has a page/scene number label
5. Scroll through summaries on a long story
6. Close modal via X button, overlay click, and Escape key
7. Make a choice — confirm modal updates with the new page's summary included
8. Navigate back to an earlier page — confirm modal shows only that branch's summaries
9. Verify on narrow screens (responsive)
10. Check page 1 — modal shows single entry

## Key Invariants

- Recap data reflects the current branch ancestor chain only, not all explored pages
- Summaries are always in chronological order (oldest first)
- No cap on ancestor count (unlike `ancestor-collector.ts` which caps at 10)
- Pages with empty `sceneSummary` are silently skipped
- Modal accessibility: dialog role, aria-modal, keyboard escape
- Recap updates correctly after AJAX choice navigation without page reload

## Outcome

- **Completion date**: 2026-02-14
- **What was changed**:
  - Added `src/engine/recap-collector.ts` and exported it through `src/engine/index.ts`.
  - Wired recap data into play routes (`GET /:storyId`, `POST /:storyId/choice`) via `recapSummaries`.
  - Added recap trigger/modal/data node in `src/server/views/pages/play.ejs`.
  - Added recap UI controller in `public/js/src/05e-recap-modal.js` and integrated it in `public/js/src/09-controllers.js`.
  - Added recap styles in `public/css/styles.css`.
  - Regenerated `public/js/app.js`.
  - Added/updated tests across engine, route, view template, client fixtures, and client play-page behavior.
- **Deviations from original plan**:
  - CSS was implemented in `public/css/styles.css` instead of inline template styles to match the existing stylesheet architecture.
  - Route import uses engine barrel export (`../../engine/index.js`) rather than direct file import, preserving module boundary consistency.
  - Added server-view template tests (`test/unit/server/views/play.test.ts`) in addition to route/client/engine tests for stronger contract coverage.
- **Verification results**:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm run test:unit` passed.
  - `npm run test:client` passed.
