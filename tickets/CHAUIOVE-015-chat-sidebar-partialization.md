# CHAUIOVE-015: Chat sidebar partialization

**Status**: PENDING
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
2. The repository already uses EJS partials as an established pattern, for example header/footer includes in multiple page templates and tests around partial usage in [`test/unit/server/views/layout.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/layout.test.ts) and [`test/unit/server/views/partials.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/server/views/partials.test.ts).
3. Sidebar client behavior is keyed off existing IDs and `data-chat-*` hooks, especially in [`public/js/src/20b-chat-sidebar.js`](/home/joeloverbeck/projects/one-more-branch/public/js/src/20b-chat-sidebar.js) and [`test/unit/client/chat-page/controller.test.ts`](/home/joeloverbeck/projects/one-more-branch/test/unit/client/chat-page/controller.test.ts). Any refactor must preserve those contracts exactly.
4. The just-completed card styling ticket already established `chat-sidebar__section` as the canonical sidebar block primitive. This ticket must not reintroduce parallel abstractions or duplicate styling ownership.

## Architecture Check

1. Extracting the chat sidebar into a dedicated partial is cleaner than leaving it inline because it creates an explicit composition boundary around a cohesive UI unit that already has distinct styling and controller behavior.
2. Where the sidebar uses repeated section structure, the server should own a single descriptor/source-of-truth for repeated presentation concerns instead of duplicating headings, metadata wrappers, and section boilerplate across hand-written markup.
3. The refactor must preserve canonical selectors and IDs. No backwards-compatibility aliases, duplicate hooks, or parallel DOM contracts.
4. This is preferable to a broad page-template rewrite because it improves modularity without destabilizing unrelated chat-page concerns.

## What to Change

### 1. Extract the right sidebar into a dedicated partial

Move the sidebar markup out of [`src/server/views/pages/chat.ejs`](/home/joeloverbeck/projects/one-more-branch/src/server/views/pages/chat.ejs) into a new partial under `src/server/views/partials/`.

The chat page should include that partial rather than inlining the sidebar structure.

### 2. Centralize repeated sidebar section scaffolding where it reduces duplication

For sections that share a common accordion shell, introduce a server-side descriptor or helper-local data structure inside the view layer so repeated section metadata is defined once and rendered consistently.

Do not force every section into the same abstraction if that makes the template harder to read. The goal is cleaner ownership, not abstraction theater.

### 3. Preserve exact client contracts

Keep all existing section IDs, `data-chat-section`, `data-chat-field`, `data-chat-list`, gauge hooks, and open/close behavior unchanged so [`public/js/src/20b-chat-sidebar.js`](/home/joeloverbeck/projects/one-more-branch/public/js/src/20b-chat-sidebar.js) continues to work without compatibility code.

### 4. Strengthen server-view tests around the new composition boundary

Add or update tests so the chat page proves it includes the sidebar partial and the rendered sidebar still exposes the same DOM contract.

## Files to Touch

- `src/server/views/pages/chat.ejs` (modify)
- `src/server/views/partials/chat-sidebar.ejs` (new)
- `test/unit/server/views/chat.test.ts` (modify)
- `test/unit/server/views/partials.test.ts` (modify or extend if partial-level coverage is warranted)
- `test/unit/client/chat-page/controller.test.ts` (modify only if fixture parity is required)

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
3. Sidebar toggle/update behavior continues to pass existing controller coverage unchanged.
4. Existing suite: `npm test`

### Invariants

1. `chat-sidebar__section` remains the canonical sidebar block selector.
2. No new alias classes, duplicate DOM hooks, or fallback client paths are introduced.
3. The sidebar remains server-rendered EJS, not split across mixed server/client rendering sources.

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat.test.ts` — assert the chat page includes the sidebar partial and still renders the full sidebar DOM contract.
2. `test/unit/server/views/partials.test.ts` — add partial-focused coverage if the new sidebar partial has enough rendering logic to justify direct testing.
3. `test/unit/client/chat-page/controller.test.ts` — keep controller fixtures aligned only if the refactor requires fixture updates; the main rationale is to prove DOM hook preservation.

### Commands

1. `npx jest test/unit/server/views/chat.test.ts test/unit/server/views/partials.test.ts test/unit/client/chat-page/controller.test.ts`
2. `npm run lint && npm run typecheck && npm test`
