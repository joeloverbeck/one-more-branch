# CHACHASYS-018: Typed Chat Domain Errors

**Status**: PENDING
**Priority**: MEDIUM
**Effort**: Small
**Engine Changes**: None
**Deps**: `archive/tickets/CHACHASYS-011-chat-service.md`, `archive/tickets/CHACHASYS-012-routes.completed.md`

## Problem

The chat route layer currently maps several failures by inspecting error message text. That makes the architecture brittle: repository/service/pipeline wording can accidentally change HTTP semantics, and future chat work would be forced to preserve message strings as hidden API contracts. The chat stack needs a typed domain-error contract so routes can map status codes from stable codes instead of parsing prose.

## Assumption Reassessment (2026-03-27)

1. The live chat stack currently throws plain `Error` instances from multiple layers:
   - `src/server/services/chat-service.ts`
   - `src/persistence/chat-repository.ts`
   - `src/llm/chat/chat-pipeline.ts`
   - `src/models/chat/chat-validation.ts`
2. `src/server/routes/chat.ts` currently uses `resolveStatusCode(error)` with `error.message.includes(...)` checks. That is the exact architectural weakness left after CHACHASYS-012.
3. The remaining active chat tickets do not own this concern:
   - `tickets/CHACHASYS-013-ejs-views.md` is template-only.
   - `tickets/CHACHASYS-014-client-js.md` is client/controller-only.
   - `tickets/CHACHASYS-015-header-and-prompt-docs.md` is header/docs-only.
4. Existing repository patterns already justify typed error contracts for cross-layer orchestration:
   - `src/engine/types.ts` defines `EngineError` with stable codes.
   - archived reconciler work introduced typed reconciler errors rather than message parsing.
5. `docs/FOUNDATIONS.md` was requested as the architectural reference, but no such file currently exists in this repository. Until that document exists, this ticket should align with the active contracts in `tickets/README.md` and `CLAUDE.md`: strict typing, thin routes, no compatibility shims, and explicit cross-layer contracts.

## Architecture Check

1. A dedicated chat-domain error type is cleaner than message inspection because it separates human-readable text from control flow. Routes should branch on error codes, not on fragments like `"not found"` or `"is required"`.
2. The right ownership boundary is the chat domain itself, not the route layer. Persistence, service, validation, and chat pipeline code should all be able to throw the same typed error contract.
3. Request-shape validation can still remain local to the route where appropriate, but once an error crosses a boundary between chat layers, it should be typed.
4. No backwards-compatibility aliases or dual paths are needed. Existing generic `Error` throws in chat code should be replaced directly where they represent domain failures.

## What to Change

### 1. Add a canonical chat-domain error contract

Create a new chat-domain error module, preferably under the chat model/domain surface so it can be imported by repository, service, pipeline, and routes without layering confusion.

Recommended shape:

```ts
export type ChatDomainErrorCode =
  | 'VALIDATION_FAILED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'INVALID_PERSISTED_DATA'
  | 'INVARIANT_VIOLATION';

export class ChatDomainError extends Error {
  constructor(
    message: string,
    public readonly code: ChatDomainErrorCode
  ) {
    super(message);
    this.name = 'ChatDomainError';
  }
}
```

Also export small helpers or type guards if they reduce repetition in routes/tests.

### 2. Replace plain chat-domain `Error` throws with typed errors

Update the chat layers that currently express domain failures as plain strings:

- `src/server/services/chat-service.ts`
  - same-character validation
  - missing target/interlocutor
  - missing chat
  - empty/parsed-empty user message
- `src/persistence/chat-repository.ts`
  - missing chat on update
  - chat ID mismatch on update
- `src/llm/chat/chat-pipeline.ts`
  - invalid latest user turn invariant
- `src/models/chat/chat-validation.ts`
  - malformed persisted session/turn payloads

Guidance:
- Use `VALIDATION_FAILED` for caller-fixable input/domain validation problems.
- Use `RESOURCE_NOT_FOUND` for missing chat/character/session resources.
- Use `RESOURCE_CONFLICT` for update-ID mismatches or similar state conflicts.
- Use `INVALID_PERSISTED_DATA` for corrupt on-disk payloads.
- Use `INVARIANT_VIOLATION` for impossible internal pipeline-state violations.

### 3. Refactor `src/server/routes/chat.ts` to map by typed error code

Remove message-fragment routing logic. Replace it with explicit code-to-status mapping for `ChatDomainError`:

- `VALIDATION_FAILED` -> `400`
- `RESOURCE_NOT_FOUND` -> `404`
- `RESOURCE_CONFLICT` -> `409`
- `INVALID_PERSISTED_DATA` -> `500`
- `INVARIANT_VIOLATION` -> `500`

Requirements:
- Keep `LLMError` handling unchanged.
- Keep page-render vs JSON-response separation unchanged.
- Do not broaden this into a generic app-wide error framework ticket; keep the change scoped to chat.

### 4. Strengthen tests around the new contract

Add focused tests that prove routes depend on error codes rather than message wording.

Examples:
- a route test where a `ChatDomainError('custom prose', 'RESOURCE_NOT_FOUND')` still maps to 404
- a route test where a `ChatDomainError('custom prose', 'RESOURCE_CONFLICT')` maps to 409
- repository/service tests that assert the specific typed error class/code
- validation tests that assert malformed persisted chat payloads surface `INVALID_PERSISTED_DATA`

## Files to Touch

- `tickets/CHACHASYS-018-typed-chat-domain-errors.md` (new)
- `src/models/chat/chat-errors.ts` (new, recommended)
- `src/models/chat/index.ts` (modify)
- `src/server/services/chat-service.ts` (modify)
- `src/persistence/chat-repository.ts` (modify)
- `src/llm/chat/chat-pipeline.ts` (modify)
- `src/models/chat/chat-validation.ts` (modify)
- `src/server/routes/chat.ts` (modify)
- `test/unit/server/routes/chat.test.ts` (modify)
- `test/unit/server/services/chat-service.test.ts` (modify)
- `test/unit/persistence/chat-repository.test.ts` (modify)
- `test/unit/llm/chat/chat-pipeline.test.ts` (modify)
- `test/unit/models/chat/chat-errors.test.ts` (new, recommended)

## Out of Scope

- Reworking non-chat routes that also still use message inspection
- A repository-wide shared error base class refactor
- Any EJS, client JS, header, or prompt-doc work
- Changing the external route surface or adding alias endpoints
- Broad persistence redesign

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: chat routes map `ChatDomainError` codes to stable HTTP status codes without inspecting message text
2. Unit test: chat service throws typed domain errors for same-character, missing-resource, and empty-input failures
3. Unit test: chat repository throws typed errors for missing chat update, ID mismatch, and invalid persisted payloads
4. Unit test: chat pipeline throws a typed invariant error when `latestUserTurn` is not a user turn
5. Existing chat-related suites still pass
6. Existing suite: `npm run typecheck`
7. Existing suite: `npm run lint`
8. Existing suite: `npm test`

### Invariants

1. Route status mapping must depend on stable error codes, not message substrings
2. Human-readable error messages may change without silently changing HTTP behavior
3. `LLMError` handling remains separate from chat-domain error handling
4. No compatibility shims or duplicate error paths are introduced

## Test Plan

### New/Modified Tests

1. `test/unit/server/routes/chat.test.ts` — proves route mapping is code-based rather than message-based
2. `test/unit/server/services/chat-service.test.ts` — locks in typed domain failures at the service boundary
3. `test/unit/persistence/chat-repository.test.ts` — covers typed persistence and corruption failures
4. `test/unit/llm/chat/chat-pipeline.test.ts` — covers typed invariant failure
5. `test/unit/models/chat/chat-errors.test.ts` — covers the new domain error contract itself

### Commands

1. `npm run test:unit -- --testPathPatterns='chat|chat-repository|engine/types'`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
