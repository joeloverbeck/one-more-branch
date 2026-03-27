# CHACHASYS-014: Chat Client-Side JavaScript

**Status**: COMPLETED
**Priority**: MEDIUM
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHACHASYS-013 (EJS templates with DOM structure)

## Problem

The chat UI needs client-side JavaScript for: the chat conversation controller (send messages, render responses, manage loading state), the setup form controller (character dropdowns, validation), and the chat list controller (delete confirmations). These follow the existing numbered source file pattern in `public/js/src/`.

## Assumption Reassessment (2026-03-27)

1. Chat server routes, services, models, persistence, and EJS pages already exist:
   - `src/server/routes/chat.ts`
   - `src/server/services/chat-service.ts`
   - `src/server/views/pages/chat*.ejs`
   - `src/models/chat/*`
2. `public/js/src/` already contains numbered source files through `19-*`, concatenated into `public/js/app.js` by `scripts/concat-client-js.js` in alphabetical order.
3. The existing client architecture is plain browser JS with shared helpers in earlier numbered files, plus page-specific `init*Page()` functions wired from `public/js/src/09-controllers.js`.
4. Shared API-key persistence already exists via `getApiKey()` / `setApiKey()` in `public/js/src/02-utils.js`. The chat conversation page includes an API-key input in the DOM and should sync it with session storage instead of introducing a new storage pattern.
5. Shared progress polling already exists via `createLoadingProgressController()` and `createLoadingOverlaySession()`. Chat should reuse those abstractions rather than implement bespoke polling logic.
6. There is currently no DOM for a live "parsed preview" of user input on the chat page. Adding preview UI would require template changes and is therefore out of scope for this ticket.
7. The current `/chat/:chatId/turn` JSON response returns `characterTurn` and `updatedSession`, but not the canonical parsed `userTurn`. Rendering the just-submitted user turn in the client without duplicating parser logic requires extending that response contract.

## Architecture Check

1. New controllers should use files `20-22` so they load after the existing shared helpers/controllers and preserve the current concatenation model.
2. The cleanest implementation is page-local controllers that:
   - activate only when their page marker exists
   - reuse shared API-key helpers and shared progress polling
   - render against the server-owned DOM contract already present in `chat.ejs`, `chat-new.ejs`, and `chat-list.ejs`
3. `public/js/src/09-controllers.js` must be updated to initialize the new chat controllers on `DOMContentLoaded`; avoiding that change would leave dead code in the bundle.
4. After source changes, regenerate `public/js/app.js` via `node scripts/concat-client-js.js` or `npm run concat:js`.

## Architectural Reassessment

The proposed change is beneficial, but only if it follows the existing client architecture instead of creating a parallel chat-specific one.

1. Beneficial:
   - Chat pages already exist and need progressive enhancement for real usability.
   - Reusing `getApiKey()` / `setApiKey()` centralizes API-key handling.
   - Reusing `createLoadingOverlaySession()` keeps progress UX and fetch orchestration consistent with the rest of the application.
2. Not beneficial:
   - A bespoke progress polling implementation would duplicate existing infrastructure and make stage-display behavior drift across pages.
   - Duplicating the canonical chat-input parser in client JS would create long-term drift between browser rendering and persisted server turns.
   - A raw-input preview feature is not justified by the current DOM contract and would expand scope into template work.
   - Avoiding the shared init registry in `09-controllers.js` would create an inconsistent bootstrap path.
3. Long-term architecture note:
   - The current app-wide bootstrap in `09-controllers.js` is becoming a central registry of page initializers. It is still acceptable for this size of codebase, but if client surface area continues to grow, a future ticket should consider a page-dispatcher layer keyed by data attributes rather than an ever-growing manual init list.

## What to Change

### 1. Create `public/js/src/20-chat-controller.js`

Chat conversation page controller:
- Initialize only on `#chat-page[data-chat-id]`
- Restore API key from session storage into `#chat-api-key` when present
- Submit `#chat-turn-form` to `POST /chat/:chatId/turn` with `message`, `apiKey`, and a shared `progressId`
- Use the existing loading/progress infrastructure instead of manual polling code
- Prevent duplicate sends while a request is in flight
- Support `Enter` to submit and `Shift+Enter` for newline in `#chat-message`
- On success:
  - append the canonical `userTurn` returned by the server, avoiding duplicated client-side parsing logic
  - append the returned `characterTurn`
  - update sidebar fields from `updatedSession`
  - clear the textarea and scroll to the newest turn
- On failure, surface the route error in `#chat-turn-error` / `#chat-error`

### 2. Create `public/js/src/21-chat-new-controller.js`

Chat setup form controller:
- Initialize only on `form[data-chat-new-form]`
- Fetch characters from `/characters/api/list` on load
- Populate target and interlocutor dropdowns
- Validate: two different characters selected
- Validate browser-required fields before submit and show a page-level error for distinct-character violations
- Prevent double-submit

### 3. Create `public/js/src/22-chat-list-controller.js`

Chat list page controller:
- Initialize on pages with `[data-chat-list]` container
- Delete button: confirm dialog before DELETE request
- Handle delete response (remove row or redirect)

### 4. Regenerate `app.js`

Run `node scripts/concat-client-js.js` after creating all source files.

## Files to Touch

- `public/js/src/20-chat-controller.js` (new)
- `public/js/src/21-chat-new-controller.js` (new)
- `public/js/src/22-chat-list-controller.js` (new)
- `public/js/src/09-controllers.js` (register chat page initializers)
- `src/server/services/chat-service.ts` (return canonical `userTurn` with send-turn result)
- `src/server/routes/chat.ts` (expose canonical `userTurn` in turn response)
- `public/js/app.js` (regenerated — never edit directly)

## Out of Scope

- EJS template changes
- Server-side parsing/model refactors unrelated to exposing the canonical `userTurn`
- CSS styling
- Live chat-input preview UI
- Replacing the shared client bootstrap architecture
- Refactoring unrelated existing controllers

## Acceptance Criteria

### Tests That Must Pass

1. Client test: chat controller restores API key from session storage and submits `message`, `apiKey`, and `progressId`
2. Client test: chat controller appends/render ACTION and SPEECH blocks using the existing page contract
3. Client test: chat controller updates sidebar state from `updatedSession`
4. Client test: chat controller prevents duplicate submit and scrolls after appending new turns
5. Client test: setup form loads character options and rejects selecting the same character twice
6. Client test: setup form prevents double-submit while the form is posting
7. Client test: list controller confirms before `DELETE /chat/:chatId` and removes the deleted item from the DOM
8. `npm run test:client` passes against regenerated `public/js/app.js`
9. `npm test` passes
10. `npm run lint` passes

### Invariants

1. `app.js` is never edited directly — only regenerated
2. API key persistence remains centralized in shared session-storage helpers; the chat page may mirror the stored key into its input, but the source of truth stays in session storage
3. Controllers only activate on their respective pages / page markers
4. No global namespace pollution (IIFE pattern)
5. Chat progress polling reuses shared loading/progress helpers rather than bespoke fetch loops
6. All fetch calls include proper error handling
7. The canonical chat-input parser remains server-owned; the client renders returned turns instead of maintaining a duplicate parser

## Test Plan

### New/Modified Tests

1. `test/unit/client/chat-page/controller.test.ts` — chat conversation behavior
2. `test/unit/client/chat-new-page/controller.test.ts` — setup form loading and validation
3. `test/unit/client/chat-list-page/controller.test.ts` — list page deletion behavior
4. `test/unit/client/fixtures/html-fixtures.ts` — add minimal chat DOM builders if useful for reuse

### Commands

1. `node scripts/concat-client-js.js`
2. `npm run test:client`
3. `npm test`
4. `npm run lint`

## Outcome

- Completed: 2026-03-27
- Actual changes:
  - Added chat conversation, chat setup, and chat list client controllers in `public/js/src/20-22`.
  - Registered the new chat controllers in `public/js/src/09-controllers.js`.
  - Regenerated `public/js/app.js`.
  - Expanded `chatService.sendTurn()` to return the canonical persisted `userTurn`, so the browser renders server-owned parsed turns instead of duplicating parser logic.
  - Added client controller tests plus server contract tests for the canonical `userTurn` response.
- Deviations from the original plan:
  - Did not add a live input preview because the current templates have no preview DOM and that would have expanded scope into EJS changes.
  - Did not need a dedicated route-file change; the existing route already spread the service result into the JSON response once the service contract was tightened.
  - Touched `public/js/src/09-controllers.js` despite the original out-of-scope note, because the existing bootstrap architecture requires explicit page initializer registration.
- Verification:
  - `node scripts/concat-client-js.js`
  - `npm run test:client`
  - `npm test`
  - `npm run lint`
