# CHABIBSTASPL-002: Create JSON schemas for ChatSceneContext and ChatCharacterContext

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: CHABIBSTASPL-001 (types must exist first)

## Problem

The two new LLM stages each need a JSON schema with `strict: true` for structured output. The current `CHAT_BIBLE_SCHEMA` has ~45 properties and exceeds Anthropic's grammar compilation limit. Each new schema must stay under ~30 properties.

## Assumption Reassessment (2026-03-27)

1. `CHAT_BIBLE_SCHEMA` lives in `src/llm/schemas/chat-bible-schema.ts` with `strict: true` — **confirmed**.
2. Schema uses `anyOf` pattern for nullable fields (e.g., `rollingSummary`, `lastTurnPressure`) — **confirmed**.
3. Enum values for `timeOfDay`, `privacy`, `distanceBand`, `willingnessToEngage` are defined as constants in the schema file — **confirmed**.
4. Schema test lives at `test/unit/llm/schemas/chat-bible-schema.test.ts` — **confirmed**.
5. `parseChatBibleResponse()` transformer exists in or near the schema file — **confirmed** (it's in the schema file).

## Architecture Check

1. Two smaller schemas (~18 and ~27 properties) each stay well under the ~30-property safe limit. This is cleaner than a single lenient schema because `strict: true` provides grammar enforcement guarantees.
2. No backwards-compatibility aliasing. The old `CHAT_BIBLE_SCHEMA` will be deleted in CHABIBSTASPL-005 after the pipeline is rewired; this ticket only adds new schemas.

## What to Change

### 1. Create `CHAT_SCENE_CONTEXT_SCHEMA`

New file `src/llm/schemas/chat-scene-context-schema.ts`:
- ~18 properties across 4 top-level objects: `sessionPremise`, `physicalReality`, `preChatMomentum`, `conversationNow`
- `strict: true`
- Nullable fields: `rollingSummary` (string | null), `lastTurnPressure` (string | null) — use `anyOf` pattern
- Enum values: `timeOfDay`, `privacy`, `distanceBand` — reuse existing constant arrays
- Export `CHAT_SCENE_CONTEXT_SCHEMA` and `parseChatSceneContextResponse(raw: unknown): ChatSceneContext`

### 2. Create `CHAT_CHARACTER_CONTEXT_SCHEMA`

New file `src/llm/schemas/chat-character-context-schema.ts`:
- ~27 properties across 5 top-level objects/arrays: `characterNow`, `relationshipNow`, `knowledgeNow`, `continuityGuardrails`, `responseConstraints`
- `strict: true`
- No nullable fields
- Enum values: `willingnessToEngage` — reuse existing constant array
- `valence` and `tension` as `number` type (matching existing schema)
- Export `CHAT_CHARACTER_CONTEXT_SCHEMA` and `parseChatCharacterContextResponse(raw: unknown): ChatCharacterContext`

### 3. Property count verification

Verify at schema-creation time:
- Scene schema: `sessionPremise`(1) + `physicalReality`(8) + `preChatMomentum`(5) + `conversationNow`(5) = **19 leaf properties** — safe
- Character schema: `characterNow`(6) + `relationshipNow`(5) + `knowledgeNow`(6) + `continuityGuardrails`(1) + `responseConstraints`(1) = **19 leaf properties** — safe (spec said ~27 counting nested objects, but leaf count is what matters for grammar size)

## Files to Touch

- `src/llm/schemas/chat-scene-context-schema.ts` (new)
- `src/llm/schemas/chat-character-context-schema.ts` (new)

## Out of Scope

- Deleting `chat-bible-schema.ts` (happens in CHABIBSTASPL-005)
- Prompt builders (CHABIBSTASPL-003)
- Generation functions (CHABIBSTASPL-004)
- Pipeline rewiring (CHABIBSTASPL-005)
- Stage registry changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Modifying any existing schema files

## Acceptance Criteria

### Tests That Must Pass

1. `CHAT_SCENE_CONTEXT_SCHEMA` has `strict: true` in its `json_schema` field.
2. `CHAT_CHARACTER_CONTEXT_SCHEMA` has `strict: true` in its `json_schema` field.
3. `parseChatSceneContextResponse` correctly transforms a valid raw response into a `ChatSceneContext` that passes `isChatSceneContext()`.
4. `parseChatCharacterContextResponse` correctly transforms a valid raw response into a `ChatCharacterContext` that passes `isChatCharacterContext()`.
5. Both parsers reject malformed input (missing required fields, wrong types).
6. Existing suite: `npm test` passes. `npm run typecheck` passes.

### Invariants

1. `CHAT_BIBLE_SCHEMA` is unchanged (still exists, still exported, still used by current pipeline until CHABIBSTASPL-005).
2. Each new schema has <=30 leaf properties.
3. Nullable fields use `anyOf: [{type:'string'}, {type:'null'}]` pattern (Anthropic compatibility).

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-scene-context-schema.test.ts` — Schema structure validation, parser happy path, parser rejection of invalid input
2. `test/unit/llm/schemas/chat-character-context-schema.test.ts` — Schema structure validation, parser happy path, parser rejection of invalid input

### Commands

1. `npm test -- --testPathPattern="test/unit/llm/schemas/chat-(scene|character)-context-schema"`
2. `npm run typecheck && npm run lint && npm test`
