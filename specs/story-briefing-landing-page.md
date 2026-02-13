# Story Briefing Landing Page

**Status**: ACTIVE
**Created**: 2026-02-13

## Overview

Insert a "mission briefing" landing page between story preparation (STRUCTURING + DECOMPOSING) and first-page generation. After the user creates a story, they see a dossier-style briefing showing rich story data — characters, world facts, theme, NPC agendas — before committing to play. A "Begin Adventure" button triggers the remaining generation stages (PLANNING through ANALYZING) for page 1.

## Motivation

Currently, `startNewStory()` runs the entire pipeline in one shot: STRUCTURING → DECOMPOSING → PLANNING → ACCOUNTING → CURATING → WRITING → ANALYZING → (SCHEMING). The user watches a spinner for all stages, then lands directly on page 1. This misses an opportunity to:

1. Let the player review what the LLM generated (characters, world, theme) before committing
2. Build anticipation and immersion before play begins
3. Reduce perceived wait time by splitting a long generation into two shorter ones
4. Allow players to return to a prepared-but-unstarted story later

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Spoiler level | Theme + premise only | Hide acts, beats, structure details to preserve surprise |
| Character detail | Dossier cards | Name, appearance, traits, motivations, relationships — NO speech fingerprints |
| NPC agendas | Goal + fear only | Hide leverage and off-screen behavior to preserve dramatic tension |
| Aesthetic | Mission briefing | Structured, tabular, organized sections — like receiving a classified dossier |
| Home page treatment | Status indicator for 0-page stories | "Awaiting briefing" status; Play links to briefing instead of play page |
| Play route guard | Redirect to briefing | `/play/:storyId?page=1` redirects to briefing if page 1 doesn't exist |

---

## 1. Pipeline Split

### Current Flow (`startNewStory` in `src/engine/story-service.ts`)

```
startNewStory(options)
  1. createStory() → save to disk
  2. STRUCTURING_STORY → generateStoryStructure() → save
  3. DECOMPOSING_ENTITIES → decomposeEntities() → save
  4. generatePage('opening', ...) → PLANNING → ACCOUNTING → CURATING → WRITING → ANALYZING → (SCHEMING)
  5. savePage() → return { story, page }
```

### New Flow

**Phase A — `prepareStory(options)` (called from `/stories/create-ajax`)**

```
prepareStory(options)
  1. createStory() → save to disk
  2. STRUCTURING_STORY → generateStoryStructure() → save
  3. DECOMPOSING_ENTITIES → decomposeEntities() → save
  4. Return { story } — NO page generated
```

On success, the client redirects to `/play/:storyId/briefing` instead of `/play/:storyId?page=1`.

**Phase B — `generateOpeningPage(storyId, apiKey, onGenerationStage)` (called from `POST /play/:storyId/begin`)**

```
generateOpeningPage(storyId, apiKey, onGenerationStage)
  1. Load story (must have structure + decomposedCharacters)
  2. generatePage('opening', story, apiKey, ...) — runs PLANNING → ACCOUNTING → CURATING → WRITING → ANALYZING → (SCHEMING)
  3. savePage() → return { story, page }
```

### Changes to `src/engine/story-service.ts`

**Add** `prepareStory(options: StartStoryOptions): Promise<PrepareStoryResult>`:
- Same as current `startNewStory` steps 1-3 (create, structure, decompose)
- Returns `{ story }` (no page)
- On error, deletes the story (same cleanup as current)

**Add** `generateOpeningPage(storyId, apiKey, onGenerationStage?): Promise<StartStoryResult>`:
- Loads story, validates it has `structure` and `decomposedCharacters`
- Calls `generatePage('opening', ...)` — reuses existing pipeline
- Saves page, returns `{ story, page }`
- Throws `EngineError('STORY_NOT_PREPARED')` if structure/decomposition missing

**Keep** `startNewStory()` as-is for backward compatibility (non-AJAX form submit fallback).

### New Types in `src/engine/types.ts`

```typescript
export interface PrepareStoryResult {
  readonly story: Story;
}
```

### Changes to `StoryEngine` class (`src/engine/story-engine.ts`)

Add two new methods:

```typescript
async prepareStory(options: StartStoryOptions): Promise<PrepareStoryResult> {
  return prepareStory(options);
}

async generateOpeningPage(
  storyId: StoryId,
  apiKey: string,
  onGenerationStage?: GenerationStageCallback
): Promise<StartStoryResult> {
  return generateOpeningPage(storyId, apiKey, onGenerationStage);
}
```

---

## 2. Route Design

### New Routes

#### `GET /play/:storyId/briefing`

**Purpose**: Render the mission briefing page for a prepared story.

**Handler logic**:
1. Load story via `storyEngine.loadStory(storyId)`
2. If story not found → 404
3. If story has no `structure` or no `decomposedCharacters` → 404 (story not fully prepared)
4. If page 1 already exists (`storyEngine.getPage(storyId, 1)` returns non-null) → redirect to `/play/:storyId?page=1` (briefing no longer needed)
5. Extract briefing data from story (see Section 3)
6. Render `pages/briefing.ejs`

**Template data passed**:

```typescript
{
  title: `${story.title} — Mission Briefing`,
  story: {
    id: story.id,
    title: story.title,
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    startingSituation: story.startingSituation,
  },
  briefing: {
    theme: story.structure.overallTheme,
    premise: story.structure.premise,
    protagonist: extractProtagonistBriefing(story.decomposedCharacters),
    npcs: extractNpcBriefings(story.decomposedCharacters, story.initialNpcAgendas),
    worldFacts: groupWorldFacts(story.decomposedWorld),
    pacingBudget: story.structure.pacingBudget,
  },
}
```

#### `POST /play/:storyId/begin`

**Purpose**: Trigger opening page generation, return storyId for redirect.

**Request body**:
```typescript
{
  apiKey: string;
  progressId?: string;  // For progress polling
}
```

**Handler logic**:
1. Validate `apiKey` present
2. If `progressId`, start generation progress tracking (flowType: `'begin-adventure'`)
3. Call `storyEngine.generateOpeningPage(storyId, apiKey, onGenerationStage)`
4. On success: mark progress complete, return `{ success: true, storyId }`
5. On error: mark progress failed, return error JSON (same pattern as `/stories/create-ajax`)

**Response (success)**:
```json
{ "success": true, "storyId": "abc-123" }
```

Client redirects to `/play/:storyId?page=1&newStory=true` on success.

### Modified Routes

#### `POST /stories/create-ajax` — Changed redirect target

Currently returns `{ success: true, storyId }` and client redirects to `/play/${storyId}?page=1&newStory=true`.

**Change**: Call `prepareStory()` instead of `startStory()`. Client redirects to `/play/${storyId}/briefing` on success.

Progress stages reported: only `STRUCTURING_STORY` and `DECOMPOSING_ENTITIES` (shorter spinner).

#### `POST /stories/create` — Changed redirect (non-AJAX fallback)

Currently redirects to `/play/${result.story.id}?page=1&newStory=true`.

**Change**: Call `prepareStory()` instead of `startStory()`. Redirect to `/play/${result.story.id}/briefing`.

#### `GET /play/:storyId` — Play route guard

Add a guard at the top of the handler:

```typescript
// If requested page doesn't exist and page 1 doesn't exist,
// redirect to briefing (story is prepared but not started)
if (!page) {
  const page1Exists = await storyEngine.getPage(storyId, 1 as PageId);
  if (!page1Exists) {
    return res.redirect(`/play/${storyId}/briefing`);
  }
  // Otherwise, 404 as usual (page doesn't exist but story has pages)
  return res.status(404).render('pages/error', { ... });
}
```

This handles both:
- Direct navigation to `/play/:storyId?page=1` for a prepared-but-unstarted story → briefing
- Deep links to any page that doesn't exist in a started story → 404

### Route Registration

In `src/server/routes/play.ts`, add briefing routes alongside existing play routes. The new GET and POST are part of the play router since they're under `/play/:storyId/`.

---

## 3. Briefing Data Extraction

### Helper Functions (new file: `src/server/utils/briefing-helpers.ts`)

#### `extractProtagonistBriefing(characters: DecomposedCharacter[]): ProtagonistBriefing`

The protagonist is the first character in the `decomposedCharacters` array (matches the `characterConcept` input).

```typescript
interface ProtagonistBriefing {
  name: string;
  appearance: string;
  coreTraits: readonly string[];
  motivations: string;
  relationships: readonly string[];
}
```

Deliberately excludes `speechFingerprint` and `knowledgeBoundaries`.

#### `extractNpcBriefings(characters, agendas?): NpcBriefing[]`

NPCs are all characters after the first in `decomposedCharacters`. Cross-reference with `initialNpcAgendas` by name for goal/fear.

```typescript
interface NpcBriefing {
  name: string;
  appearance: string;
  coreTraits: readonly string[];
  motivations: string;
  relationships: readonly string[];
  currentGoal: string | null;   // From NpcAgenda, null if no agenda
  fear: string | null;          // From NpcAgenda, null if no agenda
}
```

Deliberately excludes `speechFingerprint`, `knowledgeBoundaries`, `leverage`, and `offScreenBehavior`.

#### `groupWorldFacts(world?: DecomposedWorld): GroupedWorldFacts`

Groups `WorldFact[]` by domain for tabular display.

```typescript
interface GroupedWorldFacts {
  [domain: string]: Array<{ fact: string; scope: string }>;
}
```

Returns empty object if `decomposedWorld` is undefined or has no facts.

---

## 4. EJS Template: `src/server/views/pages/briefing.ejs`

### Template Structure

```
<!DOCTYPE html>
<html>
<head>
  <!-- Standard meta, title, CSS -->
</head>
<body>
  <%- include('../partials/header') %>

  <main class="briefing-container">
    <!-- HEADER -->
    <div class="briefing-header">
      <div class="briefing-classification">CLASSIFIED — MISSION BRIEFING</div>
      <h1 class="briefing-title"><%= story.title %></h1>
      <div class="briefing-meta">
        <span class="briefing-tone"><%= story.tone %></span>
        <span class="briefing-pacing">
          Est. <%= briefing.pacingBudget.targetPagesMin %>-<%= briefing.pacingBudget.targetPagesMax %> pages
        </span>
      </div>
    </div>

    <!-- THEME & PREMISE -->
    <section class="briefing-section">
      <h2 class="briefing-section-title">Mission Overview</h2>
      <div class="briefing-field">
        <span class="briefing-label">Theme</span>
        <p><%= briefing.theme %></p>
      </div>
      <div class="briefing-field">
        <span class="briefing-label">Premise</span>
        <p><%= briefing.premise %></p>
      </div>
      <% if (story.startingSituation) { %>
      <div class="briefing-field">
        <span class="briefing-label">Starting Situation</span>
        <p><%= story.startingSituation %></p>
      </div>
      <% } %>
    </section>

    <!-- PROTAGONIST DOSSIER -->
    <section class="briefing-section">
      <h2 class="briefing-section-title">Agent Dossier</h2>
      <div class="character-card protagonist-card">
        <h3><%= briefing.protagonist.name %></h3>
        <div class="character-field">
          <span class="briefing-label">Appearance</span>
          <p><%= briefing.protagonist.appearance %></p>
        </div>
        <div class="character-field">
          <span class="briefing-label">Core Traits</span>
          <ul class="trait-list">
            <% briefing.protagonist.coreTraits.forEach(trait => { %>
            <li><%= trait %></li>
            <% }) %>
          </ul>
        </div>
        <div class="character-field">
          <span class="briefing-label">Motivations</span>
          <p><%= briefing.protagonist.motivations %></p>
        </div>
        <% if (briefing.protagonist.relationships.length > 0) { %>
        <div class="character-field">
          <span class="briefing-label">Known Relationships</span>
          <ul class="relationship-list">
            <% briefing.protagonist.relationships.forEach(rel => { %>
            <li><%= rel %></li>
            <% }) %>
          </ul>
        </div>
        <% } %>
      </div>
    </section>

    <!-- NPC DOSSIERS (if any) -->
    <% if (briefing.npcs.length > 0) { %>
    <section class="briefing-section">
      <h2 class="briefing-section-title">Known Operatives</h2>
      <div class="npc-grid">
        <% briefing.npcs.forEach(npc => { %>
        <div class="character-card npc-card">
          <h3><%= npc.name %></h3>
          <div class="character-field">
            <span class="briefing-label">Appearance</span>
            <p><%= npc.appearance %></p>
          </div>
          <div class="character-field">
            <span class="briefing-label">Core Traits</span>
            <ul class="trait-list">
              <% npc.coreTraits.forEach(trait => { %>
              <li><%= trait %></li>
              <% }) %>
            </ul>
          </div>
          <div class="character-field">
            <span class="briefing-label">Motivations</span>
            <p><%= npc.motivations %></p>
          </div>
          <% if (npc.relationships.length > 0) { %>
          <div class="character-field">
            <span class="briefing-label">Relationships</span>
            <ul class="relationship-list">
              <% npc.relationships.forEach(rel => { %>
              <li><%= rel %></li>
              <% }) %>
            </ul>
          </div>
          <% } %>
          <% if (npc.currentGoal) { %>
          <div class="character-field">
            <span class="briefing-label">Known Objective</span>
            <p><%= npc.currentGoal %></p>
          </div>
          <% } %>
          <% if (npc.fear) { %>
          <div class="character-field">
            <span class="briefing-label">Known Vulnerability</span>
            <p><%= npc.fear %></p>
          </div>
          <% } %>
        </div>
        <% }) %>
      </div>
    </section>
    <% } %>

    <!-- WORLD INTEL (if any) -->
    <% const domains = Object.keys(briefing.worldFacts); %>
    <% if (domains.length > 0) { %>
    <section class="briefing-section">
      <h2 class="briefing-section-title">Field Intelligence</h2>
      <% domains.forEach(domain => { %>
      <div class="world-domain">
        <h3 class="domain-title"><%= domain.charAt(0).toUpperCase() + domain.slice(1) %></h3>
        <table class="intel-table">
          <thead>
            <tr>
              <th>Intel</th>
              <th>Scope</th>
            </tr>
          </thead>
          <tbody>
            <% briefing.worldFacts[domain].forEach(fact => { %>
            <tr>
              <td><%= fact.fact %></td>
              <td class="scope-cell"><%= fact.scope %></td>
            </tr>
            <% }) %>
          </tbody>
        </table>
      </div>
      <% }) %>
    </section>
    <% } %>

    <!-- BEGIN ADVENTURE -->
    <section class="briefing-action">
      <button id="begin-adventure-btn" class="btn btn-primary btn-large">
        Begin Adventure
      </button>
    </section>

    <!-- Loading overlay (reuse existing pattern) -->
    <div id="loading" class="loading-overlay" style="display: none;">
      <div class="loading-content">
        <div class="spinner"></div>
        <p id="loading-stage" class="loading-stage">Preparing your adventure...</p>
        <p id="loading-phrase" class="loading-phrase"></p>
      </div>
    </div>

    <!-- API Key Modal (reuse existing pattern from play.ejs) -->
    <div id="api-key-modal" class="modal" style="display: none;">
      <div class="modal-content">
        <h3>Enter API Key</h3>
        <p>Your OpenRouter API key is needed to generate the story.</p>
        <input type="password" id="api-key-input" placeholder="sk-or-..." />
        <div class="modal-actions">
          <button id="api-key-submit" class="btn btn-primary">Continue</button>
          <button id="api-key-cancel" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </main>

  <%- include('../partials/footer') %>

  <script src="/js/app.js"></script>
</body>
</html>
```

---

## 5. Client-Side JavaScript Changes

### New Source File: `public/js/src/10-briefing-controller.js`

This file handles the briefing page's "Begin Adventure" button.

**Responsibilities**:
1. Detect briefing page (check for `#begin-adventure-btn` element)
2. On click: check for API key in session storage, show modal if missing
3. Generate `progressId`, show loading overlay, POST to `/play/:storyId/begin`
4. Poll `/generation-progress/:progressId` using existing `createLoadingProgressController()`
5. On success: redirect to `/play/:storyId?page=1&newStory=true`
6. On error: hide loading overlay, show error

**Initialization** (called from `09-controllers.js` or self-initializing via DOMContentLoaded):

```javascript
function initBriefingPage() {
  const beginBtn = document.getElementById('begin-adventure-btn');
  if (!beginBtn) return; // Not on briefing page

  const storyId = document.querySelector('.briefing-container')?.dataset?.storyId;
  if (!storyId) return;

  beginBtn.addEventListener('click', async () => {
    const apiKey = getApiKey(); // From session storage or modal
    if (!apiKey) {
      showApiKeyModal((key) => beginAdventure(storyId, key));
      return;
    }
    beginAdventure(storyId, apiKey);
  });
}

async function beginAdventure(storyId, apiKey) {
  const progressId = crypto.randomUUID();
  showLoading();

  const progressController = createLoadingProgressController(progressId, 'begin-adventure');
  progressController.start();

  try {
    const response = await fetch(`/play/${storyId}/begin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, progressId }),
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = `/play/${storyId}?page=1&newStory=true`;
    } else {
      progressController.stop();
      hideLoading();
      showError(data.error || 'Failed to begin adventure');
    }
  } catch (err) {
    progressController.stop();
    hideLoading();
    showError('Network error. Please try again.');
  }
}
```

### Changes to `public/js/src/01-constants.js`

Add stage display name and phrase pool for the new flow type:

```javascript
// No new stages needed — the begin-adventure flow uses the same
// PLANNING_PAGE, CURATING_CONTEXT, WRITING_OPENING_PAGE, ANALYZING_SCENE stages
// that already have display names and phrase pools.

// Add flow type recognition (if needed for progress controller):
// 'begin-adventure' uses the same stage pool as 'new-story' minus STRUCTURING/DECOMPOSING
```

### Changes to `public/js/src/09-controllers.js`

Add `initBriefingPage()` call to the page initialization dispatcher. The existing pattern detects which page we're on by DOM elements present:

```javascript
// Existing:
if (document.querySelector('.play-container')) {
  initPlayPage();
}

// Add:
if (document.getElementById('begin-adventure-btn')) {
  initBriefingPage();
}
```

### Changes to Story Creation Flow (`09-controllers.js`)

The AJAX story creation handler currently redirects to `/play/${storyId}?page=1&newStory=true` on success. Change to:

```javascript
// Before:
window.location.href = `/play/${data.storyId}?page=1&newStory=true`;

// After:
window.location.href = `/play/${data.storyId}/briefing`;
```

After changes, regenerate `app.js`:
```bash
node scripts/concat-client-js.js
```

---

## 6. CSS Approach

Add briefing styles to `public/css/styles.css`. The briefing page uses a distinct visual language from the play page — structured, tabular, "classified document" aesthetic.

### Key CSS Classes

```css
/* Briefing page container */
.briefing-container { max-width: 900px; margin: 0 auto; padding: 2rem; }

/* Header with classification stamp */
.briefing-header { text-align: center; border-bottom: 2px solid; margin-bottom: 2rem; padding-bottom: 1.5rem; }
.briefing-classification { text-transform: uppercase; letter-spacing: 0.3em; font-size: 0.8rem; opacity: 0.6; margin-bottom: 0.5rem; }
.briefing-title { font-size: 2rem; margin: 0.5rem 0; }
.briefing-meta { display: flex; justify-content: center; gap: 2rem; font-size: 0.9rem; opacity: 0.7; }

/* Sections */
.briefing-section { margin-bottom: 2.5rem; }
.briefing-section-title { text-transform: uppercase; letter-spacing: 0.15em; font-size: 1.1rem; border-bottom: 1px solid; padding-bottom: 0.5rem; margin-bottom: 1rem; }

/* Fields (label + value pairs) */
.briefing-field { margin-bottom: 1rem; }
.briefing-label { display: block; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 0.25rem; }

/* Character cards */
.character-card { border: 1px solid; padding: 1.5rem; margin-bottom: 1rem; }
.protagonist-card { border-width: 2px; }
.character-field { margin-bottom: 0.75rem; }

/* NPC grid */
.npc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1rem; }

/* Trait/relationship lists */
.trait-list { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; padding: 0; }
.trait-list li { padding: 0.2rem 0.6rem; border: 1px solid; font-size: 0.85rem; }
.relationship-list { padding-left: 1.2rem; }

/* Intel tables */
.intel-table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
.intel-table th, .intel-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid; }
.intel-table th { text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; }
.scope-cell { font-size: 0.85rem; opacity: 0.7; white-space: nowrap; }

/* Domain groups */
.world-domain { margin-bottom: 1.5rem; }
.domain-title { font-size: 0.95rem; text-transform: capitalize; margin-bottom: 0.5rem; }

/* Begin button */
.briefing-action { text-align: center; margin-top: 3rem; padding-top: 2rem; border-top: 2px solid; }
```

Use the existing color scheme and font from the project's `styles.css`. The briefing page should feel like part of the same application but with a distinct "document" character.

---

## 7. Home Page Changes

### Story List: Handle 0-Page Stories

In `src/server/routes/home.ts`, the home route already loads `pageCount` via `getStoryStats()`. Stories with `pageCount === 0` are prepared but not yet started.

### Template Changes (`src/server/views/pages/home.ejs`)

Update the story card to:
1. Show a status indicator for 0-page stories
2. Change the Play button link based on state

```ejs
<!-- Replace existing stats/actions block in story card -->
<div class="story-stats">
  <% if (story.pageCount === 0) { %>
  <span class="story-status story-status-prepared">Awaiting first page</span>
  <% } else { %>
  <span><%= story.pageCount %> pages</span>
  <span><%= story.exploredBranches %>/<%= story.totalBranches %> branches</span>
  <% if (story.hasEnding) { %>
  <span class="has-ending">Has endings</span>
  <% } %>
  <% } %>
</div>

<div class="story-card-actions">
  <% if (story.pageCount === 0) { %>
  <a href="/play/<%= story.id %>/briefing" class="btn btn-secondary">View Briefing</a>
  <% } else { %>
  <a href="/play/<%= story.id %>?page=1" class="btn btn-secondary">Play</a>
  <% } %>
  <form action="/stories/<%= story.id %>/delete" method="POST" class="inline-form">
    <button type="submit" class="btn btn-danger btn-small"
      onclick="return confirm('Delete this story? This cannot be undone.')">Delete</button>
  </form>
</div>
```

### CSS for Status Indicator

```css
.story-status-prepared {
  font-style: italic;
  opacity: 0.7;
}
```

---

## 8. Edge Cases and Error Handling

### Story Without Structure or Decomposition

If a story exists on disk but lacks `structure` or `decomposedCharacters` (e.g., creation crashed mid-pipeline), the briefing route returns 404. The home page should also handle this: check that `story.pageCount === 0` AND the story has structure data. If the story JSON is missing structure, display it differently (or hide it) — this is a rare crash-recovery edge case.

**Practical approach**: The `listStories()` function only returns `StoryMetadata` (no structure info). Rather than loading full story objects on the home page, treat all 0-page stories the same way. If a user clicks "View Briefing" for a corrupted story, the briefing route returns 404 — acceptable UX for a rare crash case.

### Concurrent "Begin Adventure" Clicks

The "Begin Adventure" button should be disabled immediately on click to prevent double-submission. If the user opens two tabs and clicks "Begin" in both:
- The first call to `generateOpeningPage()` succeeds and saves page 1
- The second call should detect page 1 already exists and return an error or simply redirect

**Implementation**: In `generateOpeningPage()`, check if page 1 already exists before running the pipeline. If it does, return the existing page instead of regenerating.

```typescript
async function generateOpeningPage(storyId, apiKey, onGenerationStage?) {
  const story = await loadStory(storyId);
  if (!story) throw new EngineError('Story not found', 'STORY_NOT_FOUND');
  if (!story.structure) throw new EngineError('Story not prepared', 'STORY_NOT_PREPARED');

  // Idempotency guard
  const existingPage = await getPage(storyId, parsePageId(1));
  if (existingPage) {
    return { story, page: existingPage };
  }

  const { page, updatedStory } = await generatePage('opening', story, apiKey, undefined, onGenerationStage);
  await storage.savePage(storyId, page);
  if (updatedStory !== story) {
    await storage.updateStory(updatedStory);
  }
  return { story: updatedStory, page };
}
```

### API Key Handling

The briefing page must handle API key the same way as the play page:
- Check session storage first
- Show modal if not found
- Store in session storage on entry
- Never persist to disk

The API key modal markup and logic are reused from the play page pattern.

### Browser Back Button

After redirecting from briefing → play page, pressing Back returns to the briefing. The briefing route detects page 1 exists and redirects to play — user sees a brief flash then lands back on play. This is acceptable UX.

### Delete Story from Briefing

The briefing page does not include a delete button. Users can delete from the home page. This keeps the briefing page focused on immersion.

---

## 9. Generation Progress for "Begin Adventure" Flow

### Flow Type

Register `'begin-adventure'` as a new `flowType` in `GenerationProgressService`. It uses the same stages as the `'new-story'` flow minus STRUCTURING_STORY and DECOMPOSING_ENTITIES:

- `PLANNING_PAGE`
- `ACCOUNTING_STATE`
- `CURATING_CONTEXT`
- `WRITING_OPENING_PAGE`
- `ANALYZING_SCENE`
- `RESOLVING_AGENDAS` (if NPCs)
- `RESTRUCTURING_STORY` (if deviation)

The existing `/generation-progress/:progressId` polling endpoint works unchanged.

### Client-Side Progress Display

The briefing page's loading overlay reuses the same spinner and stage phrase rotation from the play page. The `createLoadingProgressController()` function already accepts a `progressId` and handles polling — no changes needed to the progress controller itself.

---

## 10. Testing Strategy

### Unit Tests

#### `src/engine/story-service.ts`

- **`prepareStory()`**:
  - Calls `createStory`, `generateStoryStructure`, `decomposeEntities` in order
  - Saves story after each step
  - Returns `{ story }` with `structure` and `decomposedCharacters` populated
  - Deletes story on error (same as `startNewStory`)
  - Does NOT call `generatePage`
  - Fires `STRUCTURING_STORY` and `DECOMPOSING_ENTITIES` stage events

- **`generateOpeningPage()`**:
  - Loads story, validates structure exists
  - Throws `STORY_NOT_PREPARED` if no structure
  - Calls `generatePage('opening', ...)`
  - Returns existing page 1 if already generated (idempotency)
  - Fires page generation stage events (PLANNING through ANALYZING)

#### `src/server/utils/briefing-helpers.ts`

- **`extractProtagonistBriefing()`**:
  - Returns first character's briefing data
  - Excludes `speechFingerprint` and `knowledgeBoundaries`
  - Handles empty array gracefully

- **`extractNpcBriefings()`**:
  - Returns all characters except first
  - Cross-references `initialNpcAgendas` by name for goal/fear
  - Returns `null` for goal/fear when no matching agenda
  - Case-insensitive name matching for agenda lookup

- **`groupWorldFacts()`**:
  - Groups facts by domain
  - Returns empty object for undefined/empty input
  - Preserves fact and scope fields

#### Route Handlers

- **`GET /play/:storyId/briefing`**:
  - Returns 404 for missing story
  - Returns 404 for story without structure
  - Redirects to play page if page 1 exists
  - Renders briefing template with correct data shape

- **`POST /play/:storyId/begin`**:
  - Returns 400 if no apiKey
  - Calls `generateOpeningPage()` with progress tracking
  - Returns `{ success: true, storyId }` on success
  - Returns error JSON on failure
  - Handles LLMError with formatted messages

- **`GET /play/:storyId` (guard)**:
  - Redirects to briefing when page requested but no pages exist
  - Returns 404 when specific page missing but story has other pages
  - Unchanged behavior when page exists

### Integration Tests

- **Full preparation flow**: POST `/stories/create-ajax` → verify story saved with structure + characters → verify no page files
- **Full begin flow**: POST `/play/:storyId/begin` → verify page 1 created → verify redirect works
- **Briefing → Play transition**: Prepare story → GET briefing → POST begin → GET play page 1
- **Home page with mixed stories**: Stories with pages + story with 0 pages → verify correct links and status labels
- **Idempotent begin**: POST begin twice → second call returns existing page, no duplicate generation

### E2E Tests

- **Happy path**: Create story → see briefing → click Begin Adventure → land on page 1
- **Home page routing**: Prepared story shows "View Briefing" link → clicking goes to briefing
- **Play route guard**: Navigate to `/play/:storyId?page=1` for prepared story → redirected to briefing
- **Back button**: Navigate briefing → begin → play → back → redirected to play (not stuck on briefing)

### Client Tests

- **Briefing controller**: Button click → API key check → POST request → redirect
- **Button disabling**: Click → button disabled → prevents double-click
- **Error display**: Failed generation → error shown → button re-enabled

---

## 11. File Change Summary

### New Files

| File | Purpose |
|------|---------|
| `src/server/views/pages/briefing.ejs` | Briefing page template |
| `src/server/utils/briefing-helpers.ts` | Data extraction functions for briefing display |
| `public/js/src/10-briefing-controller.js` | Client-side briefing page controller |
| `test/unit/server/utils/briefing-helpers.test.ts` | Unit tests for briefing helpers |
| `test/unit/engine/prepare-story.test.ts` | Unit tests for prepareStory |
| `test/unit/engine/generate-opening-page.test.ts` | Unit tests for generateOpeningPage |
| `test/unit/server/routes/briefing.test.ts` | Route handler tests |
| `test/integration/engine/briefing-flow.test.ts` | Integration tests |
| `test/e2e/engine/briefing-e2e.test.ts` | E2E tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/engine/story-service.ts` | Add `prepareStory()` and `generateOpeningPage()` |
| `src/engine/story-engine.ts` | Add `prepareStory()` and `generateOpeningPage()` methods |
| `src/engine/types.ts` | Add `PrepareStoryResult` interface |
| `src/server/routes/play.ts` | Add `GET /briefing`, `POST /begin`, play route guard |
| `src/server/routes/stories.ts` | Change `create-ajax` and `create` to use `prepareStory()` |
| `src/server/views/pages/home.ejs` | Conditional rendering for 0-page stories |
| `public/js/src/09-controllers.js` | Add briefing page init, change create redirect |
| `public/js/app.js` | Regenerated via concat script |
| `public/css/styles.css` | Briefing page styles |

### Unchanged Files

- `src/llm/` — No prompt or schema changes
- `src/models/` — No model changes (detect state from existing data)
- `src/persistence/` — No storage changes
- `src/config/` — No configuration changes

---

## 12. Implementation Order

1. **Engine layer**: `PrepareStoryResult` type, `prepareStory()`, `generateOpeningPage()` + unit tests
2. **Briefing helpers**: `briefing-helpers.ts` + unit tests
3. **Routes**: Briefing GET/POST routes, play route guard, stories route changes + route tests
4. **Template**: `briefing.ejs` EJS template
5. **CSS**: Briefing styles in `styles.css`
6. **Client JS**: `10-briefing-controller.js`, update `09-controllers.js`, regenerate `app.js`
7. **Home page**: Template changes for 0-page stories
8. **Integration tests**: Full flow tests
9. **E2E tests**: Browser-level tests
