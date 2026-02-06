# User Interface Tickets

Implementation tickets for **Spec 06: User Interface**.

## Ticket Overview

| Ticket | Description | Depends On | Est. Size |
|--------|-------------|------------|-----------|
| [USEINT-001](./USEINT-001-express-setup.md) | Express App Setup and Configuration | None | ~100 LOC |
| [USEINT-002](./USEINT-002-error-handler.md) | Error Handler Middleware | USEINT-001 | ~50 LOC |
| [USEINT-003](./USEINT-003-ejs-layout-partials.md) | EJS Layout and Partials | USEINT-001 | ~120 LOC |
| [USEINT-004](./USEINT-004-home-routes.md) | Home Page Routes and View | USEINT-001-003 | ~180 LOC |
| [USEINT-005](./USEINT-005-story-routes.md) | Story Creation Routes and View | USEINT-001-003 | ~220 LOC |
| [USEINT-006](./USEINT-006-play-routes.md) | Play Routes and View | USEINT-001-003 | ~280 LOC |
| [USEINT-007](./USEINT-007-css-styling.md) | CSS Styling and Theming | None | ~550 LOC |
| [USEINT-008](./USEINT-008-client-js.md) | Client-Side JavaScript | USEINT-006 | ~200 LOC |
| [USEINT-009](./USEINT-009-entry-point.md) | Entry Point Update | USEINT-001-008 | ~20 LOC |
| [USEINT-010](./USEINT-010-integration-tests.md) | Integration Tests (Mocked LLM) | USEINT-001-009 | ~300 LOC |
| [USEINT-011](./USEINT-011-spec-update.md) | Update Implementation Tracker | All above | ~20 LOC |

## Dependency Graph

```
USEINT-001 (express setup)
    │
    ├──► USEINT-002 (error handler)
    │
    ├──► USEINT-003 (ejs layout/partials)
    │         │
    │         ├──► USEINT-004 (home routes)
    │         │
    │         ├──► USEINT-005 (story routes)
    │         │
    │         └──► USEINT-006 (play routes)
    │                   │
    │                   └──► USEINT-008 (client js)
    │
    └───────────────────────────────────────────────────► USEINT-009 (entry point)

USEINT-007 (css) ─────────────────────────────────────────► USEINT-009 (entry point)

All ──► USEINT-010 (integration tests) ──► USEINT-011 (spec update)
```

## Implementation Order

1. **USEINT-001** - Express setup (no dependencies)
2. **USEINT-002** - Error handler (depends on 001)
3. **USEINT-003** - EJS layout/partials (depends on 001)
4. **USEINT-007** - CSS styling (no dependencies, can be parallel with 002-003)
5. **USEINT-004** - Home routes (depends on 001-003)
6. **USEINT-005** - Story routes (depends on 001-003)
7. **USEINT-006** - Play routes (depends on 001-003)
8. **USEINT-008** - Client JS (depends on 006)
9. **USEINT-009** - Entry point (depends on all server code)
10. **USEINT-010** - Integration tests (depends on all implementation)
11. **USEINT-011** - Spec update (after all complete)

**Note**: Tickets 002, 003, and 007 can be implemented in parallel after ticket 001 is complete.

## Files Created

After all tickets are complete, `src/server/` will contain:

```
src/server/
├── index.ts              # Express app setup
├── routes/
│   ├── index.ts          # Route aggregation
│   ├── home.ts           # Home page routes
│   ├── stories.ts        # Story listing/creation routes
│   └── play.ts           # Gameplay routes
├── middleware/
│   └── error-handler.ts  # Error handling middleware
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
        └── footer.ejs    # Page footer

public/
├── css/
│   └── styles.css        # Main stylesheet
└── js/
    └── app.js            # Client-side JavaScript
```

## Test Files Created

```
test/unit/server/
├── routes.test.ts        # Route handler unit tests (mocked engine)

test/integration/server/
└── play-flow.test.ts     # Integration tests (mocked LLM)
```

## Testing Notes

**IMPORTANT**: All tests must mock LLM calls. No actual OpenRouter API calls should occur during testing.

- Unit tests mock the `storyEngine` singleton
- Integration tests mock the LLM client at the `fetch` layer
- No E2E tests with Playwright/Puppeteer (would require real API calls)

## Running Tests

```bash
# All server unit tests
npm run test:unit -- --testPathPattern=server

# All server integration tests
npm run test:integration -- --testPathPattern=server

# Individual test files
npm run test:unit -- --testPathPattern=routes
npm run test:integration -- --testPathPattern=play-flow
```
