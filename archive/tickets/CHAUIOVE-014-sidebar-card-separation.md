# CHAUIOVE-014: Sidebar card separation

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

The right sidebar contains 7-8 sections (Scene State, Physical Context, Relationship, Knowledge State, Character Mind, Conversation, Guardrails & Constraints, Lead-In) all rendered inside a single scrollable container with minimal visual separation. When scrolling, it's hard to tell where one section ends and another begins, making the information difficult to parse.

## Assumption Reassessment (2026-03-28)

1. [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) renders the right sidebar as an `<aside id="chat-sidebar">` containing 8 `chat-sidebar__section` blocks: 1 static header, 6 collapsible `<details>` sections, and 1 static `Lead-In` section.
2. [`public/css/styles.css`](/home/joeloverbeck/projects/one-more-branch/public/css/styles.css) already defines `display: grid` and `gap: 0.7rem` for `.chat-sidebar` and `.chat-sidebar__section`, but the section styling currently uses bottom borders and shared sidebar background rather than true card surfaces.
3. [`public/js/src/20b-chat-sidebar.js`](/home/joeloverbeck/projects/one-more-branch/public/js/src/20b-chat-sidebar.js) updates the sidebar by `id`, `data-chat-section`, `data-chat-field`, `data-chat-list`, and gauge hooks. It does not depend on a dedicated "card" class.
4. Existing automated coverage is broader than the original ticket assumed:
   - [`test/unit/server/views/chat.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/chat.test.ts) validates the rendered sidebar structure.
   - [`test/unit/client/chat-page/controller.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/client/chat-page/controller.test.ts) covers sidebar toggle behavior and dynamic sidebar updates.
   - [`test/unit/server/public/css.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/public/css.test.ts) is the right place to lock in the sidebar card CSS contract.

## Architecture Check

1. The original ticket proposed adding a new `.chat-sidebar-card` class to every sidebar block. After reassessment, that is not the cleanest architecture.
2. `chat-sidebar__section` is already the canonical abstraction for every right-sidebar block on this page. Adding a second styling class would create needless aliasing and split ownership of the same concept across two selectors.
3. The durable solution is to make `.chat-sidebar__section` itself the card primitive:
   - keep all existing IDs and `data-chat-*` hooks unchanged;
   - replace border-divider styling with per-section card chrome;
   - let `.chat-sidebar` own inter-card spacing through its existing grid/gap behavior.
4. No backwards-compatibility shims. If adjacent styling rules conflict, update the canonical selectors directly rather than layering aliases.

## What to Change

### 1. Restyle the existing sidebar section primitive in `styles.css`

Update `.chat-sidebar__section` so each section is visually its own card:

- add background, border, border radius, padding, and subtle depth;
- remove the current bottom-border separator pattern;
- keep the existing section-level grid/gap behavior.

### 2. Keep container spacing explicit

Ensure `.chat-sidebar` remains the owner of inter-card spacing via grid gap. Adjust the exact gap value if needed, but do not move spacing responsibility into ad hoc per-section margins.

### 3. Preserve accordion readability inside the new cards

Verify `.chat-accordion-content` spacing still feels correct once the parent section has real card padding. Only adjust internal spacing if the card treatment makes the content feel visually doubled.

### 4. Update tests where the contract actually lives

- Add CSS assertions for the card treatment on `.chat-sidebar__section`.
- Keep the existing sidebar structure and controller tests passing to prove the visual change did not alter DOM hooks or interactive behavior.

## Files to Touch

- `public/css/styles.css` (modify)
- `test/unit/server/public/css.test.ts` (modify)
- `test/unit/server/views/chat.test.ts` (modify only if needed for a DOM contract change)
- `test/unit/client/chat-page/controller.test.ts` (modify only if needed for fixture parity)

## Out of Scope

- Changing sidebar width (stays 340px)
- Adding tabs or other navigation
- Changing collapsible behavior (accordions stay as-is)
- Header changes (CHAUIOVE-012, CHAUIOVE-013)
- Refactoring the sidebar into partials/components. That may be a future architecture improvement, but it is not required for this ticket.

## Acceptance Criteria

### Tests That Must Pass

1. `.chat-sidebar__section` is styled as a card surface rather than a simple divider row.
2. Visual gaps still exist between sections and are owned by the `.chat-sidebar` container.
3. Collapsible accordion behavior still works.
4. Sidebar toggle (show/hide) still works.
5. Dynamic sidebar updates still target the same IDs and `data-chat-*` hooks.
6. Relevant focused tests pass, then lint, typecheck, and the full test suite pass.

### Invariants

1. All section IDs preserved (`chat-physical-context`, `chat-relationship-state`, `chat-knowledge-state`, `chat-character-mind`, `chat-conversation-state`, `chat-guardrails`, `chat-lead-in-context`)
2. All `data-chat-section` attributes preserved
3. Sidebar scrolling behavior preserved
4. Card styling consistent with existing dark theme
5. `chat-sidebar__section` remains the single canonical selector for sidebar block styling on the chat page

## Test Plan

### New/Modified Tests

1. `test/unit/server/public/css.test.ts` — assert `.chat-sidebar` still owns scroll/gap behavior and `.chat-sidebar__section` has card styling instead of divider styling
2. `test/unit/server/views/chat.test.ts` — keep existing sidebar structure assertions passing; only update if a real DOM contract changes
3. `test/unit/client/chat-page/controller.test.ts` — keep sidebar toggle/update coverage passing; only update fixtures if markup changes

### Commands

1. `npx jest test/unit/server/public/css.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- Actual changes:
  - Styled the existing `.chat-sidebar__section` selector as the sidebar card primitive in [`public/css/styles.css`](/home/joeloverbeck/projects/one-more-branch/public/css/styles.css).
  - Preserved all sidebar IDs, `data-chat-*` hooks, accordion behavior, and sidebar toggle behavior.
  - Added a CSS regression test for the card treatment in [`test/unit/server/public/css.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/public/css.test.ts).
  - Strengthened the server view contract in [`test/unit/server/views/chat.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/chat.test.ts) by asserting the expected count of static and accordion sidebar sections.
- Deviations from original plan:
  - Did not add a new `.chat-sidebar-card` class.
  - Did not modify [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) because the existing `chat-sidebar__section` abstraction was already the correct styling ownership boundary.
  - Did not need to modify [`test/unit/client/chat-page/controller.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/client/chat-page/controller.test.ts) because DOM hooks and interactive behavior remained unchanged.
- Verification results:
  - `npx jest test/unit/server/public/css.test.ts test/unit/server/views/chat.test.ts test/unit/client/chat-page/controller.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
