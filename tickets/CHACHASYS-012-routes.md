# CHACHASYS-012: Chat Routes and Route Registration

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-011 (chat service)

## Problem

The chat feature needs Express routes for listing chats, creating new chats, viewing conversations, sending turns, deleting chats, and polling turn generation progress. Routes must be registered in the central router.

## Assumption Reassessment (2026-03-27)

1. `src/server/routes/index.ts` imports and mounts all route modules — need to add chat routes.
2. Existing route patterns use `wrapAsyncRoute` for async handler safety.
3. Progress polling follows the `GenerationProgressService` pattern from story generation.
4. API key comes from request body/header (session storage on client, passed per request).

## Architecture Check

1. Follow existing route patterns (`src/server/routes/play.ts`, `src/server/routes/stories.ts`).
2. Routes are thin — delegate to chat service for business logic.
3. Progress tracking for turn generation uses in-memory progress service (same pattern as story generation).

## What to Change

### 1. Create `src/server/routes/chat.ts`

Implement routes:

**`GET /chat`** → Render chat-list.ejs
- Call `chatService.listChats()`
- Render with `{ chats }` data

**`GET /chat/new`** → Render chat-new.ejs
- No data needed (character list fetched client-side from `/characters/api/list`)

**`POST /chat`** → Create new chat
- Extract `targetCharacterId`, `interlocutorCharacterId`, `physicalContext`, `leadInContext` from body
- Call `chatService.createChat(params)`
- Redirect to `/chat/${session.id}`

**`GET /chat/:chatId`** → Render chat.ejs
- Call `chatService.resumeChat(chatId)`
- Render with `{ session, turns }` data

**`POST /chat/:chatId/turn`** → Send user message (JSON API)
- Extract `message` and `apiKey` from body
- Validate: message not empty, max 2000 chars
- Start progress tracking
- Call `chatService.sendTurn(chatId, message, apiKey)`
- Return JSON: `{ characterTurn, updatedSession, progressId }`

**`DELETE /chat/:chatId`** → Delete chat
- Call `chatService.deleteChat(chatId)`
- Redirect to `/chat`

**`GET /chat/:chatId/progress/:progressId`** → Progress polling
- Return current generation stage progress

### 2. Modify `src/server/routes/index.ts`

- Import `chatRoutes` from `'./chat'`
- Mount: `router.use('/chat', chatRoutes)`

## Files to Touch

- `src/server/routes/chat.ts` (new)
- `src/server/routes/index.ts` (modify — add import and mount)

## Out of Scope

- EJS templates (CHACHASYS-013)
- Client-side JS (CHACHASYS-014)
- Chat service implementation (CHACHASYS-011)
- Header modification (CHACHASYS-015)
- Progress service implementation details (reuse existing pattern)

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: `GET /chat` calls listChats and renders chat-list template
2. Unit test: `GET /chat/new` renders chat-new template
3. Unit test: `POST /chat` calls createChat and redirects to chat page
4. Unit test: `GET /chat/:chatId` calls resumeChat and renders chat template
5. Unit test: `POST /chat/:chatId/turn` validates message length (rejects >2000 chars)
6. Unit test: `POST /chat/:chatId/turn` validates message not empty
7. Unit test: `POST /chat/:chatId/turn` returns JSON with characterTurn and updatedSession
8. Unit test: `DELETE /chat/:chatId` calls deleteChat and redirects
9. Unit test: all async routes use `wrapAsyncRoute`
10. Existing suite: `npm test` passes

### Invariants

1. All async handlers wrapped with `wrapAsyncRoute` (no unhandled promise rejections)
2. API key never logged or persisted by routes
3. Route registration does not break existing routes
4. JSON responses use consistent format
5. Error responses use standard error handler middleware

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/chat.test.ts` — route handler tests with mocked service
2. Verify `npm run test:integration` still passes (no route registration conflicts)

### Commands

1. `npm run test:unit -- --testPathPattern='routes/chat'`
2. `npm run typecheck`
3. `npm test`
