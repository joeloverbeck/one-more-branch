# USEINT-004: Home Page Routes and View

## Summary

Implement the home page route that displays a list of existing stories and a button to start a new adventure.

## Files to Create

- `src/server/routes/home.ts` - Home page route handler
- `src/server/views/pages/home.ejs` - Home page template

## Files to Modify

- `src/server/routes/index.ts` - Mount home routes

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify layout or partials (USEINT-003)
- **DO NOT** add CSS styling (USEINT-007)
- **DO NOT** add story creation routes (USEINT-005)
- **DO NOT** add play routes (USEINT-006)

## Implementation Details

### `src/server/routes/home.ts`

```typescript
import { Router, Request, Response } from 'express';
import { storyEngine } from '../../engine/index.js';

export const homeRoutes = Router();

/**
 * Home page - displays available stories and new adventure button
 */
homeRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const stories = await storyEngine.listStories();

    // Get stats for each story
    const storiesWithStats = await Promise.all(
      stories.map(async story => {
        const stats = await storyEngine.getStoryStats(story.id);
        return {
          ...story,
          ...stats,
        };
      })
    );

    res.render('pages/home', {
      title: 'One More Branch',
      stories: storiesWithStats,
    });
  } catch (error) {
    console.error('Error loading home page:', error);
    res.status(500).render('pages/error', {
      title: 'Error',
      message: 'Failed to load stories',
    });
  }
});
```

### `src/server/views/pages/home.ejs`

```html
<% layout('layouts/main') -%>

<section class="hero">
  <h1>One More Branch</h1>
  <p class="tagline">Your choices shape the story</p>
  <a href="/stories/new" class="btn btn-primary btn-large">Start New Adventure</a>
</section>

<% if (stories.length > 0) { %>
<section class="stories-section">
  <h2>Continue an Adventure</h2>
  <div class="stories-grid">
    <% stories.forEach(story => { %>
    <article class="story-card">
      <div class="story-card-content">
        <h3 class="story-title"><%= story.characterConcept.slice(0, 100) %><%= story.characterConcept.length > 100 ? '...' : '' %></h3>
        <p class="story-tone"><%= story.tone %></p>
        <div class="story-stats">
          <span><%= story.pageCount %> pages</span>
          <span><%= story.exploredBranches %>/<%= story.totalBranches %> branches</span>
          <% if (story.hasEnding) { %>
          <span class="has-ending">Has endings</span>
          <% } %>
        </div>
        <p class="story-date">Created: <%= new Date(story.createdAt).toLocaleDateString() %></p>
      </div>
      <div class="story-card-actions">
        <a href="/play/<%= story.id %>?page=1" class="btn btn-secondary">Play</a>
        <form action="/stories/<%= story.id %>/delete" method="POST" class="inline-form">
          <button type="submit" class="btn btn-danger btn-small" onclick="return confirm('Delete this story? This cannot be undone.')">Delete</button>
        </form>
      </div>
    </article>
    <% }) %>
  </div>
</section>
<% } else { %>
<section class="empty-state">
  <p>No adventures yet. Start your first story!</p>
</section>
<% } %>
```

### Update `src/server/routes/index.ts`

```typescript
import { Router } from 'express';
import { homeRoutes } from './home.js';

export const router = Router();

router.use('/', homeRoutes);
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/routes/home.test.ts`:

1. GET / returns 200 status when stories exist
2. GET / returns 200 status when no stories exist
3. GET / renders 'pages/home' template
4. GET / passes title 'One More Branch' to template
5. GET / fetches stories from storyEngine.listStories()
6. GET / fetches stats for each story via getStoryStats()
7. GET / returns 500 and renders error page when engine throws
8. Stories array includes pageCount, exploredBranches, totalBranches, hasEnding

**Tests must mock `storyEngine`** - no actual persistence or LLM calls.

### Test Implementation Notes

```typescript
jest.mock('../../engine/index.js', () => ({
  storyEngine: {
    init: jest.fn(),
    listStories: jest.fn(),
    getStoryStats: jest.fn(),
  },
}));
```

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/routes/home.test.ts
```

## Invariants That Must Remain True

1. **No Engine Mutation**: Home page is read-only, never modifies stories
2. **Graceful Error Handling**: Errors render error page, don't crash server
3. **Data Completeness**: Each story card shows stats (page count, branches, endings)
4. **Truncation Safety**: Long character concepts are truncated with ellipsis
5. **Delete Confirmation**: Delete button requires user confirmation

## Dependencies

- Depends on USEINT-001 for Express setup
- Depends on USEINT-002 for error handling
- Depends on USEINT-003 for layout and error page

## Estimated Size

~180 LOC (source + tests)
