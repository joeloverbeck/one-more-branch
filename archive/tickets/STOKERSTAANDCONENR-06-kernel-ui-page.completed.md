# STOKERSTAANDCONENR-06: Kernel UI Page (EJS Template)

**Status**: COMPLETED
**Priority**: MEDIUM
**Depends On**: STOKERSTAANDCONENR-07 (client interactivity), STOKERSTAANDCONENR-08 (navigation)
**Spec Phase**: 5a

## Reassessed Assumptions (Corrected)

1. The ticket previously depended on `STOKERSTAANDCONENR-05`, but that ticket file is currently missing from `tickets/`.
2. The repository currently has `src/server/routes/kernels.ts`, but it only exposes API endpoints and does **not** expose `GET /kernels` page rendering.
3. The repository currently does **not** contain `src/server/views/pages/kernels.ejs`.
4. Existing kernel route tests do not cover page rendering; therefore page behavior is **not** already covered.
5. Because kernel client JS (`STOKERSTAANDCONENR-07`) is pending, this ticket should deliver server-rendered page structure and route wiring only, not dynamic rendering behavior.

## Summary

Create the kernels page EJS template and wire `GET /kernels` to render it. The page must provide stable DOM anchors for upcoming client controller/renderer work and match existing server view conventions.

## Architecture Decision

Implementing this ticket is more beneficial than the current architecture because:
- Current architecture has kernel APIs without a first-class page entry point (`GET /kernels`), which fragments feature discoverability.
- Defining a stable server-rendered skeleton now gives the pending client controller a deterministic contract (IDs/sections) and reduces future churn.
- Maintaining explicit route + template tests hardens regression resistance as kernel features expand.

## File List

### New Files
- `src/server/views/pages/kernels.ejs` -- Kernels page template
- `test/unit/server/views/kernels.test.ts` -- Template structure assertions

### Modified Files
- `src/server/routes/kernels.ts` -- Add `GET /` page render route
- `test/integration/server/kernel-routes.test.ts` -- Add GET page-render route coverage
- `test/unit/server/views-copy.test.ts` -- Include `pages/kernels.ejs` in required copied views

## Detailed Requirements

### `src/server/views/pages/kernels.ejs`

Provide a page structure aligned with existing page conventions:

1. **Page header**: Title "Story Kernels" with short explanation of kernel purpose
2. **Seed input form** with 3 optional textareas:
   - `thematicInterests`
   - `emotionalCore`
   - `sparkLine`
3. **API key section**:
   - Password input for OpenRouter key (`id="kernelApiKey"`)
   - Help text clarifying key is not persisted server-side
4. **Generate button**:
   - Button id `generate-kernels-btn`
   - Initial disabled state until client JS enables when API key exists
5. **Progress section anchor**:
   - Container id `kernel-progress-section` for generation progress UI
6. **Generated kernels section**:
   - Container id `generated-kernels` for client-rendered generated cards
7. **Saved kernels section**:
   - Container id `saved-kernels` for client-rendered saved library
8. **Client bundle include**:
   - Include `/js/app.js` so upcoming kernel controller can attach on this page

### `src/server/routes/kernels.ts`

Add route:
- `GET /kernels` (router-local path `GET /`) renders `pages/kernels` with:
  - `title: 'Story Kernels - One More Branch'`
  - `kernels` loaded from `listKernels()`

This keeps kernels routing symmetric with concepts routing and keeps page rendering in the same domain router.

## Out of Scope

- Kernel card rendering logic and CRUD interaction wiring (ticket `STOKERSTAANDCONENR-07`)
- Home/header navigation updates (ticket `STOKERSTAANDCONENR-08`)
- Concept page refactors
- New CSS system or redesign

## Acceptance Criteria

### Tests That Must Pass
- Integration route test verifies `GET /` on `kernelRoutes` renders `pages/kernels` with title + kernels list
- Template unit test verifies required IDs/inputs/containers exist in `kernels.ejs`
- Build view copy test includes `pages/kernels.ejs`
- Relevant test suites pass

### Invariants
- No inline page business logic; dynamic behavior remains in client JS files
- Exactly 3 kernel seed fields (`thematicInterests`, `emotionalCore`, `sparkLine`)
- Template provides stable DOM anchors for upcoming client controller
- Route/template naming remains consistent (`/kernels` <-> `pages/kernels.ejs`)

## Outcome

- **Completion date**: 2026-02-19
- **What actually changed**:
  - Added `GET /kernels` render route to `src/server/routes/kernels.ts`.
  - Created `src/server/views/pages/kernels.ejs` with kernel seed form, API key input, progress anchor, generated/saved containers, and app bundle include.
  - Added view/unit/integration coverage for the page contract:
    - `test/unit/server/views/kernels.test.ts`
    - `test/integration/server/kernel-routes.test.ts` (`GET /` render assertion)
    - `test/unit/server/views-copy.test.ts` (dist copy requirement for `pages/kernels.ejs`)
- **Deviations from original plan**:
  - Original assumption that route tests already covered page rendering was incorrect; explicit `GET /kernels` route and test coverage were added in this ticket.
  - A small type-safety assertion refactor in `test/integration/server/kernel-routes.test.ts` was required to keep lint passing.
- **Verification results**:
  - `npm run build` passed.
  - `npm run lint` passed.
  - `npm test` passed.
