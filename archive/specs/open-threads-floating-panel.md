# Spec: Open Threads Floating Panel on Play Page

**Status**: ✅ COMPLETED
**Created**: 2026-02-10
**Type**: UI + Play Flow Enhancement

## 1. Things That Must Change / Be Added

### 1.1 Server response contract for play page
Add open thread panel data to both server-rendered and AJAX play payloads so the widget can be rendered on initial load and rebuilt after each choice.

Files:
- `src/server/routes/play.ts`
- `src/server/views/pages/play.ejs`
- `public/js/app.js`

Required behavior:
- `GET /play/:storyId?page=:n` must expose current page open threads to the template.
- `POST /play/:storyId/choice` JSON must include open threads for the returned page.
- Open thread shape in play payload must include `id`, `text`, `threadType`, `urgency`.
- No conversion may drop `threadType` or `urgency`.

### 1.2 New floating open-threads panel in play UI
Add a fixed-position panel (non-scrolling with main content) that displays active threads sorted by urgency.

Files:
- `src/server/views/pages/play.ejs`
- `public/css/styles.css`

Required behavior:
- Panel is visible on play page whenever there is at least one open thread.
- Panel remains in fixed position while narrative content scrolls.
- Panel title is explicit (for example: `Active Threads`).
- Thread row format:
  - `(<THREAD_TYPE>/<URGENCY>) <thread text>`
  - Example: `(MYSTERY/HIGH) Some unknown force is stalking the city`
- Sorting order is strict urgency priority:
  - `HIGH` first, then `MEDIUM`, then `LOW`.
- Ties (same urgency) use stable ordering from source array.

### 1.3 Client-side rebuild after AJAX choice flow
Because play choices are AJAX-driven, the panel must be recreated/reconciled after each successful choice response.

Files:
- `public/js/app.js`

Required behavior:
- After `POST /play/:storyId/choice` succeeds, open threads panel updates to new page state without full reload.
- If no threads remain, panel is hidden or removed.
- If threads appear, panel is created if missing.
- Existing panel is not duplicated after repeated choice clicks.
- Rendering must continue to use HTML escaping for thread text.

### 1.4 View helper for panel-ready display data
Introduce a focused helper to normalize and sort threads for view rendering and JSON payload consistency.

Files:
- `src/server/utils/view-helpers.ts`
- `src/server/utils/index.ts` (if export surface changes)

Required behavior:
- Helper returns panel rows in final display order.
- Helper is pure and deterministic for same input.
- Unknown urgency values must not crash rendering; they are treated as lowest priority.

### 1.5 Accessibility and responsive behavior
Add accessibility and mobile-safe behavior for the fixed panel.

Files:
- `src/server/views/pages/play.ejs`
- `public/css/styles.css`

Required behavior:
- Panel has semantic structure (`aside`, heading, list).
- Panel is keyboard/screen-reader discoverable.
- On narrow viewports, panel must not block choice interactions.
- Mobile fallback may switch from fixed to static/sticky layout if needed for usability.

### 1.6 Documentation update to keep rules accurate
This feature adds play-page UI behavior and route payload expectations that are not currently documented in architecture docs.

Files to update after implementation (separate change):
- `CLAUDE.md`

Required behavior:
- Document play-page rendering contract for open threads panel.
- Document that choice AJAX responses include thread metadata used by client re-rendering.

## 2. Invariants That Must Pass

### 2.1 Data invariants
- `openThreads` entries rendered in play UI always include `text`, `threadType`, `urgency`.
- Rendered label always reflects actual enum values from page data.
- Thread text is never injected unescaped into `innerHTML`.

### 2.2 Ordering invariants
- Display order always respects `HIGH > MEDIUM > LOW`.
- Sorting is deterministic and stable for equal urgency.
- Same source data always yields identical output order.

### 2.3 UI invariants
- Panel remains visible in a fixed viewport position on desktop while content scrolls.
- Panel does not overlap or block primary choice controls in supported breakpoints.
- Panel shows empty state only if explicitly designed; otherwise it is hidden when no threads exist.

### 2.4 AJAX lifecycle invariants
- A successful choice request updates narrative, choices, and threads panel from the same response payload.
- No full page reload is required to refresh threads panel after a choice.
- Repeated successful choices do not create duplicate panel containers or duplicate rows from stale DOM state.

### 2.5 Error/fallback invariants
- Missing/invalid thread payload does not crash play page rendering.
- If payload is malformed, panel fails safely (hidden) while core play flow remains usable.
- Existing story progression and choice submission behavior remain unchanged.

## 3. Tests That Must Pass

### 3.1 Unit tests: server view helpers
File:
- `test/unit/server/utils/view-helpers.test.ts`

Add cases:
- Sorts by urgency (`HIGH`, `MEDIUM`, `LOW`).
- Preserves source order for same urgency.
- Produces display label format `(<TYPE>/<URGENCY>) <text>`.
- Handles unknown urgency without throwing.

### 3.2 Unit tests: play route contracts
File:
- `test/unit/server/routes/play.test.ts`

Add/update cases:
- `GET /:storyId` render payload includes panel-ready threads data.
- `POST /:storyId/choice` response includes thread list for returned page.
- Returned thread objects include `threadType` and `urgency` unchanged.
- Route still succeeds for pages with zero threads.

### 3.3 Unit tests: play template structure
File:
- `test/unit/server/views/play.test.ts`

Add/update cases:
- Template contains open-threads panel container and heading.
- Template includes semantic list markup for thread rows.
- Template has conditional rendering based on thread presence.

### 3.4 Unit tests: client script behavior
File:
- `test/unit/server/public/app.test.ts`

Add/update cases:
- Script contains dedicated render/rebuild function for open-threads panel.
- Choice success path updates panel using AJAX response data.
- Script removes/hides panel when thread list is empty.
- Script escapes thread text before rendering HTML.

### 3.5 Unit tests: stylesheet coverage
File:
- `test/unit/server/public/css.test.ts`

Add/update cases:
- Stylesheet includes selectors for open-threads panel.
- Includes fixed-position rules for desktop.
- Includes responsive rules to prevent mobile overlap.

### 3.6 Integration tests: play flow + AJAX refresh
File(s):
- `test/integration/...` (new play flow integration test file)

Add scenarios:
- Initial play page shows sorted threads from page data.
- After making a choice, panel updates to next page’s thread set without reload.
- Resolved threads disappear; newly added threads appear in correct urgency order.

### 3.7 Regression tests
Ensure all existing relevant suites continue to pass:
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:e2e`

Focus regression areas:
- Play route rendering
- Choice AJAX flow
- Existing act indicator behavior
- Custom choice behavior

## Acceptance Criteria
1. Play page shows a floating active-threads panel with rows formatted as `(<TYPE>/<URGENCY>) <text>`.
2. Panel order is always `HIGH`, `MEDIUM`, `LOW`.
3. Panel is refreshed after every successful AJAX choice response and never duplicates itself.
4. Panel is safely hidden/removed when there are no open threads.
5. Tests above are implemented and passing with no regression in existing play behavior.

## Outcome

- **Completion date**: 2026-02-10
- **What changed**:
  - Added `getOpenThreadPanelRows()` helper to normalize/sort rows and provide `displayLabel`.
  - Updated play route GET render payload and choice POST JSON payload to include sorted open-thread panel data.
  - Added fixed-position desktop open-threads panel markup/styles with semantic `aside`/heading/list and mobile static fallback.
  - Added client-side `renderOpenThreadsPanel()` AJAX lifecycle updates (create/update/remove without duplication, escaped text).
  - Preserved typed thread metadata (`threadType`, `urgency`) through page building and active-state application.
  - Added/updated unit and integration tests for helper sorting, route payload contracts, template structure, client script behavior, stylesheet selectors, and play-flow integration.
  - Documented play-page open-thread contract in `CLAUDE.md`.
- **Deviations from plan**:
  - Introduced typed thread additions in `ActiveStateChanges.threadsAdded` (string or typed object) to prevent metadata loss during generation flow.
- **Verification**:
  - `npm run test:unit` passed.
  - `npm run test:integration` passed.
  - `npm run test:e2e` passed.
  - `npm run lint` passed.
