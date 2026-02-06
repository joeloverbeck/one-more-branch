# USEINT-006: Play Routes and View

## Summary

Implement routes for story gameplay including page display, choice selection (AJAX), and restart functionality. The play page shows the current narrative, state changes, and available choices.

## Files to Create

- `src/server/routes/play.ts` - Play route handlers
- `src/server/views/pages/play.ejs` - Gameplay page template

## Files to Modify

- `src/server/routes/index.ts` - Mount play routes

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify layout or partials (USEINT-003)
- **DO NOT** add CSS styling (USEINT-007)
- **DO NOT** implement client-side JavaScript (USEINT-008)

## Implementation Details

### `src/server/routes/play.ts`

```typescript
import { Router, Request, Response } from 'express';
import { storyEngine } from '../../engine/index.js';
import { StoryId, PageId } from '../../models/index.js';

export const playRoutes = Router();

/**
 * Play a story - display current page
 */
playRoutes.get('/:storyId', async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const pageId = parseInt(req.query['page'] as string) || 1;

  try {
    const story = await storyEngine.loadStory(storyId as StoryId);
    if (!story) {
      return res.status(404).render('pages/error', {
        title: 'Not Found',
        message: 'Story not found',
      });
    }

    const page = await storyEngine.getPage(storyId as StoryId, pageId as PageId);
    if (!page) {
      return res.status(404).render('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    }

    res.render('pages/play', {
      title: `${story.characterConcept.slice(0, 50)} - One More Branch`,
      story,
      page,
      pageId,
    });
  } catch (error) {
    console.error('Error loading play page:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load story',
    });
  }
});

/**
 * Make a choice (AJAX endpoint)
 */
playRoutes.post('/:storyId/choice', async (req: Request, res: Response) => {
  const { storyId } = req.params;
  const { pageId, choiceIndex, apiKey } = req.body as {
    pageId?: number;
    choiceIndex?: number;
    apiKey?: string;
  };

  if (pageId === undefined || choiceIndex === undefined) {
    return res.status(400).json({ error: 'Missing pageId or choiceIndex' });
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  try {
    const result = await storyEngine.makeChoice({
      storyId: storyId as StoryId,
      pageId: pageId as PageId,
      choiceIndex,
      apiKey,
    });

    res.json({
      success: true,
      page: {
        id: result.page.id,
        narrativeText: result.page.narrativeText,
        choices: result.page.choices,
        stateChanges: result.page.stateChanges,
        isEnding: result.page.isEnding,
      },
      wasGenerated: result.wasGenerated,
    });
  } catch (error) {
    console.error('Error making choice:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process choice',
    });
  }
});

/**
 * Restart story
 */
playRoutes.get('/:storyId/restart', async (req: Request, res: Response) => {
  const { storyId } = req.params;
  res.redirect(`/play/${storyId}?page=1`);
});
```

### `src/server/views/pages/play.ejs`

```html
<% layout('layouts/main') -%>

<div class="play-container" data-story-id="<%= story.id %>" data-page-id="<%= page.id %>">
  <div class="story-header">
    <h2><%= story.characterConcept.slice(0, 60) %><%= story.characterConcept.length > 60 ? '...' : '' %></h2>
    <span class="page-indicator">Page <%= page.id %></span>
  </div>

  <article class="narrative" id="narrative">
    <div class="narrative-text">
      <%- page.narrativeText.replace(/\n/g, '<br>') %>
    </div>
  </article>

  <% if (page.stateChanges && page.stateChanges.length > 0) { %>
  <aside class="state-changes" id="state-changes">
    <h4>What happened:</h4>
    <ul>
      <% page.stateChanges.forEach(change => { %>
      <li><%= change %></li>
      <% }) %>
    </ul>
  </aside>
  <% } %>

  <% if (page.isEnding) { %>
  <div class="ending-banner">
    <h3>THE END</h3>
    <div class="ending-actions">
      <a href="/play/<%= story.id %>/restart" class="btn btn-primary">Play Again</a>
      <a href="/" class="btn btn-secondary">Back to Stories</a>
    </div>
  </div>
  <% } else { %>
  <section class="choices-section" id="choices-section">
    <h3>What do you do?</h3>
    <div class="choices" id="choices">
      <% page.choices.forEach((choice, index) => { %>
      <button
        class="choice-btn"
        data-choice-index="<%= index %>"
        <%= choice.nextPageId ? 'data-explored="true"' : '' %>
      >
        <%= choice.text %>
        <% if (choice.nextPageId) { %>
        <span class="explored-marker" title="Previously explored">↩</span>
        <% } %>
      </button>
      <% }) %>
    </div>
  </section>
  <% } %>

  <div class="loading-overlay" id="loading" style="display: none;">
    <div class="loading-spinner"></div>
    <p>Crafting your story...</p>
  </div>

  <!-- API Key Modal (shown if no key in session storage) -->
  <div class="modal" id="api-key-modal" style="display: none;">
    <div class="modal-content">
      <h3>Enter OpenRouter API Key</h3>
      <p>Your API key is needed to generate new story content.</p>
      <input type="password" id="modal-api-key" placeholder="sk-or-..." autocomplete="off">
      <div class="modal-actions">
        <button class="btn btn-primary" id="save-api-key">Continue</button>
        <a href="/" class="btn btn-secondary">Cancel</a>
      </div>
    </div>
  </div>
</div>
```

### Update `src/server/routes/index.ts`

```typescript
import { Router } from 'express';
import { homeRoutes } from './home.js';
import { storyRoutes } from './stories.js';
import { playRoutes } from './play.js';

export const router = Router();

router.use('/', homeRoutes);
router.use('/stories', storyRoutes);
router.use('/play', playRoutes);
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/routes/play.test.ts`:

**GET /play/:storyId:**
1. Returns 200 with valid story and page
2. Returns 404 when story not found
3. Returns 404 when page not found
4. Defaults to page 1 when no page query param
5. Passes story, page, and pageId to template
6. Truncates long character concept in title

**POST /play/:storyId/choice - Validation:**
7. Returns 400 JSON when pageId missing
8. Returns 400 JSON when choiceIndex missing
9. Returns 400 JSON when apiKey missing

**POST /play/:storyId/choice - Success:**
10. Calls storyEngine.makeChoice with correct params
11. Returns JSON with success: true
12. Returns page data (id, narrativeText, choices, stateChanges, isEnding)
13. Returns wasGenerated flag

**POST /play/:storyId/choice - Error:**
14. Returns 500 JSON with error message on engine error

**GET /play/:storyId/restart:**
15. Redirects to /play/{storyId}?page=1

**Tests must mock `storyEngine`** - no actual LLM calls.

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/routes/play.test.ts
```

## Invariants That Must Remain True

1. **No Back Button**: UI provides no way to go to previous pages
2. **Deterministic Display**: Same page always renders same content
3. **Explored Marker**: Previously explored choices show indicator
4. **Ending Consistency**: Ending pages show "THE END" banner, no choices
5. **AJAX for Choices**: Choice selection uses JSON API, not form POST
6. **API Key Required**: Choice endpoint requires API key in request body
7. **Page ID Parsing**: Page ID from query param is parsed as integer

## Dependencies

- Depends on USEINT-001 for Express setup
- Depends on USEINT-002 for error handling
- Depends on USEINT-003 for layout and error page
- Depends on USEINT-004, USEINT-005 for route structure

## Estimated Size

~280 LOC (source + tests)
