# CHABRA-006: Character brainstormer EJS page template

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHABRA-005

## Problem

Need the EJS template for the character brainstormer page. This renders the form (concept/worldbuilding selectors, notes textarea, API key input), loading overlay, and results section (character cards with copy buttons).

## Assumption Reassessment (2026-03-25)

1. EJS templates follow the pattern in `character-webs.ejs`: `<!DOCTYPE html>`, include header partial, main container with page ID, form sections, error display, loading overlay.
2. Concept and worldbuilding dropdowns are server-rendered `<select>` elements populated from the `concepts` and `worldbuildings` arrays passed by the GET handler.
3. API key input uses `sessionStorage` pattern consistent with all other pages.
4. Loading overlay uses the same classes and structure as other pages (spinner + progress stage text).
5. Page ID must match what the client controller looks for (e.g., `id="character-brainstormer-page"`).

## Architecture Check

1. Follows existing EJS template patterns exactly — no novel UI architecture.
2. Results section uses card-based layout consistent with existing pages.
3. No backwards-compatibility shims needed.

## What to Change

### 1. Create EJS template

File: `src/server/views/pages/character-brainstormer.ejs`

Sections:
1. **Head**: Standard meta, title, CSS link
2. **Header**: `<%- include('../partials/header') %>`
3. **Main container** (`id="character-brainstormer-page"`):
   - Hero section with title and tagline
   - Error display (`id="character-brainstormer-error"`, hidden by default)
   - API key input (password field)
   - Configuration card:
     - Concept `<select>` populated from `<%= concepts %>` with `data-concept-id` attributes
     - Worldbuilding `<select>` populated from `<%= worldbuildings %>`
     - Notes `<textarea>` with placeholder text from spec
     - "Brainstorm Characters" button
   - Loading overlay (hidden by default)
   - Results section (hidden by default):
     - "Copy All as Markdown" button
     - Diversity note (collapsible)
     - Character cards container
4. **Scripts**: `<script src="/js/app.js"></script>`

### 2. Character card HTML structure

Each card displays:
- Name (bold header)
- Pitch (emphasized)
- Core Wound, Contradiction, Archetype, Story Function, Relationship Dynamic, Memorable For, Metaphor Family (labeled fields)
- "Copy as Markdown" button

## Files to Touch

- `src/server/views/pages/character-brainstormer.ejs` (new)

## Out of Scope

- Client-side controller logic (CHABRA-007)
- CSS changes (use existing styles; only add new CSS if absolutely necessary)
- Header navigation changes (CHABRA-008)
- Any modification to existing EJS templates or partials
- Responsive design beyond what existing CSS provides

## Acceptance Criteria

### Tests That Must Pass

1. `npm run build` succeeds (EJS template copied to dist/)
2. `npm run typecheck` passes
3. `npm run lint` passes
4. Existing suite: `npm test` — no regressions
5. Template renders without errors when GET handler provides `{ title, concepts: [], worldbuildings: [] }`

### Invariants

1. Template includes the header partial
2. Page container has `id="character-brainstormer-page"` matching controller expectations
3. All form elements have IDs that match the client controller's `getElementById()` calls
4. Loading overlay follows the same pattern as other pages
5. No inline JavaScript in the template (all logic in the controller)
6. API key input is `type="password"`

## Test Plan

### New/Modified Tests

1. No dedicated test file for EJS — verified by build + manual testing + integration via route handler tests.

### Commands

1. `npm run build` — confirm template is compiled/copied
2. `npm test` — no regressions
