# EVOLVE-04: Create Evolution Page EJS Template

**Priority**: MEDIUM
**Depends on**: EVOLVE-03
**Blocks**: EVOLVE-06

## Summary

Create the EJS template for the evolution page at `/evolve`. The page allows users to select a kernel, pick 2-3 parent concepts, and evolve them into offspring.

## Files to Create

1. **`src/server/views/pages/evolution.ejs`**

## Page Layout

### Section 1: Kernel Selection
- Dropdown `<select id="evolution-kernel-selector">` populated from kernels API
- Kernel summary card (same pattern as concepts page: dramatic thesis, value at stake, etc.)
- Selecting a kernel triggers client-side concept filtering

### Section 2: Parent Concept Selection
- Container `<div id="evolution-parent-concepts">` -- initially hidden, shown after kernel selection
- Displays concept cards filtered by `sourceKernelId`
- Each card is selectable (checkbox or toggle) with visual feedback
- Shows: name, oneLineHook, genreFrame badge, conflictAxis badge, overall score badge, hardened badge
- Selection constraint: min 2, max 3 concepts
- Counter text: "Selected: 0/3 (select 2-3 concepts)"

### Section 3: API Key + Evolve Button
- Password input `<input id="evolutionApiKey" type="password">`
- Same help text pattern as concepts page (OpenRouter link)
- "Evolve Concepts" button `<button id="evolve-btn">` disabled until 2-3 selected + API key

### Section 4: Results (initially hidden)
- Section `<div id="evolution-results-section">` -- shown after evolution completes
- Title: "Evolved Concepts"
- Subtitle: "Click 'Save' on any concept to add it to your library."
- Container `<div id="evolution-cards">` for offspring concept cards
- Each card follows same format as concepts page result cards:
  - Genre frame + conflict axis badges
  - Score badge
  - oneLineHook as title
  - elevatorParagraph as body
  - Scores breakdown
  - Strengths/weaknesses lists
  - Verification data (signature scenario, integrity score)
  - "Save" button

### Loading Overlay
- Same loading overlay pattern as concepts page
- `<div class="loading-overlay" id="evolution-loading">`

## Files to Modify

1. **`src/server/views/partials/header.ejs`** -- Add navigation link:
   ```html
   <a href="/evolve">Evolve</a>
   ```
   Position: after "Concepts" link

## Styling

Reuse existing CSS classes:
- `.form-section`, `.form-group`, `.form-actions` for layout
- `.spine-card`, `.spine-badge`, `.spine-badge-type`, `.spine-badge-conflict`, `.spine-badge-arc` for cards
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-small` for buttons
- `.loading-overlay`, `.loading-spinner`, `.loading-status` for loading state

New CSS needed (minimal):
- `.concept-selectable` -- selectable card style (border highlight on select)
- `.concept-selected` -- selected state (accent border, background tint)

## Acceptance Criteria

- [ ] Page renders at /evolve
- [ ] Kernel dropdown populates from API
- [ ] Concepts filter when kernel selected
- [ ] Concept cards are selectable with visual feedback
- [ ] Selection constrained to 2-3 concepts
- [ ] Evolve button disabled until prerequisites met
- [ ] Results section shows offspring cards with save buttons
- [ ] Loading overlay shows during pipeline execution
- [ ] Header includes "Evolve" link next to "Concepts"
- [ ] Reuses existing CSS classes where possible
