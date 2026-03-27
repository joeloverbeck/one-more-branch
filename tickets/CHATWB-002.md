# CHATWB-002: Add worldbuilding dropdown to chat creation UI and persist on session

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: Yes — ChatSession model, chat-service, chat route, chat-new UI
**Deps**: None (independent of CHATWB-001)

## Problem

The chat creation page (`/chat/new`) collects two character IDs and physical/lead-in context, but does not ask the user to select a worldbuilding file. Since characters are decomposed using worldbuilding context, the worldbuilding that was used for decomposition should also be available to the chat pipeline. This ticket adds the worldbuilding dropdown, validates the selection, and persists the `worldbuildingId` on the `ChatSession`.

## Assumption Reassessment (2026-03-27)

1. `GET /worldbuilding/api/list` endpoint exists at `src/server/routes/worldbuilding.ts:76-82` — returns `{ success: true, worldbuildings: SavedWorldbuilding[] }` — confirmed.
2. `21-chat-new-controller.js` already fetches `GET /characters/api/list` to populate character dropdowns dynamically — confirmed at `public/js/src/21-chat-new-controller.js`.
3. `ChatSession` interface at `src/models/chat/chat-session.ts:61-76` does NOT have a `worldbuildingId` field — confirmed, needs addition.
4. `CreateChatParams` at `src/server/services/chat-service.ts:24-29` does NOT have a `worldbuildingId` field — confirmed, needs addition.
5. `ChatCreateBody` at `src/server/routes/chat.ts:25-39` does NOT have a `worldbuildingId` field — confirmed, needs addition.
6. `loadWorldbuildingById` exists in `src/services/worldbuilding-service.ts:138-140` — confirmed.
7. Chat session serialization is handled by `src/persistence/chat-repository.ts` — needs to serialize/deserialize the new `worldbuildingId` field.
8. `chat-new.ejs` template at `src/server/views/pages/chat-new.ejs` — confirmed, needs new dropdown.

## Architecture Check

1. Follows the client-side dynamic loading pattern already established by the character dropdowns on the same page and the worldbuilding dropdown on the character-webs page. Consistent UI patterns reduce cognitive load.
2. Stores only `worldbuildingId` on `ChatSession` (not the full `DecomposedWorld`), matching how characters are stored by ID and loaded on demand. This keeps session JSON small.
3. No backwards-compatibility aliasing/shims introduced. Existing chat sessions without `worldbuildingId` will need a migration strategy (out of scope — see below).

## What to Change

### 1. ChatSession model — add `worldbuildingId`

In `src/models/chat/chat-session.ts`, add `readonly worldbuildingId: string` to `ChatSession` interface.

### 2. Chat creation route — parse `worldbuildingId`

In `src/server/routes/chat.ts`:
- Add `worldbuildingId?: unknown` to `ChatCreateBody`
- Parse it with `parseRequiredString('worldbuildingId', body.worldbuildingId)` in `parseChatCreateBody()`
- Pass it to `chatService.createChat()`

### 3. Chat service — validate and persist worldbuilding

In `src/server/services/chat-service.ts`:
- Add `worldbuildingId: string` to `CreateChatParams`
- In `createChat()`, call `loadWorldbuildingById(worldbuildingId)` and validate it exists and has `decomposedWorld !== null`
- Store `worldbuildingId` on the created `ChatSession`
- Add `loadWorldbuildingById` to `ChatServiceDeps` for testability

### 4. Chat creation template — worldbuilding dropdown

In `src/server/views/pages/chat-new.ejs`, add a `<select>` dropdown with:
- `id="chatWorldbuildingId"` and `name="worldbuildingId"`
- Required attribute
- Empty placeholder option: "Select worldbuilding..."
- Positioned before the physical context section (alongside character selection)

### 5. Chat creation controller — fetch and populate

In `public/js/src/21-chat-new-controller.js`:
- Add a fetch to `GET /worldbuilding/api/list` alongside the existing character list fetch
- Populate the worldbuilding dropdown with `id`/`name` options
- Validate worldbuilding is selected before form submission

### 6. Regenerate app.js

Run `node scripts/concat-client-js.js` after editing the controller.

### 7. Chat persistence — serialize new field

In `src/persistence/chat-repository.ts` (or wherever chat serialization lives), ensure `worldbuildingId` is included in serialization/deserialization of `ChatSession`.

## Files to Touch

- `src/models/chat/chat-session.ts` (modify) — add `worldbuildingId` to `ChatSession`
- `src/server/routes/chat.ts` (modify) — parse `worldbuildingId` from body
- `src/server/services/chat-service.ts` (modify) — validate worldbuilding exists, store ID
- `src/server/views/pages/chat-new.ejs` (modify) — add dropdown
- `public/js/src/21-chat-new-controller.js` (modify) — fetch + populate + validate
- `public/js/app.js` (regenerate) — via concat script
- `src/persistence/chat-repository.ts` (modify, if serialization logic exists there)

## Out of Scope

- Migration of existing chat sessions created without `worldbuildingId` (future concern)
- Threading `decomposedWorld` into the LLM pipeline (CHATWB-003)
- Using worldbuilding in any prompt (CHATWB-003)

## Acceptance Criteria

### Tests That Must Pass

1. Chat creation with valid `worldbuildingId` succeeds and persists it on session
2. Chat creation without `worldbuildingId` returns 400 validation error
3. Chat creation with nonexistent `worldbuildingId` returns 404 error
4. Chat creation with worldbuilding that has `decomposedWorld === null` returns 400 error
5. Loaded chat session includes `worldbuildingId` field
6. Existing suite: `npm test`

### Invariants

1. `worldbuildingId` is a required field on `ChatSession` for newly created sessions
2. Character selection and physical context validation remain unchanged
3. The worldbuilding file is NOT stored on the session — only the ID reference

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — test `createChat` with valid/missing/invalid worldbuildingId
2. `test/unit/server/routes/chat.test.ts` — test route validation for worldbuildingId parameter (if route-level tests exist)
3. `test/unit/models/chat/chat-session.test.ts` — test session serialization includes worldbuildingId (if serialization tests exist)

### Commands

1. `npx jest test/unit/server/services/chat-service.test.ts`
2. `npm run lint && npm run typecheck && npm test`
