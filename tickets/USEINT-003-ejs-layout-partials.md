# USEINT-003: EJS Layout and Partials

## Summary

Create the EJS base layout template and reusable partial components (header, footer) that will be used by all pages. Also create the error page view.

## Files to Create

- `src/server/views/layouts/main.ejs` - Base HTML layout
- `src/server/views/partials/header.ejs` - Site header with navigation
- `src/server/views/partials/footer.ejs` - Site footer with disclaimer
- `src/server/views/pages/error.ejs` - Error page

## Files to Modify

None.

## Out of Scope

- **DO NOT** modify any files in `src/models/`
- **DO NOT** modify any files in `src/persistence/`
- **DO NOT** modify any files in `src/llm/`
- **DO NOT** modify any files in `src/engine/`
- **DO NOT** create page-specific views (home, new-story, play - separate tickets)
- **DO NOT** create CSS (separate ticket USEINT-007)
- **DO NOT** create client-side JavaScript (separate ticket USEINT-008)

## Implementation Details

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

## Acceptance Criteria

### Tests That Must Pass

Create `test/unit/server/views/layout.test.ts`:

1. Layout template exists at expected path
2. Layout includes DOCTYPE declaration
3. Layout includes viewport meta tag
4. Layout includes title variable
5. Layout includes CSS link to /css/styles.css
6. Layout includes script tag for /js/app.js
7. Layout includes header partial
8. Layout includes footer partial
9. Layout has main element with container class

Create `test/unit/server/views/partials.test.ts`:

1. Header partial exists and contains logo link
2. Header partial contains navigation links to / and /stories/new
3. Footer partial exists and contains copyright text
4. Footer partial contains mature content disclaimer

Create `test/unit/server/views/error.test.ts`:

1. Error page template exists
2. Error page uses main layout
3. Error page displays message variable
4. Error page has "Back to Home" link

### Verification Commands

```bash
npm run typecheck
npm run test:unit -- --testPathPattern=test/unit/server/views
```

## Invariants That Must Remain True

1. **Semantic HTML**: Uses proper semantic elements (header, main, footer, nav)
2. **Accessibility**: Logo is a link, navigation uses nav element
3. **Responsive Meta**: Viewport meta tag is present
4. **Content Disclaimer**: Footer always shows mature content warning
5. **Layout Inheritance**: All pages use the main layout

## Directory Structure

```
src/server/views/
├── layouts/
│   └── main.ejs
├── pages/
│   └── error.ejs
└── partials/
    ├── header.ejs
    └── footer.ejs
```

## Dependencies

- Depends on USEINT-001 for Express/EJS configuration
- ejs-mate or express-ejs-layouts package for layout support (check package.json, add if needed)

## Notes

The layout uses `<%- body %>` syntax which requires a layout engine like `express-ejs-layouts` or `ejs-mate`. Verify the correct package is installed and configured in USEINT-001.

## Estimated Size

~120 LOC (templates + tests)
