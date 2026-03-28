# CHAUIOVE-015: Chat sidebar partialization

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: `archive/tickets/CHAUIOVE-014-sidebar-card-separation.md`

## Problem

`src/server/views/pages/chat.ejs` currently owns a very large inline right-sidebar block with repeated section scaffolding, repeated heading/meta/body structure, and tightly interleaved markup concerns. The page works, but the sidebar is difficult to evolve safely because:

- the sidebar structure is embedded deep inside a large page template;
- repeated section patterns are hand-written rather than centralized;
- tests only see the final rendered HTML, not a reusable sidebar composition boundary.

This is not yet a user-facing bug, but it is an architecture drag point. Future sidebar work will stay slower and riskier unless the sidebar becomes a clearer unit.

## Assumption Reassessment (2026-03-28)

1. [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) contains the entire right-sidebar markup inline inside the chat page rather than including a dedicated sidebar partial.
2. The repository already uses EJS partials as an established pattern, especially header/footer includes across page templates. The current automated coverage is split between:
   - source-level include assertions in [`test/unit/server/views/layout.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/layout.test.ts);
   - direct partial file assertions in [`test/unit/server/views/partials.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/partials.test.ts).
   The current suite does not yet assert a dedicated chat-sidebar include boundary.
3. Sidebar client behavior is keyed off existing IDs and `data-chat-*` hooks, especially in [`public/js/src/20b-chat-sidebar.js`](/home/joeloverbeck/projects/one-more-branch/public/js/src/20b-chat-sidebar.js) and [`test/unit/client/chat-page/controller.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/client/chat-page/controller.test.ts). Any refactor must preserve those contracts exactly.
4. The just-completed card styling ticket already established `chat-sidebar__section` as the canonical sidebar block primitive. This ticket must not reintroduce parallel abstractions or duplicate styling ownership.
5. [`test/unit/server/views/chat.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/chat.test.ts) already locks down most rendered sidebar DOM contracts. The new partial boundary should therefore be asserted from template source, while rendered-output tests continue to assert the live DOM hooks and content contract.

## Architecture Check

1. Extracting the chat sidebar into a dedicated partial is cleaner than leaving it inline because it creates an explicit composition boundary around a cohesive UI unit that already has distinct styling and controller behavior.
2. A second, generic "sidebar descriptor" abstraction is not automatically better architecture here. Most sections are structurally similar at the shell level but heterogeneous in their bodies, data sources, and accessibility text. Forcing them through one descriptor risks hiding the real view contract behind abstraction ceremony.
3. The better long-term architecture for this ticket is:
   - extract the sidebar into its own partial;
   - keep sidebar-specific helper/data preparation explicit and close to the sidebar boundary;
   - only centralize repeated list/group rendering where it clearly removes duplication without obscuring section-specific semantics.
4. The refactor must preserve canonical selectors and IDs. No backwards-compatibility aliases, duplicate hooks, or parallel DOM contracts.
5. This is preferable to a broad page-template rewrite because it improves modularity without destabilizing unrelated chat-page concerns.

## What to Change

### 1. Extract the right sidebar into a dedicated partial

Move the sidebar markup out of [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) into a new partial under `src/server/views/partials/`.

The chat page should include that partial rather than inlining the sidebar structure.

### 2. Keep any DRYing local and explicit

Only centralize repeated sidebar markup where the payoff is obvious, for example repeated list-group rendering inside the sidebar partial.

Do not introduce a generic descriptor layer for every sidebar section unless the final template is genuinely easier to read and maintain. The primary architectural win for this ticket is the partial boundary itself.

### 3. Preserve exact client contracts

Keep all existing section IDs, `data-chat-section`, `data-chat-field`, `data-chat-list`, gauge hooks, and open/close behavior unchanged so [`public/js/src/20b-chat-sidebar.js`](/home/joeloverbeck/projects/one-more-branch/public/js/src/20b-chat-sidebar.js) continues to work without compatibility code.

### 4. Strengthen server-view tests around the new composition boundary

Add or update tests so:

- the chat page template source proves it includes the sidebar partial;
- the sidebar partial exists and contains the canonical sidebar root/section hooks;
- the rendered chat page still exposes the same DOM contract.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `src/server/views/partials/chat-sidebar.ejs` (new)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/server/views/partials.test.ts` (modify)
- `test/unit/client/chat-page/controller.test.ts` (verify only; modify only if fixture parity is required)

## Out of Scope

- Changing sidebar content hierarchy or semantics
- Renaming sidebar IDs or `data-chat-*` hooks
- Changing the sidebar controller behavior
- Introducing client-side templating for the sidebar
- Rewriting unrelated chat-page sections into partials in the same pass

## Acceptance Criteria

### Tests That Must Pass

1. The chat page renders the sidebar through a dedicated partial rather than an inline monolith.
2. The rendered sidebar preserves all current IDs and `data-chat-*` hooks used by the client controller.
3. The partial boundary is asserted in source-level view tests rather than inferred from rendered HTML alone.
4. Sidebar toggle/update behavior continues to pass existing controller coverage unchanged.
5. Relevant focused tests pass, then lint, typecheck, and the full test suite pass.

### Invariants

1. `chat-sidebar__section` remains the canonical sidebar block selector.
2. No new alias classes, duplicate DOM hooks, or fallback client paths are introduced.
3. The sidebar remains server-rendered EJS, not split across mixed server/client rendering sources.
4. The sidebar partial remains a view-composition boundary, not a new generic view framework inside EJS.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — assert the chat page includes the sidebar partial and still renders the full sidebar DOM contract.
2. `test/unit/server/views/partials.test.ts` — assert the new sidebar partial exists and retains the canonical sidebar root/section hooks.
3. `test/unit/client/chat-page/controller.test.ts` — keep controller coverage passing unchanged to prove DOM hook preservation.

### Commands

1. `npx jest test/unit/server/views/chat.test.ts test/unit/server/views/partials.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`

## Outcome

- Completion date: 2026-03-28
- Actual changes:
  - Extracted the chat sidebar from [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) into [`src/server/views/partials/chat-sidebar.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/partials/chat-sidebar.ejs).
  - Passed sidebar-specific locals explicitly through the include boundary so the partial does not rely on implicit EJS scope leakage.
  - Added a source-level include assertion in [`test/unit/server/views/chat.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/chat.test.ts) and added direct partial contract coverage in [`test/unit/server/views/partials.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/partials.test.ts).
  - Kept the client DOM contract unchanged; [`test/unit/client/chat-page/controller.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/client/chat-page/controller.test.ts) passed without fixture changes.
- Deviations from original plan:
  - Did not introduce a generic descriptor abstraction for all sidebar sections. After reassessment, that would have added view indirection without improving the current heterogeneous section bodies.
  - Did not modify client fixtures or controller code because the refactor preserved the exact DOM hooks and behaviors already under test.
- Verification results:
  - `npx jest test/unit/server/views/chat.test.ts test/unit/server/views/partials.test.ts test/unit/client/chat-page/controller.test.ts`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
