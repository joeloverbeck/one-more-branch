# CONGEN-06: UI — Seed Form and Concept Cards

**Status**: PENDING
**Depends on**: CONGEN-05, CONGEN-08
**Blocks**: CONGEN-07

## Summary

Add the concept generation UI to the new-story page: a seed input form, concept card rendering, and concept selection flow. This adds Step 1 (seed form) and Step 2 (concept selection) before the existing story details form.

## Files to Create

- `public/js/src/04d-concept-renderer.js`

## Files to Touch

- `src/server/views/pages/new-story.ejs` — Add concept seed form section and concept cards container
- `public/js/src/01-constants.js` — Add concept-related stage phrase pools and display names
- `public/js/src/09-controllers.js` — Extend `initNewStoryPage()` with concept generation flow
- `public/js/app.js` — Regenerated via `node scripts/concat-client-js.js` (not manually edited)

## Out of Scope

- Form pre-fill mapping from concept to story fields (CONGEN-07)
- Story model changes (CONGEN-07)
- Backend route handlers (CONGEN-05)
- Stage registration in `stage-model.ts` (CONGEN-08)
- Stress-test toggle UI interaction (CONGEN-07 — the toggle is placed here but wired in CONGEN-07)
- Existing play page, briefing page, or any other views

## Work Description

### 1. EJS Template Changes (`new-story.ejs`)

Add a new section at the top of the page, BEFORE the existing story form:

**Concept Seed Section:**
- Text input: "Genre Vibes" (placeholder: "dark fantasy, sci-fi noir, cosmic horror...")
- Text input: "Mood Keywords" (placeholder: "melancholic, tense, whimsical...")
- Text input: "Content Preferences" (placeholder: "include body horror, no romance...")
- Text input: "Thematic Interests" (placeholder: "identity, power, memory, justice...")
- Text input: "Spark Line" (placeholder: "What if memories could be eaten?")
- "Generate Concepts" button
- "Skip — I have my own concept" link that hides seed section and shows existing form
- Progress spinner container (reuse existing spinner pattern)

**Concept Cards Section** (initially hidden):
- Container `#concept-cards` for 3 concept cards
- Each card shows: one-line hook (headline), elevator paragraph, genre frame + conflict axis badges, protagonist role, 6-dimension score display (bars), tradeoff summary, strengths/weaknesses
- "Harden this concept" checkbox/toggle
- Click-to-select behavior

**Existing Form Section:**
- Initially hidden when seed section is visible
- Becomes visible after concept selection OR "Skip" click
- No structural changes to existing form fields

### 2. Concept Renderer (`04d-concept-renderer.js`)

Follow `04b-spine-renderer.js` pattern:

- `renderConceptCards(evaluatedConcepts)` — Renders 3 concept cards into `#concept-cards`
- Each card: hook as title, elevator paragraph, badge row (genre frame, conflict axis), protagonist role subtitle, score bars (6 dimensions with labels), tradeoff summary, strengths/weaknesses lists
- Score bars: visual width proportional to 0-5 score, color coding (red <3, yellow 3, green >3)
- Click handler: marks card as selected, stores selected concept data

### 3. Constants Updates (`01-constants.js`)

Add to `STAGE_PHRASE_POOLS`:
- `GENERATING_CONCEPTS` — 20+ whimsical phrases about concept generation
- `EVALUATING_CONCEPTS` — 20+ whimsical phrases about concept evaluation
- `STRESS_TESTING_CONCEPT` — 20+ whimsical phrases about stress-testing

Add to `STAGE_DISPLAY_NAMES`:
- `GENERATING_CONCEPTS: 'IDEATING'`
- `EVALUATING_CONCEPTS: 'EVALUATING'`
- `STRESS_TESTING_CONCEPT: 'HARDENING'`

### 4. Controller Updates (`09-controllers.js`)

Extend `initNewStoryPage()`:
- Wire "Generate Concepts" button to POST `/stories/generate-concepts`
- Send seed fields + apiKey from session storage
- Show progress spinner during generation (using existing progress polling pattern)
- On success: call `renderConceptCards()`, show concept cards section
- Wire "Skip" link to hide seed section, show existing form
- Wire concept card click to store selected concept data and trigger CONGEN-07 pre-fill

### 5. Regenerate `app.js`

Run `node scripts/concat-client-js.js` after all JS changes.

## Acceptance Criteria

### Tests That Must Pass

Client tests (`npm run test:client`) must pass after regenerating `app.js`:

1. **`STAGE_PHRASE_POOLS` has concept-related keys**: `GENERATING_CONCEPTS`, `EVALUATING_CONCEPTS`, `STRESS_TESTING_CONCEPT` each have 20+ entries
2. **`STAGE_DISPLAY_NAMES` has concept-related keys**: All three new stages have display names

Manual verification (no automated E2E for this ticket):

3. **Seed form renders**: All 5 seed input fields visible with correct placeholders
4. **Skip link works**: Hides seed section, shows existing story form
5. **Concept cards render**: 3 cards with hook, elevator, badges, scores, tradeoffs

### Invariants That Must Remain True

- `npm run typecheck` passes
- `npm run lint` passes
- No existing tests break
- Existing story creation flow (skip → manual form → generate spines → create) continues to work
- `app.js` is regenerated, never hand-edited
- All new client code is inside IIFE (consistent with existing pattern)
- No new npm dependencies added
