# CHACHASYS-012: Chat Routes and Route Registration

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (`src/server/services/chat-service.ts` and the chat pipeline already exist in the codebase)

## Problem

The chat feature needs Express routes for listing chats, creating new chats, viewing conversations, sending turns, and deleting chats. Routes must be registered in the central router and should reuse the existing shared generation-progress architecture instead of inventing a chat-specific polling endpoint.

## Assumption Reassessment (2026-03-27)

1. `src/server/services/chat-service.ts` already implements `createChat()`, `sendTurn()`, `resumeChat()`, `deleteChat()`, and `listChats()`. This ticket is route wiring, input normalization, and route-level validation, not service creation.
2. `src/server/routes/index.ts` is still the central mount point and needs to register the chat route module.
3. The repo already has a shared progress endpoint at `GET /generation-progress/:progressId` plus `createRouteGenerationProgress()`. A feature-specific route such as `GET /chat/:chatId/progress/:progressId` would duplicate existing infrastructure and make the architecture worse.
4. Existing route modules keep handlers thin and push business logic into services. That remains the right shape here.
5. `CHACHASYS-013` and `CHACHASYS-014` are still pending, so this ticket should guarantee render payload contracts and route behavior, not actual chat page markup or client interactions.
6. Existing LLM-backed routes consistently require a non-trivial API key string. The turn route should follow that convention rather than accepting an empty string.

## Architecture Check

1. Follow existing route patterns: pages render from `GET` handlers, async work uses `wrapAsyncRoute()`, and business logic stays in services.
2. Do not add a chat-only progress polling route. Reuse the shared `/generation-progress/:progressId` endpoint and, if necessary, extend the existing chat pipeline to emit stage progress cleanly.
3. Keep the route surface minimal and durable:
   - page routes for list/new/view
   - synchronous create redirect for form submission
   - JSON endpoint for turn submission
   - JSON endpoint for deletion
4. No backwards-compatibility aliases are needed because this feature surface is not yet shipped.

## What to Change

### 1. Create `src/server/routes/chat.ts`

Implement routes:

**`GET /chat`** → Render chat-list.ejs
- Call `chatService.listChats()`
- Render with `{ chats }` data

**`GET /chat/new`** → Render chat-new.ejs
- No data needed (character list fetched client-side from `/characters/api/list`)

**`POST /chat`** → Create new chat
- Normalize form fields into `CreateChatParams`
- Validate required structured fields before calling the service
- Call `chatService.createChat(params)`
- Redirect to `/chat/${session.id}`

**`GET /chat/:chatId`** → Render chat.ejs
- Call `chatService.resumeChat(chatId)`
- Render with `{ session, turns }` data

**`POST /chat/:chatId/turn`** → Send user message (JSON API)
- Extract `message`, `apiKey`, and optional `progressId` from body
- Validate: message not empty, max 2000 chars
- Validate: API key required and follows the existing route convention (non-trivial trimmed string)
- Start progress tracking through `createRouteGenerationProgress(progressId, ...)`
- Call `chatService.sendTurn(...)`
- Return JSON containing the pipeline result, plus the normalized `progressId` when present

**`DELETE /chat/:chatId`** → Delete chat
- Call `chatService.deleteChat(chatId)`
- Return JSON: `{ success: true }`

Important: progress polling remains `GET /generation-progress/:progressId` and is not duplicated under `/chat`.

### 2. Modify `src/server/routes/index.ts`

- Import `chatRoutes` from `'./chat'`
- Mount: `router.use('/chat', chatRoutes)`

### 3. Small supporting changes allowed if they improve the existing architecture

If the route-level progress integration exposes a clean gap in the current implementation, it is in scope to make a small supporting change such as:
- adding a dedicated chat turn generation flow type to `generation-progress`
- threading an optional `onGenerationStage` callback through the existing chat service/pipeline so progress reporting uses the same architecture as other generation flows

This is only in scope if implemented surgically. Do not sprawl into unrelated refactors.

## Files to Touch

- `tickets/CHACHASYS-012-routes.md` (modify first to reflect actual codebase assumptions)
- `src/server/routes/chat.ts` (new)
- `src/server/routes/index.ts` (modify — add import and mount)
- optionally small supporting files for shared progress plumbing if needed by the final route design

## Out of Scope

- EJS templates (CHACHASYS-013)
- Client-side JS (CHACHASYS-014)
- Re-implementing the existing chat service or chat pipeline
- Header modification (CHACHASYS-015)
- A chat-specific progress endpoint
- Broad chat-domain refactors outside the route/progress seam

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `GET /chat` calls listChats and renders chat-list template
2. Unit test: `GET /chat/new` renders chat-new template
3. Unit test: `POST /chat` calls createChat and redirects to chat page
4. Unit test: `GET /chat/:chatId` calls resumeChat and renders chat template
5. Unit test: `POST /chat/:chatId/turn` validates message length (rejects >2000 chars)
6. Unit test: `POST /chat/:chatId/turn` validates message not empty
7. Unit test: `POST /chat/:chatId/turn` validates missing/invalid API key before calling the service
8. Unit test: `POST /chat/:chatId/turn` wires progress through the shared generation-progress lifecycle when `progressId` is provided
9. Unit test: `POST /chat/:chatId/turn` returns JSON with `characterTurn` and `updatedSession`
10. Unit test: `DELETE /chat/:chatId` calls deleteChat and returns `{ success: true }`
11. Unit test: route errors map predictably (`400` for validation, `404` for missing chat/character, `500` for unknown failures)
12. Unit test: all async chat routes use `wrapAsyncRoute`
13. Unit test: central router mounts `/chat`
14. Relevant chat-related suites plus full repository verification pass before archival

### Invariants

1. All async handlers wrapped with `wrapAsyncRoute` (no unhandled promise rejections)
2. API key never logged or persisted by routes
3. Route registration does not break existing routes
4. Shared progress contract stays centralized at `/generation-progress/:progressId`
5. JSON responses use consistent success/error envelopes
6. Routes remain thin; chat business rules continue to live in the service/pipeline layer

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/chat.test.ts` — route handler tests with mocked service/progress dependencies
2. `test/unit/server/services/generation-progress.test.ts` — only if a dedicated chat flow type is added
3. `test/unit/llm/chat/chat-pipeline.test.ts` and/or `test/unit/server/services/chat-service.test.ts` — only if stage progress is threaded through the existing chat path
4. Verify router registration and shared progress integration do not regress existing route tests

### Commands

1. `npm run test:unit -- --testPathPattern='chat|generation-progress'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

## Outcome

- Completed: 2026-03-27
- Actually changed:
  - Added `src/server/routes/chat.ts` with page routes for list/new/view, JSON turn submission, and JSON deletion.
  - Registered `/chat` in the central router.
  - Reused the shared `/generation-progress/:progressId` contract instead of adding a chat-specific polling route.
  - Added a dedicated `chat-turn-generation` progress flow and threaded optional chat stage callbacks through the existing chat service/pipeline so turn progress now fits the shared architecture.
  - Registered canonical chat generation stages and updated the shared stage metadata artifacts.
- Deviations from the original plan:
  - Did not add `GET /chat/:chatId/progress/:progressId`; that would have duplicated the existing shared progress endpoint and made the architecture worse.
  - `DELETE /chat/:chatId` now returns JSON success instead of redirecting, which matches the pending client-side delete flow better.
  - Strengthened the turn route API-key validation to match the repo’s existing LLM route conventions.
- Verification:
  - `npx jest test/unit/server/routes/chat.test.ts test/unit/server/routes/index.test.ts test/unit/server/services/chat-service.test.ts test/unit/server/services/generation-progress.test.ts test/unit/llm/chat/chat-pipeline.test.ts test/unit/config/generation-stage-metadata.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
