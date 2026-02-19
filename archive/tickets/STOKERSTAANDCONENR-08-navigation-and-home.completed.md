# STOKERSTAANDCONENR-08: Navigation & Home Page Updates

**Status**: COMPLETED
**Priority**: LOW
**Depends On**: STOKERSTAANDCONENR-06
**Spec Phase**: 9a

## Summary

Add a top-level "Kernels" navigation link and update global nav ordering to: Stories -> Kernels -> Concepts -> New Adventure.

## Reassessed Assumptions

- Current code uses a shared header partial (`src/server/views/partials/header.ejs`) for primary navigation.
- `home.ejs` does not define standalone nav cards for concepts/new story; adding a duplicate home-only nav card would create drift and violate DRY.
- Kernel route/template already exist (`/kernels`, `pages/kernels`), so this ticket is strictly a navigation wiring + ordering task.
- Existing tests do not enforce nav ordering or `/kernels` presence in shared header.

## Architecture Rationale

Implementing this in the shared header is more robust and extensible than home-page-only links:
- Single source of truth for global navigation.
- Prevents route/link divergence across pages.
- Keeps future nav changes localized to one template + one focused test file.
- Avoids backwards-compatibility aliasing or duplicate navigation components.

## File List

### Modified Files
- `src/server/views/partials/header.ejs` -- Add `/kernels` top-level link and enforce nav order.
- `test/unit/server/views/partials.test.ts` -- Add assertions for kernels link presence and ordering invariant.

### Test Files
- `test/unit/server/views/partials.test.ts`
- Relevant existing home/view route tests remain green.

## Detailed Requirements

### `src/server/views/partials/header.ejs`

Add a top-level `<a href="/kernels">Kernels</a>` link in the shared nav.

Required order in the header nav:
1. Stories (`/`)
2. Kernels (`/kernels`)
3. Concepts (`/concepts`)
4. New Adventure (`/stories/new`)
5. Prompt Logs (`/logs`)

Users must still be able to navigate directly to any page regardless of visual order.

## Out of Scope

- Kernels page template (STOKERSTAANDCONENR-06)
- Kernel routes (STOKERSTAANDCONENR-05)
- Concept page changes (STOKERSTAANDCONENR-10)
- Any backend logic changes
- Home page hero/content redesign
- New navigation components outside the shared header

## Acceptance Criteria

### Tests That Must Pass
- Home page renders without error
- Shared header template contains a link to `/kernels`
- Shared header nav preserves required order: Stories -> Kernels -> Concepts -> New Adventure
- Existing home page links (concepts, stories, etc.) remain functional

### Invariants
- All existing navigation links are preserved
- New link uses existing header nav structure and styling
- No backend route changes (template + view tests only)
- Users can still navigate directly to `/concepts` or `/stories/new` without going through `/kernels`

## Outcome

- Completion date: 2026-02-19
- Actual changes:
  - Added `/kernels` to shared header nav and enforced order `Stories -> Kernels -> Concepts -> New Adventure -> Prompt Logs`.
  - Strengthened shared partial template tests to assert both kernels-link presence and navigation ordering.
- Deviations from original plan:
  - Did not modify `home.ejs` with standalone cards/buttons because navigation is centralized in `partials/header.ejs`; this avoids duplication and keeps a single global navigation source of truth.
- Verification:
  - `npm run test:unit -- test/unit/server/views/partials.test.ts test/unit/server/views/home.test.ts test/unit/server/routes/home.test.ts`
  - `npm run test:integration -- test/integration/server/kernel-routes.test.ts`
  - `npm test`
  - `npm run lint`
