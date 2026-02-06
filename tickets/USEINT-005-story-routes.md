# USEINT-005: Story Creation Routes and View

## Summary

Implement routes for the new story form and story creation/deletion. The form captures character concept, worldbuilding, tone, and API key.

## Files to Create

- `src/server/routes/stories.ts` - Story management routes
- `src/server/views/pages/new-story.ejs` - New adventure form

## Files to Modify

- `src/server/routes/index.ts` - Mount story routes

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** modify layout or partials (USEINT-003)
- **DO NOT** add CSS styling (USEINT-007)
- **DO NOT** add play routes (USEINT-006)
- **DO NOT** implement client-side JavaScript (USEINT-008)

## Implementation Details

### `src/server/routes/stories.ts`

```typescript
import { Router, Request, Response } from 'express';
import { storyEngine } from '../../engine/index.js';
import { StoryId } from '../../models/index.js';

export const storyRoutes = Router();

/**
 * New story form
 */
storyRoutes.get('/new', (req: Request, res: Response) => {
  res.render('pages/new-story', {
    title: 'New Adventure - One More Branch',
    error: null,
    values: {},
  });
});

/**
 * Create new story
 */
storyRoutes.post('/create', async (req: Request, res: Response) => {
  const { characterConcept, worldbuilding, tone, apiKey } = req.body as {
    characterConcept?: string;
    worldbuilding?: string;
    tone?: string;
    apiKey?: string;
  };

  // Validation
  if (!characterConcept || characterConcept.trim().length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'Character concept must be at least 10 characters',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  if (!apiKey || apiKey.trim().length < 10) {
    return res.status(400).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: 'OpenRouter API key is required',
      values: { characterConcept, worldbuilding, tone },
    });
  }

  try {
    const result = await storyEngine.startStory({
      characterConcept: characterConcept.trim(),
      worldbuilding: worldbuilding?.trim(),
      tone: tone?.trim(),
      apiKey: apiKey.trim(),
    });

    // Redirect to play page with story ID
    res.redirect(`/play/${result.story.id}?page=1&newStory=true`);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).render('pages/new-story', {
      title: 'New Adventure - One More Branch',
      error: error instanceof Error ? error.message : 'Failed to create story',
      values: { characterConcept, worldbuilding, tone },
    });
  }
});

/**
 * Delete story (POST for form submission)
 */
storyRoutes.post('/:storyId/delete', async (req: Request, res: Response) => {
  const { storyId } = req.params;

  try {
    await storyEngine.deleteStory(storyId as StoryId);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting story:', error);
    res.redirect('/');
  }
});
```

### `src/server/views/pages/new-story.ejs`

```html
<% layout('layouts/main') -%>

<section class="form-section">
  <h1>Begin a New Adventure</h1>

  <% if (error) { %>
  <div class="alert alert-error">
    <%= error %>
  </div>
  <% } %>

  <form action="/stories/create" method="POST" class="story-form">
    <div class="form-group">
      <label for="characterConcept">Character Concept *</label>
      <textarea
        id="characterConcept"
        name="characterConcept"
        rows="4"
        required
        minlength="10"
        placeholder="Describe your protagonist: their name, personality, background, abilities, and motivations. The more detail, the better the story!"
      ><%= values.characterConcept || '' %></textarea>
      <p class="form-help">Example: "Vespera Nightwhisper, a cunning cat-girl bard with silver eyes and a taste for mayhem. She wields a lute that can charm or curse, and seeks to uncover the truth behind her mother's disappearance."</p>
    </div>

    <div class="form-group">
      <label for="worldbuilding">Worldbuilding (Optional)</label>
      <textarea
        id="worldbuilding"
        name="worldbuilding"
        rows="3"
        placeholder="Describe the world: locations, societies, magic systems, important factions, etc."
      ><%= values.worldbuilding || '' %></textarea>
      <p class="form-help">Example: "A world of floating islands connected by magical bridges. The Empire controls most islands through their Skyguard fleet."</p>
    </div>

    <div class="form-group">
      <label for="tone">Tone/Genre (Optional)</label>
      <input
        type="text"
        id="tone"
        name="tone"
        placeholder="e.g., dark fantasy, humorous, horror, epic adventure"
        value="<%= values.tone || '' %>"
      >
    </div>

    <div class="form-group">
      <label for="apiKey">OpenRouter API Key *</label>
      <input
        type="password"
        id="apiKey"
        name="apiKey"
        required
        placeholder="sk-or-..."
        autocomplete="off"
      >
      <p class="form-help">
        Get your API key from <a href="https://openrouter.ai/keys" target="_blank">OpenRouter</a>.
        Your key is never stored on the server.
      </p>
    </div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary btn-large">Begin Adventure</button>
      <a href="/" class="btn btn-secondary">Cancel</a>
    </div>
  </form>
</section>
```

### Update `src/server/routes/index.ts`

```typescript
import { Router } from 'express';
import { homeRoutes } from './home.js';
import { storyRoutes } from './stories.js';

export const router = Router();

router.use('/', homeRoutes);
router.use('/stories', storyRoutes);
```

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/routes/stories.test.ts`:

**GET /stories/new:**
1. Returns 200 status
2. Renders 'pages/new-story' template
3. Passes null error and empty values

**POST /stories/create - Validation:**
4. Rejects empty character concept with 400 status
5. Rejects short character concept (<10 chars) with 400 status
6. Rejects missing API key with 400 status
7. Rejects short API key (<10 chars) with 400 status
8. Re-renders form with error message on validation failure
9. Preserves form values (except API key) on validation failure

**POST /stories/create - Success:**
10. Calls storyEngine.startStory with trimmed values
11. Redirects to /play/{storyId}?page=1&newStory=true on success

**POST /stories/create - Error:**
12. Returns 500 and re-renders form on engine error
13. Shows error message from Error instance

**POST /stories/:storyId/delete:**
14. Calls storyEngine.deleteStory with story ID
15. Redirects to / on success
16. Redirects to / on error (no error page)

**Tests must mock `storyEngine`** - no actual LLM calls.

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/routes/stories.test.ts
```

## Invariants That Must Remain True

1. **API Key Never Stored**: API key is passed directly to engine, never persisted
2. **Form Preservation**: On validation error, form values are preserved (except API key)
3. **Input Sanitization**: All text inputs are trimmed before use
4. **Minimum Length**: Character concept must be at least 10 characters
5. **Delete Safety**: Delete requires POST (not GET) to prevent CSRF
6. **Redirect Pattern**: Success redirects, errors re-render form

## Dependencies

- Depends on USEINT-001 for Express setup
- Depends on USEINT-002 for error handling
- Depends on USEINT-003 for layout
- Depends on USEINT-004 for route structure

## Estimated Size

~220 LOC (source + tests)
