# CHACHASYS-013: Chat EJS View Templates

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: None

## Problem

The chat feature already has live Express routes in `src/server/routes/chat.ts`, but the three server-rendered EJS templates those routes target do not exist yet. The gap is now strictly the view layer: provide a list page, setup page, and conversation page that match the existing route render contract and expose stable DOM hooks for the follow-up client controllers.

## Assumption Reassessment (2026-03-27)

1. `src/server/routes/chat.ts` is already implemented and is the source of truth for render payloads:
   - `GET /chat` renders `pages/chat-list` with `{ title, chats }`
   - `GET /chat/new` renders `pages/chat-new` with `{ title }`
   - `GET /chat/:chatId` renders `pages/chat` with `{ title, session, turns }`
2. `src/server/views/pages/` contains comparable page templates such as `character-webs.ejs` and `character-brainstormer.ejs`, and they consistently include `../partials/header` and `../partials/footer`.
3. Current test coverage for server-rendered pages in this repo is primarily unit-level template testing under `test/unit/server/views/`, plus route tests under `test/unit/server/routes/`. The original ticket’s E2E-only expectation does not match the repo’s current testing architecture.
4. Header `/chat` navigation is intentionally out of scope here because that work is already assigned to `CHACHASYS-015`.
5. Client-side behavior is also intentionally deferred. `CHACHASYS-014` expects stable DOM hooks from these templates, so this ticket should establish those hooks instead of embedding behavior inline.

## Architecture Check

1. The cleanest architecture is to keep these templates declarative and server-rendered: render the current persisted state from the route payload, and expose explicit IDs/data attributes that the later controllers can hydrate.
2. Do not invent a parallel view contract from the spec. The route payloads and current chat model types are the canonical interface.
3. Avoid inline scripts and avoid hard-coding API keys into HTML. The templates should provide semantic placeholders and mounting points only.
4. Avoid CSS work in this ticket unless the template would otherwise be unusable. Structural markup is the durable part; styling can evolve independently.

## What to Change

### 1. Create `src/server/views/pages/chat-list.ejs`

- Follow the existing page shell pattern: title, shared stylesheet, header/footer partials, `/js/app.js`
- Render the `chats` collection provided by the route
- Display summary data already exposed by `ChatSessionSummary`: target character name, interlocutor name, turn count, updated timestamp, location
- Link each saved chat to `/chat/<id>`
- Include a visible "New Chat" link/button to `/chat/new`
- Include delete buttons and stable list-level DOM hooks for `CHACHASYS-014` to attach confirmation/delete behavior
- Render a clean empty state when `chats` is empty

### 2. Create `src/server/views/pages/chat-new.ejs`

- Render a normal HTML form posting to `POST /chat`
- Include target/interlocutor character selectors with empty initial options; client JS will populate them later
- Include all create-route fields required by `parseChatCreateBody()` in `src/server/routes/chat.ts`
- Use select options that exactly match `TIME_OF_DAY_VALUES`, `PRIVACY_VALUES`, and `DISTANCE_BAND_VALUES`
- Include stable DOM hooks for the future client controller (`CHACHASYS-014`) to populate characters, validate distinct selections, and manage submit state
- Do not include an API key field here; chat creation does not accept or require one in the current route contract

### 3. Create `src/server/views/pages/chat.ejs`

- Render the existing conversation history from `turns`
- Render chat blocks semantically:
  - `ACTION` blocks as italicized action text
  - `SPEECH` blocks as quoted dialogue, with delivery text when present
- Render stable DOM/data hooks for:
  - chat/session metadata
  - message list container
  - composer form
  - loading/progress state
  - sidebar state sections that the client controller can update after turn generation
- Surface the current physical context and relationship state from `session`
- Include a textarea + send button for the future turn controller
- Include an API key password input for turn generation only, because `POST /chat/:chatId/turn` requires it in the current route contract
- Keep the rendered conversation authoritative: the page should still be understandable if JS enhancement fails

## Files to Touch

- `src/server/views/pages/chat-list.ejs` (new)
- `src/server/views/pages/chat-new.ejs` (new)
- `src/server/views/pages/chat.ejs` (new)
- `test/unit/server/views/chat-list.test.ts` (new)
- `test/unit/server/views/chat-new.test.ts` (new)
- `test/unit/server/views/chat.test.ts` (new)

## Out of Scope

- Client-side JavaScript logic (CHACHASYS-014)
- New CSS architecture or substantial styling work
- Header modification (CHACHASYS-015)
- Route handler payload changes unless template implementation proves a route/view contract bug
- Chat service or persistence changes

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `chat-list.ejs` renders without errors with an empty `chats` array and exposes list/controller hooks
2. Unit test: `chat-list.ejs` renders saved chat summaries and delete affordances from route payload data
3. Unit test: `chat-new.ejs` renders a form with all required create-route fields and enum options
4. Unit test: `chat.ejs` renders prior turns, distinguishing `ACTION` and `SPEECH` blocks correctly
5. Unit test: `chat.ejs` renders physical context, relationship state, and turn-composer hooks
6. Existing route tests for `src/server/routes/chat.ts` continue to pass
7. `npm run test:unit -- --runInBand --testPathPatterns='test/unit/server/(routes/chat|views/chat)'` passes
8. `npm run typecheck` passes
9. `npm run lint` passes
10. `npm test` passes

### Invariants

1. All templates include the shared header partial
2. No inline `<script>` logic in the templates
3. Templates do not contain inline `<script>` logic — all behavior in client JS files
4. Templates use existing CSS classes where practical and rely primarily on stable semantic structure/IDs
5. Form action URLs and field names match the current route definitions in `src/server/routes/chat.ts`
6. The new-chat template does not collect fields the create route does not accept
7. The conversation template may collect an API key only for the turn-generation form, matching the current `/chat/:chatId/turn` contract

## Test Plan

### New/Modified Tests

1. `test/unit/server/views/chat-list.test.ts` — list template shell and rendered chat summaries
2. `test/unit/server/views/chat-new.test.ts` — setup template fields, enum options, controller hooks
3. `test/unit/server/views/chat.test.ts` — conversation template rendering, sidebar state, composer hooks

### Commands

1. `npm run test:unit -- --runInBand --testPathPatterns='test/unit/server/(routes/chat|views/chat)'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completion date: 2026-03-27
- Actual changes:
  - Added `chat-list.ejs`, `chat-new.ejs`, and `chat.ejs` under `src/server/views/pages/`
  - Added focused server-view unit tests for all three templates
  - Reassessed and corrected the ticket so it matches the already-implemented chat route contract in `src/server/routes/chat.ts`
- Deviations from original plan:
  - The original ticket assumed chat routes were a dependency and prescribed E2E-first verification; in reality, routes/services/tests already existed, so the work was narrowed to view-only implementation with unit-level template coverage aligned to the repo’s actual testing architecture
  - The original ticket included an API key field on the new-chat page even though `POST /chat` does not accept one; the delivered implementation keeps API key entry only on the conversation page, where `/chat/:chatId/turn` actually requires it
  - Styling was intentionally kept structural/minimal rather than introducing new CSS architecture in this ticket
- Verification results:
  - `npm run typecheck` passed
  - `npm run lint` passed
  - `npm test` passed
