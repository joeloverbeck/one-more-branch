# CHABIBSTASPL-002: Create JSON schemas for ChatSceneContext and ChatCharacterContext

**Status**: COMPLETED
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
6. `ChatSceneContext` and `ChatCharacterContext` model types already exist in `src/models/chat/` — **confirmed**.
7. Runtime validators `isChatSceneContext()` and `isChatCharacterContext()` already exist in `src/models/chat/chat-validation.ts` and are already covered by unit tests — **confirmed**.
8. `assembleChatBible(scene, character)` already exists in `src/models/chat/chat-bible.ts` and is already covered by unit tests — **confirmed**.
9. The current pipeline, prompt builders, and generation functions still use the single `chatBible` stage — **confirmed**. This ticket should not preemptively rewire them.

## Architecture Check

1. Two smaller strict schemas remain a better long-term architecture than continuing to expand one large `CHAT_BIBLE_SCHEMA`. They preserve grammar enforcement while reducing Anthropic grammar compilation risk.
2. This ticket should stay focused on the schema layer. Reworking prompts, generation, registry entries, or pipeline orchestration here would couple concerns and make the split harder to validate incrementally.
3. No backwards-compatibility aliasing. The old `CHAT_BIBLE_SCHEMA` remains unchanged until the later rewiring ticket replaces it end-to-end.
4. The cleanest implementation is to reuse the existing chat model types and enum/value sources directly. Do not duplicate model-layer validation or introduce parallel compatibility types.

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

### 4. Test the schema layer only

- Add focused schema tests for strictness, required top-level shape, nullable handling, parser happy path, and parser rejection.
- Reuse existing model-validator coverage instead of duplicating it in schema tests.

## Files to Touch

- `src/llm/schemas/chat-scene-context-schema.ts` (new)
- `src/llm/schemas/chat-character-context-schema.ts` (new)
- `src/llm/schemas/chat-context-schema-helpers.ts` (new, small shared helpers to avoid duplicate schema fragments)
- `test/unit/llm/schemas/chat-scene-context-schema.test.ts` (new)
- `test/unit/llm/schemas/chat-character-context-schema.test.ts` (new)
- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` (update schema inventory coverage)
- `src/llm/schemas/index.ts` (optional export only if needed for consistency)

## Out of Scope

- Deleting `chat-bible-schema.ts` (happens in CHABIBSTASPL-005)
- Prompt builders (CHABIBSTASPL-003)
- Generation functions (CHABIBSTASPL-004)
- Pipeline rewiring (CHABIBSTASPL-005)
- Stage registry changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Modifying model-layer types or validators that already exist and pass
- Broad prompt-doc changes
- Rewriting unrelated files for stylistic consistency alone

## Acceptance Criteria

### Tests That Must Pass

1. `CHAT_SCENE_CONTEXT_SCHEMA` has `strict: true` in its `json_schema` field.
2. `CHAT_CHARACTER_CONTEXT_SCHEMA` has `strict: true` in its `json_schema` field.
3. `parseChatSceneContextResponse` correctly transforms a valid raw response into a `ChatSceneContext` that passes `isChatSceneContext()`.
4. `parseChatCharacterContextResponse` correctly transforms a valid raw response into a `ChatCharacterContext` that passes `isChatCharacterContext()`.
5. Both parsers reject malformed input (missing required fields, wrong types).
6. Relevant schema tests pass.
7. `npm run typecheck`, `npm run lint`, and `npm test` pass.

### Invariants

1. `CHAT_BIBLE_SCHEMA` is unchanged (still exists, still exported, still used by current pipeline until CHABIBSTASPL-005).
2. Each new schema has <=30 leaf properties.
3. Nullable fields use `anyOf: [{type:'string'}, {type:'null'}]` pattern (Anthropic compatibility).
4. Existing `ChatSceneContext` / `ChatCharacterContext` model contracts remain the source of truth for parser output.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/schemas/chat-scene-context-schema.test.ts` — Schema structure validation, parser happy path, parser rejection of invalid input
2. `test/unit/llm/schemas/chat-character-context-schema.test.ts` — Schema structure validation, parser happy path, parser rejection of invalid input

### Commands

1. `npm test -- --testPathPatterns="test/unit/llm/schemas/chat-(scene|character)-context-schema"`
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`

### Full-Suite Coupling

- `test/unit/llm/schemas/anthropic-schema-compatibility.test.ts` enumerates all static `JsonSchema` exports under `src/llm/schemas/`.
- Adding new schema modules requires updating that coverage list so the repository-level schema compatibility audit continues to cover every static schema.

## Outcome

- Completed: 2026-03-27
- Added `CHAT_SCENE_CONTEXT_SCHEMA` and `CHAT_CHARACTER_CONTEXT_SCHEMA` with strict structured-output definitions and parser functions backed by the existing model validators.
- Added focused schema tests for strictness, nullable handling, parser happy paths, parser rejection, and grammar leaf-property budget checks.
- Updated the repository-wide Anthropic schema compatibility audit so the new static schema exports remain covered by the full-suite invariant.
- Deviation from original plan: the ticket initially assumed split model types, validators, and assembly logic still needed implementation, but those pieces already existed. The actual implementation was therefore intentionally narrower and cleaner: schema-layer work only, with no prompt, generation, pipeline, or registry rewiring.
- Verification: `npm test -- --testPathPatterns="test/unit/llm/schemas/chat-(scene|character)-context-schema"`, `npm run typecheck`, `npm run lint`, and `npm test` all passed.
