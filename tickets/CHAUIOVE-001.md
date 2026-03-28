# CHAUIOVE-001: Server-side data exposure for chat UI

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (foundation ticket — others depend on this)

## Problem

The `GET /chat/:chatId` route handler passes only `session` and `turns` to the EJS template. The chat UI overhaul needs `chatBible`, `knowledgeState`, and historical valence/tension data for sparklines. These fields already exist in `state.json` but are not forwarded to the template or included in the POST response when `shouldRefreshChatBible` fires.

## Assumption Reassessment (2026-03-28)

1. `chatService.resumeChat(chatId)` returns `{ session, turns }` — confirmed in `src/server/routes/chat.ts:255`.
2. `session.chatBible` and `session.knowledgeState` exist on the session object in persistence — needs verification against chat models.
3. `turns[].stateUpdate.relationshipShifts` contains per-turn valence/tension deltas — needs verification against turn model.
4. `POST /chat/:chatId/turn` response already spreads `result` which includes `updatedSession` and `characterTurn` — confirmed at line 303.

## Architecture Check

1. Pure data-passing change — no new abstractions. Just forward existing data to the template and compute a small derived array (sparkline tuples).
2. No backwards-compatibility shims. Existing template variables remain unchanged; new variables are additive.

## What to Change

### 1. Route handler: `GET /chat/:chatId`

Compute sparkline history array from turns:
```typescript
const sparklineHistory = turns
  .filter(t => t.stateUpdate?.relationshipShifts)
  .map(t => ({
    turnNumber: t.turnNumber,
    valence: /* extract from stateUpdate */,
    tension: /* extract from stateUpdate */,
  }));
```

Pass additional template variables:
```typescript
res.render('pages/chat', {
  title: ...,
  session,
  turns,
  chatBible: session.chatBible ?? null,
  knowledgeState: session.knowledgeState ?? null,
  sparklineHistory,
});
```

### 2. Route handler: `POST /chat/:chatId/turn`

Ensure the JSON response includes `updatedChatBible` when the chat bible was refreshed during the turn. Also include the new sparkline data point for the latest turn.

### 3. EJS template data attributes

Add `data-` attributes or a `<script>` JSON block to make `chatBible`, `knowledgeState`, and `sparklineHistory` available to client JS (the actual rendering will be done in later tickets).

## Files to Touch

- `src/server/routes/chat.ts` (modify) — pass additional data to template and POST response
- `src/server/views/pages/chat.ejs` (modify) — add data attributes or JSON script block for new data
- `test/unit/server/routes/chat.test.ts` (modify) — verify new template variables are passed
- `test/unit/server/views/chat.test.ts` (modify) — verify template renders with new data

## Out of Scope

- Client-side rendering of chatBible, knowledgeState, or sparklines (CHAUIOVE-005 through CHAUIOVE-009)
- Layout changes to the chat page (CHAUIOVE-002)
- Any LLM prompt or engine changes
- Any chat service logic changes
- The `POST /` (create chat) or `DELETE /:chatId` routes

## Acceptance Criteria

### Tests That Must Pass

1. `GET /chat/:chatId` renders template with `chatBible`, `knowledgeState`, and `sparklineHistory` variables
2. `POST /chat/:chatId/turn` response JSON includes `updatedChatBible` when chat bible was refreshed
3. Sparkline history array correctly extracts valence/tension from turn history
4. Existing suite: `npm test` — all existing chat route and view tests pass

### Invariants

1. Existing template variables (`session`, `turns`, `title`) remain unchanged
2. `POST /chat/:chatId/turn` response shape is backwards-compatible (new fields are additive)
3. No chat service logic changes — this is purely a route/view concern

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/chat.test.ts` — add test: GET handler passes chatBible, knowledgeState, sparklineHistory to render
2. `test/unit/server/routes/chat.test.ts` — add test: sparklineHistory correctly computed from turns with relationship shifts
3. `test/unit/server/views/chat.test.ts` — add test: template renders without error when chatBible/knowledgeState are null

### Commands

1. `npm run test:unit -- --testPathPattern="chat"` — targeted chat tests
2. `npm test` — full suite
3. `npm run typecheck` — verify type correctness
