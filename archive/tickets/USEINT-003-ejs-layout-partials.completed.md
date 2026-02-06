# USEINT-003: EJS Layout and Partials

## Status

Completed (2026-02-06)

## Summary

Create foundational EJS view templates for shared page chrome (layout shell, header, footer) and the error page.

## Reassessed Assumptions (2026-02-06)

- `src/server/index.ts` is configured for plain EJS only (`app.set('view engine', 'ejs')`) and does **not** configure `express-ejs-layouts` or `ejs-mate`.
- `package.json` includes `ejs` but no layout-engine package.
- `src/server/views/` did not exist yet, and no server view tests existed for layout/partials.
- `src/server/middleware/error-handler.ts` already renders `pages/error`, so this ticket must ensure `pages/error.ejs` works with plain EJS immediately.
- The original ticket assumption that `error.ejs` should call `layout('layouts/main')` is incompatible with current runtime and would throw because `layout` helper is undefined.

## Updated Scope

- Create `src/server/views/layouts/main.ejs` as the shared HTML shell contract for upcoming route/view tickets.
- Create `src/server/views/partials/header.ejs` and `src/server/views/partials/footer.ejs`.
- Create `src/server/views/pages/error.ejs` using plain EJS includes (no layout helper dependency).
- Add focused unit tests for view template existence/content in `test/unit/server/views/`.

## Files Created

- `src/server/views/layouts/main.ejs`
- `src/server/views/partials/header.ejs`
- `src/server/views/partials/footer.ejs`
- `src/server/views/pages/error.ejs`
- `test/unit/server/views/layout.test.ts`
- `test/unit/server/views/partials.test.ts`
- `test/unit/server/views/error.test.ts`

## Files Modified

None.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** create page-specific views beyond `pages/error.ejs`
- **DO NOT** add CSS or client JavaScript
- **DO NOT** introduce layout-engine dependencies (`express-ejs-layouts`, `ejs-mate`)

## Implementation Details

### `src/server/views/layouts/main.ejs`

Base HTML scaffold with:

- `<!DOCTYPE html>`
- `<meta charset="UTF-8">`
- viewport meta tag
- `<title><%= title %></title>`
- stylesheet link to `/css/styles.css`
- header/footer partial includes
- `<main class="container">` with a `body` placeholder
- script tag for `/js/app.js`

### `src/server/views/partials/header.ejs`

Semantic site header with:

- logo link to `/`
- `nav` element with links to `/` and `/stories/new`

### `src/server/views/partials/footer.ejs`

Semantic site footer with:

- product identity copy
- mature-content disclaimer text

### `src/server/views/pages/error.ejs`

Plain EJS template that renders successfully with current app setup:

- full document structure
- includes header/footer partials directly
- displays `<%= message %>`
- includes “Back to Home” link to `/`
- does **not** call `layout(...)`

## Acceptance Criteria

### Tests Implemented

`test/unit/server/views/layout.test.ts`:

1. Layout template exists at expected path
2. Layout includes DOCTYPE declaration
3. Layout includes viewport meta tag
4. Layout includes title variable
5. Layout includes CSS link to `/css/styles.css`
6. Layout includes script tag for `/js/app.js`
7. Layout includes header partial
8. Layout includes footer partial
9. Layout has main element with container class

`test/unit/server/views/partials.test.ts`:

1. Header partial exists and contains logo link
2. Header partial contains navigation links to `/` and `/stories/new`
3. Footer partial exists and contains product identity text
4. Footer partial contains mature content disclaimer

`test/unit/server/views/error.test.ts`:

1. Error page template exists
2. Error page displays message variable
3. Error page has “Back to Home” link
4. Error page includes header and footer partials
5. Error page does not rely on unavailable `layout(...)` helper

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/views
```

## Invariants Preserved

1. **Semantic HTML**: Uses `header`, `main`, `footer`, and `nav`
2. **Accessibility**: Logo/navigation are link-based and keyboard accessible
3. **Responsive Meta**: Viewport meta tag is present
4. **Content Disclaimer**: Footer includes mature content warning text
5. **Runtime Compatibility**: Error page renders with plain EJS (no undefined layout helper)

## Dependencies

- Depends on USEINT-001 for Express/EJS configuration
- Works with plain EJS already present in `package.json` (no extra package required)

## Estimated Size

~130 LOC (templates + tests)

## Outcome

Originally planned:
- Implement layout/partials/error view using a layout helper pattern.

Actually changed:
- Implemented the same view assets but aligned to the current plain-EJS runtime.
- Replaced `layout(...)` assumption with include-based `error.ejs` so current middleware render path works.
- Added focused server-view unit tests for template contracts and runtime compatibility.
