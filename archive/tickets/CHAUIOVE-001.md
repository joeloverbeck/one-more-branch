# CHAUIOVE-001: Server-side data exposure for chat UI

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (foundation ticket — others depend on this)

## Problem

The `GET /chat/:chatId` route handler passes only `session` and `turns` to the EJS template. The chat UI overhaul needs an explicit bootstrap payload for `chatBible`, `knowledgeState`, and historical valence/tension data for sparklines. The raw session and turn data already contain the necessary source fields, but the page does not expose a stable, purpose-built UI payload for them yet.

## Assumption Reassessment (2026-03-28)

1. `chatService.resumeChat(chatId)` returns `{ session, turns }` and the route currently renders only `{ title, session, turns }` — confirmed in `src/server/routes/chat.ts`.
2. `session.chatBible` and `session.knowledgeState` are already part of the persisted `ChatSession` model — confirmed in `src/models/chat/chat-session.ts`.
3. `turns[].stateUpdate.relationshipShifts` stores per-turn deltas, not absolute history snapshots — confirmed in `src/models/chat/chat-state-update.ts` and `src/llm/chat/chat-state-applier.ts`.
4. `POST /chat/:chatId/turn` already returns the canonical updated state through `updatedSession`; adding `updatedChatBible` would duplicate `updatedSession.chatBible` and weaken the architecture — confirmed in `src/server/routes/chat.ts` and `src/llm/chat/chat-pipeline.ts`.
5. The current chat page template does not expose any JSON bootstrap node for client-side chat UI state, unlike the play page patterns already used elsewhere — confirmed in `src/server/views/pages/chat.ejs` and `src/server/views/pages/play.ejs`.

## Architecture Check

1. Keep a single source of truth for refreshed state: `updatedSession` on POST, not alias fields like `updatedChatBible`.
2. Add one route-level derived view model for relationship sparkline history rather than making the client reconstruct server-domain rules ad hoc.
3. Expose one page bootstrap JSON payload for later chat UI tickets instead of scattering many `data-` attributes across markup.
4. Existing `session` and `turns` template variables stay intact; the new payload is additive.

## What to Change

### 1. Route handler: `GET /chat/:chatId`

Compute relationship history by replaying turn deltas cumulatively from the chat session baseline:
```typescript
const relationshipHistory = [
  { turnNumber: 0, valence: 0, tension: 0, dynamic: '' },
  // ...one entry per character turn with state updates applied cumulatively
];
```

Pass a dedicated bootstrap payload alongside the existing template variables:
```typescript
const chatUiBootstrap = {
  chatBible: session.chatBible,
  knowledgeState: session.knowledgeState,
  relationshipHistory,
};

res.render('pages/chat', {
  title: ...,
  session,
  turns,
  chatUiBootstrap,
});
```

### 2. Route handler: `POST /chat/:chatId/turn`

Do not add alias fields such as `updatedChatBible`. The canonical refreshed state already lives on `updatedSession.chatBible`.

No route response expansion is required for this ticket unless implementation reveals a genuine missing invariant. The future client can derive the next sparkline point from `characterTurn.stateUpdate` and `updatedSession`.

### 3. EJS template data attributes

Add a `<script type="application/json">` bootstrap node that makes `chatBible`, `knowledgeState`, and `relationshipHistory` available to client JS. Do not spread this across many `data-` attributes.

## Files to Touch

- `src/server/routes/chat.ts` (modify) — build relationship history and expose bootstrap payload
- `src/server/views/pages/chat.ejs` (modify) — add bootstrap JSON script block for new data
- `src/models/chat/chat-relationship-history.ts` (new) — shared relationship accumulation/history helper
- `src/llm/chat/chat-state-applier.ts` (modify) — reuse the shared relationship accumulation helper
- `src/models/chat/index.ts` (modify) — export the shared helper
- `test/unit/server/routes/chat.test.ts` (modify) — verify new template variables are passed
- `test/unit/server/views/chat.test.ts` (modify) — verify template renders with new data
- `test/unit/models/chat/chat-relationship-history.test.ts` (new) — verify relationship clamping/history invariants

## Out of Scope

- Client-side rendering of chatBible, knowledgeState, or sparklines (CHAUIOVE-005 through CHAUIOVE-009)
- Layout changes to the chat page (CHAUIOVE-002)
- Any LLM prompt or engine changes
- Any chat service logic changes
- The `POST /` (create chat) or `DELETE /:chatId` routes
- Any duplicate POST response fields that mirror `updatedSession`

## Acceptance Criteria

### Tests That Must Pass

1. `GET /chat/:chatId` renders the existing template variables plus a `chatUiBootstrap` payload with `chatBible`, `knowledgeState`, and `relationshipHistory`
2. `GET /chat/:chatId` renders a bootstrap JSON payload containing `chatBible`, `knowledgeState`, and `relationshipHistory`
3. Relationship history correctly accumulates valence/tension deltas from turn history instead of treating `relationshipShifts` as absolute values
4. `POST /chat/:chatId/turn` continues to expose refreshed state only through `updatedSession`
5. Existing chat route and view tests continue to pass

### Invariants

1. Existing template variables (`session`, `turns`, `title`) remain unchanged
2. No duplicate response aliases for state already contained in `updatedSession`
3. No chat service logic changes — this is purely a route/view concern
4. Relationship history is a UI-facing derived view model, not a persisted domain field

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/chat.test.ts` — add test: GET handler passes `chatUiBootstrap` with chat bible, knowledge state, and relationship history
2. `test/unit/server/routes/chat.test.ts` — add test: relationship history is cumulative and ignores turns without state updates
3. `test/unit/server/routes/chat.test.ts` — keep POST response expectations anchored on `updatedSession`, not alias fields
4. `test/unit/server/views/chat.test.ts` — add test: template renders bootstrap JSON node and tolerates `chatBible: null`

### Commands

1. `npm run test:unit -- --testPathPatterns="chat" --coverage=false` — targeted chat/model tests
2. `npm run typecheck` — verify type correctness
3. `npm run lint` — verify no lint regressions

## Outcome

- Completed on 2026-03-28.
- Implemented a single `chatUiBootstrap` JSON payload on the chat page containing `chatBible`, `knowledgeState`, and cumulative `relationshipHistory`.
- Added a shared chat-domain helper so route-side history derivation and session-side relationship updates follow the same clamping and dynamic-update rules.
- Kept the POST `/chat/:chatId/turn` response architecture unchanged: refreshed state remains canonical on `updatedSession`; no duplicate `updatedChatBible` alias was introduced.
- Deviated from the original plan by rejecting POST response expansion and by introducing a small shared helper instead of duplicating relationship math in the route.
- Verified with `npm run test:unit -- --testPathPatterns="chat" --coverage=false`, `npm run typecheck`, and `npm run lint`.
