# STOKERSTAANDCONENR-08: Navigation & Home Page Updates

**Status**: PENDING
**Priority**: LOW
**Depends On**: STOKERSTAANDCONENR-06
**Spec Phase**: 9a

## Summary

Add "Kernels" link to the home page navigation and any shared navigation elements. Update the visual flow to suggest Kernels -> Concepts -> New Story ordering.

## File List

### Modified Files
- `src/server/views/pages/home.ejs` -- Add "Kernels" navigation link/card

### Test Files
- Existing home route tests should still pass (no behavior change, just added link)

## Detailed Requirements

### `src/server/views/pages/home.ejs`

Add a "Kernels" link/card. Suggested placement: before the "Concepts" link.

Suggested flow ordering in the UI: Home -> **Kernels** -> Concepts -> New Story

The link should be a card or button consistent with the existing home page design, pointing to `/kernels`.

Brief description on the card: "Create dramatic kernels -- the irreducible thesis of your story" (or similar, matching the tone of other cards).

Users should be able to navigate directly to any page (Kernels, Concepts, New Story) regardless of order.

## Out of Scope

- Kernels page template (STOKERSTAANDCONENR-06)
- Kernel routes (STOKERSTAANDCONENR-05)
- Concept page changes (STOKERSTAANDCONENR-10)
- Any backend logic changes
- Shared layout/navbar changes (if navbar doesn't exist, only home page)

## Acceptance Criteria

### Tests That Must Pass
- Home page renders without error
- Home page HTML contains a link to `/kernels`
- Existing home page links (concepts, stories, etc.) remain functional

### Invariants
- All existing navigation links are preserved
- New link uses same styling/structure as existing navigation elements
- No backend route changes (just template update)
- Users can still navigate directly to `/concepts` or `/stories/new` without going through `/kernels`
