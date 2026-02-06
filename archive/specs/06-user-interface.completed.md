# Spec 06: User Interface

## Overview

Implement the web-based user interface for "One More Branch" using Express.js with server-side rendering. The UI provides story browsing, creation, and interactive gameplay.

## Goals

1. Create an Express.js server with routing
2. Implement the index page with story listing
3. Build the new adventure form
4. Create the story display and choice interaction page
5. Handle API key input (in-memory only)
6. Style the UI for a storybook experience

## Dependencies

- **Spec 03**: Persistence Layer (story/page data access)
- **Spec 05**: Story Engine (game logic operations)

## Implementation Details

### Technology Stack

- **Server**: Express.js
- **Templating**: EJS (simple, embedded JavaScript templates)
- **Styling**: Vanilla CSS with CSS variables for theming
- **JavaScript**: Vanilla JS for interactivity (no framework needed for MVP)

### Code Structure

```
src/server/
├── index.ts              # Express app setup
├── routes/
│   ├── index.ts          # Route aggregation
│   ├── home.ts           # Home page routes
│   ├── stories.ts        # Story listing/creation routes
│   └── play.ts           # Gameplay routes
├── middleware/
│   ├── error-handler.ts  # Error handling middleware
│   └── api-key.ts        # API key handling
└── views/
    ├── layouts/
    │   └── main.ejs      # Base layout
    ├── pages/
    │   ├── home.ejs      # Index/home page
    │   ├── new-story.ejs # New adventure form
    │   ├── play.ejs      # Story gameplay page
    │   └── error.ejs     # Error page
    └── partials/
        ├── header.ejs    # Page header
        ├── footer.ejs    # Page footer
        ├── story-card.ejs # Story list item
        └── choice-button.ejs # Choice button component

public/
├── css/
│   └── styles.css        # Main stylesheet
└── js/
    └── app.js            # Client-side JavaScript
```

## Files to Create

### `src/server/index.ts`

```typescript
import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { router } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { storyEngine } from '../engine/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Express {
  const app = express();

  // Initialize story engine
  storyEngine.init();

  // View engine setup
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(path.join(__dirname, '../../public')));

  // Routes
  app.use('/', router);

  // Error handling
  app.use(errorHandler);

  return app;
}

export function startServer(port: number = 3000): void {
  const app = createApp();

  app.listen(port, () => {
    console.log(`One More Branch running at http://localhost:${port}`);
  });
}
```

### `src/server/routes/index.ts`

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
    // API key passed via query param (will be stored in session storage on client)
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

### `src/server/middleware/error-handler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  res.status(500).render('pages/error', {
    title: 'Error - One More Branch',
    message: 'Something went wrong. Please try again.',
  });
}
```

### `src/server/views/layouts/main.ejs`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <%- include('../partials/header') %>

  <main class="container">
    <%- body %>
  </main>

  <%- include('../partials/footer') %>

  <script src="/js/app.js"></script>
</body>
</html>
```

### `src/server/views/partials/header.ejs`

```html
<header class="site-header">
  <div class="container">
    <a href="/" class="logo">One More Branch</a>
    <nav>
      <a href="/">Stories</a>
      <a href="/stories/new">New Adventure</a>
    </nav>
  </div>
</header>
```

### `src/server/views/partials/footer.ejs`

```html
<footer class="site-footer">
  <div class="container">
    <p>One More Branch - Interactive Storytelling</p>
    <p class="disclaimer">Content is AI-generated and may contain mature themes.</p>
  </div>
</footer>
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

### `src/server/views/pages/error.ejs`

```html
<% layout('layouts/main') -%>

<section class="error-page">
  <h1>Oops!</h1>
  <p class="error-message"><%= message %></p>
  <div class="error-actions">
    <a href="/" class="btn btn-primary">Back to Home</a>
  </div>
</section>
```

### `public/css/styles.css`

```css
/* CSS Variables for theming */
:root {
  --color-bg: #1a1a2e;
  --color-bg-light: #16213e;
  --color-bg-card: #0f3460;
  --color-primary: #e94560;
  --color-secondary: #533483;
  --color-text: #eaeaea;
  --color-text-muted: #a0a0a0;
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-danger: #f44336;
  --font-main: 'Georgia', serif;
  --font-heading: 'Palatino', 'Book Antiqua', serif;
  --max-width: 900px;
  --border-radius: 8px;
  --transition: 0.3s ease;
}

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Base */
html {
  font-size: 18px;
}

body {
  font-family: var(--font-main);
  background-color: var(--color-bg);
  color: var(--color-text);
  line-height: 1.7;
  min-height: 100vh;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 1rem;
}

/* Header */
.site-header {
  background: var(--color-bg-light);
  padding: 1rem 0;
  border-bottom: 2px solid var(--color-primary);
}

.site-header .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: bold;
}

.site-header nav a {
  color: var(--color-text);
  text-decoration: none;
  margin-left: 1.5rem;
  transition: color var(--transition);
}

.site-header nav a:hover {
  color: var(--color-primary);
}

/* Footer */
.site-footer {
  background: var(--color-bg-light);
  padding: 1.5rem 0;
  margin-top: 3rem;
  text-align: center;
  font-size: 0.9rem;
}

.disclaimer {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-top: 0.5rem;
}

/* Main content */
main {
  padding: 2rem 0;
}

/* Hero Section */
.hero {
  text-align: center;
  padding: 3rem 0;
}

.hero h1 {
  font-family: var(--font-heading);
  font-size: 3rem;
  color: var(--color-primary);
  margin-bottom: 0.5rem;
}

.tagline {
  font-size: 1.2rem;
  color: var(--color-text-muted);
  margin-bottom: 2rem;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: var(--border-radius);
  font-family: var(--font-main);
  font-size: 1rem;
  cursor: pointer;
  text-decoration: none;
  transition: all var(--transition);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: #ff6b7a;
  transform: translateY(-2px);
}

.btn-secondary {
  background: var(--color-secondary);
  color: white;
}

.btn-secondary:hover {
  background: #6b4494;
}

.btn-danger {
  background: var(--color-danger);
  color: white;
}

.btn-large {
  padding: 1rem 2rem;
  font-size: 1.1rem;
}

.btn-small {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

/* Stories Grid */
.stories-section {
  margin-top: 3rem;
}

.stories-section h2 {
  font-family: var(--font-heading);
  margin-bottom: 1.5rem;
}

.stories-grid {
  display: grid;
  gap: 1.5rem;
}

.story-card {
  background: var(--color-bg-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  border-left: 4px solid var(--color-primary);
}

.story-title {
  font-family: var(--font-heading);
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.story-tone {
  color: var(--color-text-muted);
  font-style: italic;
  margin-bottom: 0.5rem;
}

.story-stats {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.has-ending {
  color: var(--color-success);
}

.story-date {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.story-card-actions {
  margin-top: 1rem;
  display: flex;
  gap: 0.5rem;
}

.inline-form {
  display: inline;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-muted);
}

/* Forms */
.form-section {
  max-width: 700px;
  margin: 0 auto;
}

.form-section h1 {
  font-family: var(--font-heading);
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--color-bg-card);
  border-radius: var(--border-radius);
  background: var(--color-bg-light);
  color: var(--color-text);
  font-family: var(--font-main);
  font-size: 1rem;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-help {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
}

.form-help a {
  color: var(--color-primary);
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

/* Alerts */
.alert {
  padding: 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1.5rem;
}

.alert-error {
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid var(--color-danger);
  color: #ff8a80;
}

/* Play Page */
.play-container {
  position: relative;
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-bg-card);
}

.story-header h2 {
  font-family: var(--font-heading);
  font-size: 1.3rem;
}

.page-indicator {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

/* Narrative */
.narrative {
  background: var(--color-bg-light);
  border-radius: var(--border-radius);
  padding: 2rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--color-secondary);
}

.narrative-text {
  font-size: 1.05rem;
  line-height: 1.8;
}

/* State Changes */
.state-changes {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid var(--color-success);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1.5rem;
}

.state-changes h4 {
  color: var(--color-success);
  margin-bottom: 0.5rem;
}

.state-changes ul {
  list-style: disc;
  margin-left: 1.5rem;
}

.state-changes li {
  margin-bottom: 0.25rem;
}

/* Choices */
.choices-section {
  margin-top: 2rem;
}

.choices-section h3 {
  font-family: var(--font-heading);
  margin-bottom: 1rem;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.choice-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem 1.5rem;
  background: var(--color-bg-card);
  border: 2px solid var(--color-secondary);
  border-radius: var(--border-radius);
  color: var(--color-text);
  font-family: var(--font-main);
  font-size: 1rem;
  cursor: pointer;
  text-align: left;
  transition: all var(--transition);
}

.choice-btn:hover:not(:disabled) {
  background: var(--color-secondary);
  border-color: var(--color-primary);
  transform: translateX(5px);
}

.choice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.explored-marker {
  color: var(--color-success);
  font-size: 0.9rem;
}

/* Ending Banner */
.ending-banner {
  text-align: center;
  padding: 2rem;
  background: var(--color-bg-card);
  border-radius: var(--border-radius);
  margin-top: 2rem;
}

.ending-banner h3 {
  font-family: var(--font-heading);
  font-size: 2rem;
  color: var(--color-primary);
  margin-bottom: 1rem;
}

.ending-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

/* Loading */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(26, 26, 46, 0.9);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid var(--color-bg-card);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal */
.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--color-bg-light);
  padding: 2rem;
  border-radius: var(--border-radius);
  max-width: 400px;
  width: 90%;
}

.modal-content h3 {
  margin-bottom: 1rem;
}

.modal-content input {
  width: 100%;
  padding: 0.75rem;
  margin: 1rem 0;
  border: 2px solid var(--color-bg-card);
  border-radius: var(--border-radius);
  background: var(--color-bg);
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

/* Error Page */
.error-page {
  text-align: center;
  padding: 3rem;
}

.error-page h1 {
  font-family: var(--font-heading);
  font-size: 3rem;
  color: var(--color-danger);
}

.error-message {
  font-size: 1.2rem;
  margin: 1rem 0 2rem;
}

/* Responsive */
@media (max-width: 600px) {
  html {
    font-size: 16px;
  }

  .hero h1 {
    font-size: 2rem;
  }

  .form-actions {
    flex-direction: column;
  }

  .story-card-actions {
    flex-direction: column;
  }
}
```

### `public/js/app.js`

```javascript
/**
 * One More Branch - Client-side JavaScript
 */

(function() {
  'use strict';

  // API Key management (session storage only)
  const API_KEY_STORAGE_KEY = 'omb_api_key';

  function getApiKey() {
    return sessionStorage.getItem(API_KEY_STORAGE_KEY);
  }

  function setApiKey(key) {
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
  }

  function clearApiKey() {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
  }

  // Play page functionality
  function initPlayPage() {
    const container = document.querySelector('.play-container');
    if (!container) return;

    const storyId = container.dataset.storyId;
    let currentPageId = parseInt(container.dataset.pageId);

    const choicesSection = document.getElementById('choices-section');
    const choices = document.getElementById('choices');
    const narrative = document.getElementById('narrative');
    const stateChanges = document.getElementById('state-changes');
    const loading = document.getElementById('loading');
    const apiKeyModal = document.getElementById('api-key-modal');

    // Check for API key
    function ensureApiKey() {
      return new Promise((resolve) => {
        const key = getApiKey();
        if (key) {
          resolve(key);
          return;
        }

        // Show modal
        apiKeyModal.style.display = 'flex';

        const saveBtn = document.getElementById('save-api-key');
        const input = document.getElementById('modal-api-key');

        function handleSave() {
          const newKey = input.value.trim();
          if (newKey.length > 10) {
            setApiKey(newKey);
            apiKeyModal.style.display = 'none';
            resolve(newKey);
          } else {
            alert('Please enter a valid API key');
          }
        }

        saveBtn.onclick = handleSave;
        input.onkeypress = (e) => {
          if (e.key === 'Enter') handleSave();
        };
      });
    }

    // Handle choice clicks
    if (choices) {
      choices.addEventListener('click', async (e) => {
        const btn = e.target.closest('.choice-btn');
        if (!btn || btn.disabled) return;

        const choiceIndex = parseInt(btn.dataset.choiceIndex);

        try {
          // Get API key
          const apiKey = await ensureApiKey();

          // Disable buttons and show loading
          const allBtns = choices.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.disabled = true);
          loading.style.display = 'flex';

          // Make choice
          const response = await fetch(`/play/${storyId}/choice`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              pageId: currentPageId,
              choiceIndex,
              apiKey,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to process choice');
          }

          // Update page
          currentPageId = data.page.id;
          container.dataset.pageId = currentPageId;

          // Update URL without reload
          history.pushState({}, '', `/play/${storyId}?page=${currentPageId}`);

          // Update narrative
          narrative.innerHTML = `<div class="narrative-text">${data.page.narrativeText.replace(/\n/g, '<br>')}</div>`;

          // Update state changes
          if (data.page.stateChanges && data.page.stateChanges.length > 0) {
            const stateHtml = `
              <h4>What happened:</h4>
              <ul>
                ${data.page.stateChanges.map(s => `<li>${s}</li>`).join('')}
              </ul>
            `;
            if (stateChanges) {
              stateChanges.innerHTML = stateHtml;
              stateChanges.style.display = 'block';
            } else {
              const newStateDiv = document.createElement('aside');
              newStateDiv.className = 'state-changes';
              newStateDiv.id = 'state-changes';
              newStateDiv.innerHTML = stateHtml;
              narrative.after(newStateDiv);
            }
          } else if (stateChanges) {
            stateChanges.style.display = 'none';
          }

          // Update page indicator
          document.querySelector('.page-indicator').textContent = `Page ${currentPageId}`;

          // Update choices or show ending
          if (data.page.isEnding) {
            choicesSection.innerHTML = `
              <div class="ending-banner">
                <h3>THE END</h3>
                <div class="ending-actions">
                  <a href="/play/${storyId}/restart" class="btn btn-primary">Play Again</a>
                  <a href="/" class="btn btn-secondary">Back to Stories</a>
                </div>
              </div>
            `;
          } else {
            choices.innerHTML = data.page.choices.map((choice, idx) => `
              <button
                class="choice-btn"
                data-choice-index="${idx}"
                ${choice.nextPageId ? 'data-explored="true"' : ''}
              >
                ${choice.text}
                ${choice.nextPageId ? '<span class="explored-marker" title="Previously explored">↩</span>' : ''}
              </button>
            `).join('');
          }

          // Scroll to narrative
          narrative.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
          console.error('Error:', error);
          alert(error.message || 'Something went wrong. Please try again.');

          // Re-enable buttons
          const allBtns = choices.querySelectorAll('.choice-btn');
          allBtns.forEach(b => b.disabled = false);
        } finally {
          loading.style.display = 'none';
        }
      });
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      location.reload();
    });
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initPlayPage();
  });
})();
```

### `src/index.ts` (updated)

```typescript
import { startServer } from './server/index.js';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

startServer(PORT);
```

## Invariants

1. **API Key Security**: API key only exists in browser session storage, never persisted server-side
2. **No Undo**: UI provides no mechanism to go back to previous choices
3. **Deterministic Display**: Same page always shows same content
4. **User Actions**: Only actions are start story, make choice, restart, delete
5. **Error Graceful**: All errors show user-friendly messages
6. **Accessibility**: Buttons are keyboard accessible, colors have sufficient contrast

## Test Cases

### Unit Tests

**File**: `test/unit/server/routes.test.ts`

```typescript
import request from 'supertest';
import { createApp } from '@/server';

describe('Server Routes', () => {
  const app = createApp();

  describe('GET /', () => {
    it('should return home page', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('One More Branch');
    });
  });

  describe('GET /stories/new', () => {
    it('should return new story form', async () => {
      const response = await request(app).get('/stories/new');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Character Concept');
      expect(response.text).toContain('OpenRouter API Key');
    });
  });

  describe('POST /stories/create', () => {
    it('should reject empty character concept', async () => {
      const response = await request(app)
        .post('/stories/create')
        .send({ characterConcept: '', apiKey: 'test-key-12345' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('at least 10 characters');
    });

    it('should reject missing API key', async () => {
      const response = await request(app)
        .post('/stories/create')
        .send({ characterConcept: 'A brave adventurer named Test' });

      expect(response.status).toBe(400);
      expect(response.text).toContain('API key is required');
    });
  });

  describe('GET /play/:storyId', () => {
    it('should return 404 for non-existent story', async () => {
      const response = await request(app).get('/play/non-existent-id');
      expect(response.status).toBe(404);
    });
  });
});
```

### Integration Tests

**File**: `test/integration/server/play-flow.test.ts`

```typescript
import request from 'supertest';
import { createApp } from '@/server';
import { storyEngine } from '@/engine';
import { StoryId } from '@/models';

const API_KEY = process.env.OPENROUTER_TEST_KEY;
const describeWithKey = API_KEY ? describe : describe.skip;

describeWithKey('Play Flow Integration', () => {
  const app = createApp();
  let testStoryId: StoryId;

  beforeAll(async () => {
    storyEngine.init();
  });

  afterAll(async () => {
    if (testStoryId) {
      try {
        await storyEngine.deleteStory(testStoryId);
      } catch {}
    }
  });

  it('should create story and show play page', async () => {
    // Create story via form submission
    const createResponse = await request(app)
      .post('/stories/create')
      .send({
        characterConcept: 'TEST UI: A test character for integration testing',
        tone: 'test',
        apiKey: API_KEY,
      });

    // Should redirect to play page
    expect(createResponse.status).toBe(302);
    expect(createResponse.headers['location']).toMatch(/\/play\/[a-f0-9-]+/);

    // Extract story ID from redirect URL
    const match = createResponse.headers['location'].match(/\/play\/([a-f0-9-]+)/);
    testStoryId = match[1] as StoryId;

    // Load play page
    const playResponse = await request(app).get(`/play/${testStoryId}?page=1`);
    expect(playResponse.status).toBe(200);
    expect(playResponse.text).toContain('Page 1');
    expect(playResponse.text).toContain('choice-btn');
  }, 60000);

  it('should process choice via AJAX endpoint', async () => {
    if (!testStoryId) {
      throw new Error('Test story not created');
    }

    const response = await request(app)
      .post(`/play/${testStoryId}/choice`)
      .send({
        pageId: 1,
        choiceIndex: 0,
        apiKey: API_KEY,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.page.id).toBe(2);
    expect(response.body.wasGenerated).toBe(true);
  }, 60000);
});
```

### E2E Tests

**File**: `test/e2e/server/full-flow.test.ts`

```typescript
// E2E tests would typically use Playwright or Puppeteer
// For now, documented as manual test scenarios

describe('E2E Test Scenarios (Manual)', () => {
  it.todo('should complete full story creation and playthrough');
  it.todo('should handle API key input via modal');
  it.todo('should show loading state during generation');
  it.todo('should persist API key across page loads in same session');
  it.todo('should clear API key on browser close');
  it.todo('should show explored marker on previously visited branches');
  it.todo('should handle ending pages correctly');
  it.todo('should restart story from beginning');
});
```

## Acceptance Criteria

- [ ] Home page displays list of existing stories
- [ ] New adventure form captures character, world, tone, and API key
- [ ] Story creation generates first page and redirects to play
- [ ] Play page displays narrative and choices
- [ ] Clicking choice either loads existing page or generates new one
- [ ] Loading indicator shows during generation
- [ ] API key is requested if not in session storage
- [ ] Ending pages show "THE END" and restart option
- [ ] Explored branches show indicator icon
- [ ] Stories can be deleted from home page
- [ ] All pages are responsive on mobile
- [ ] Error states are handled gracefully
- [ ] All unit tests pass
- [ ] Integration tests pass (with API key)

## Implementation Notes

1. EJS templates use `<% layout('layouts/main') -%>` for layout inheritance
2. API key stored in browser sessionStorage (cleared on browser close)
3. AJAX is used for choices to avoid full page reloads
4. CSS uses custom properties for easy theming
5. Dark theme by default (fitting for storytelling app)
6. No frontend framework needed - vanilla JS sufficient for MVP
7. Server renders initial page, client handles subsequent interactions
8. History API used to update URL without reload
