# CHATWB-002: Add worldbuilding dropdown to chat creation UI and persist on session

**Status**: COMPLETED
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
6. `loadWorldbuildingById` exists in `src/services/worldbuilding-service.ts:138-140` — confirmed. The original assumption that it lived under `src/server/services` was incorrect.
7. Chat session persistence already round-trips the whole validated session object through `src/persistence/chat-repository.ts`, but the actual schema gate is `src/models/chat/chat-validation.ts`. The new field must be added to both the `ChatSession` interface and `isChatSession()` validation, otherwise persisted sessions will fail to load.
8. `chat-new.ejs` template at `src/server/views/pages/chat-new.ejs` — confirmed, needs new dropdown.
9. There are already dedicated tests covering the relevant chat surface area:
   - `test/unit/server/services/chat-service.test.ts`
   - `test/unit/server/routes/chat.test.ts`
   - `test/unit/persistence/chat-repository.test.ts`
   - `test/unit/server/views/chat-new.test.ts`
   - `test/unit/client/chat-new-page/controller.test.ts`
   The original ticket understated the real test surface.

## Architecture Check

1. Adding `worldbuildingId` directly to `ChatSession` is architecturally cleaner than trying to infer worldbuilding later from the selected characters. Chat world context is a first-class conversation invariant, not a derivative of character identity, and inference would become brittle once characters are reused across settings or revised independently.
2. Storing only `worldbuildingId` on the session is the right boundary. It keeps the session payload small, avoids duplicating a large decomposed world blob into every chat, and preserves a single source of truth for future chat-pipeline loading.
3. The change should remain explicit and non-aliased: new chats require `worldbuildingId`, and the persisted chat schema should require it too. This repo already treats persisted chat JSON as a strict contract, so silent fallbacks for missing worldbuilding provenance would weaken the architecture.
4. Because persisted chat loading is strict today, this ticket intentionally changes the invariant for chat sessions. Existing sessions that lack `worldbuildingId` will become invalid unless migrated. That is acceptable under the current product direction, but it must be stated clearly instead of implying transparent compatibility.

## What to Change

### 1. ChatSession model — add `worldbuildingId`

In `src/models/chat/chat-session.ts`, add `readonly worldbuildingId: string` to `ChatSession` interface.

In `src/models/chat/chat-validation.ts`, update `isChatSession()` so persisted sessions are only valid when `worldbuildingId` is present and non-empty.

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

Validation rule: reject worldbuildings that do not exist with `RESOURCE_NOT_FOUND`, and reject worldbuildings whose `decomposedWorld` is still `null` with `VALIDATION_FAILED`. The chat system should only bind to canonicalized, decomposed world context.

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

No bespoke repository serializer is needed if the session object includes the new field, but the repository-backed round trip must still be covered by tests because `parseChatSession()` is the enforced persisted-data contract.

## Files to Touch

- `src/models/chat/chat-session.ts` (modify) — add `worldbuildingId` to `ChatSession`
- `src/models/chat/chat-validation.ts` (modify) — require `worldbuildingId` in persisted chat schema
- `src/server/routes/chat.ts` (modify) — parse `worldbuildingId` from body
- `src/server/services/chat-service.ts` (modify) — validate worldbuilding exists, store ID
- `src/server/views/pages/chat-new.ejs` (modify) — add dropdown
- `public/js/src/21-chat-new-controller.js` (modify) — fetch + populate + validate
- `public/js/app.js` (regenerate) — via concat script

## Out of Scope

- Automatic migration or compatibility shims for existing chat sessions created without `worldbuildingId`
- Threading `decomposedWorld` into the LLM pipeline (CHATWB-003)
- Using worldbuilding in any prompt (CHATWB-003)

## Acceptance Criteria

### Tests That Must Pass

1. Chat creation with valid `worldbuildingId` succeeds and persists it on session
2. Chat creation without `worldbuildingId` returns 400 validation error
3. Chat creation with nonexistent `worldbuildingId` returns 404 error
4. Chat creation with worldbuilding that has `decomposedWorld === null` returns 400 error
5. Loaded chat session includes `worldbuildingId` field
6. Chat creation page renders a required worldbuilding selector and the client controller populates it from `/worldbuilding/api/list`
7. Targeted chat/unit/client tests pass, then lint, typecheck, and full test suite pass

### Invariants

1. `worldbuildingId` is a required field on `ChatSession` for newly created sessions
2. Character selection and physical context validation remain unchanged
3. The worldbuilding file is NOT stored on the session — only the ID reference
4. Chat sessions without `worldbuildingId` are considered invalid persisted data after this change; no aliasing or fallback loading path is introduced

## Test Plan

### New/Modified Tests

1. `test/unit/server/services/chat-service.test.ts` — test `createChat` with valid/missing/invalid worldbuildingId
2. `test/unit/server/routes/chat.test.ts` — test route validation for worldbuildingId parameter (if route-level tests exist)
3. `test/unit/persistence/chat-repository.test.ts` — test session round-trip and malformed persisted session handling with required `worldbuildingId`
4. `test/unit/server/views/chat-new.test.ts` — test required worldbuilding field is rendered in the form
5. `test/unit/client/chat-new-page/controller.test.ts` — test worldbuilding list fetch/population and submit-time validation

### Commands

1. `npx jest test/unit/server/services/chat-service.test.ts`
2. `npx jest test/unit/server/routes/chat.test.ts test/unit/persistence/chat-repository.test.ts test/unit/server/views/chat-new.test.ts test/unit/client/chat-new-page/controller.test.ts`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`

## Outcome

- Completed on 2026-03-27.
- Added a required `worldbuildingId` to new `ChatSession` records, enforced it in persisted chat validation, required it at the chat creation route boundary, and validated that chat creation only accepts existing decomposed worldbuilding assets.
- Added the worldbuilding selector to the `/chat/new` form, populated it client-side from `/worldbuilding/api/list`, and regenerated `public/js/app.js`.
- Strengthened the real test surface already present in the repo: chat service, chat route, chat persistence, chat-new server view, chat-new client controller, and chat model contract tests.
- Deviations from the original plan:
  - No bespoke serializer changes were needed in `src/persistence/chat-repository.ts`; the repository already round-trips validated session objects, so the real schema change lived in `src/models/chat/chat-validation.ts`.
  - The ticket was corrected to make the architectural break explicit: persisted chats without `worldbuildingId` are now invalid by design, with no compatibility aliasing or fallback inference path.
- Verification:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
