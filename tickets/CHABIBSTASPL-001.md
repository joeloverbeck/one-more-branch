# CHABIBSTASPL-001: Define ChatSceneContext and ChatCharacterContext model types

**Status**: PENDING
**Priority**: HIGH
**Effort**: Small
**Engine Changes**: None
**Deps**: None (foundation ticket)

## Problem

The chat bible stage split requires two new TypeScript interfaces (`ChatSceneContext`, `ChatCharacterContext`) and an assembly function to merge them back into the existing `ChatBible` type. Without these types, the new schemas, prompts, and generation functions have no type targets.

## Assumption Reassessment (2026-03-27)

1. `ChatBible` interface lives in `src/models/chat/chat-bible.ts` and is re-exported from `src/models/chat/index.ts` — **confirmed**.
2. `ChatBible` has 9 top-level fields: `sessionPremise`, `physicalReality`, `preChatMomentum`, `characterNow`, `relationshipNow`, `knowledgeNow`, `conversationNow`, `continuityGuardrails`, `responseConstraints` — **confirmed**.
3. `chat-validation.ts` has `isChatBible()` and nested guard functions — **confirmed**.
4. Enum types `TIME_OF_DAY_VALUES`, `PRIVACY_VALUES`, `DISTANCE_BAND_VALUES` already exist in chat models — **confirmed**.
5. `WillingnessToEngage` values (EAGER, OPEN, GUARDED, RESISTANT, HOSTILE) already exist — **confirmed**.
6. No existing `ChatSceneContext` or `ChatCharacterContext` types exist — **confirmed**.

## Architecture Check

1. Splitting into two interfaces with a merge function is cleaner than adding optional fields or union types to the existing `ChatBible`. The `ChatBible` type itself stays identical — downstream consumers are unaffected.
2. No backwards-compatibility aliasing introduced. The new types are purely additive; `assembleChatBible` is a new function, not a shim.

## What to Change

### 1. Create `ChatSceneContext` interface

New file `src/models/chat/chat-scene-context.ts`:
- `sessionPremise: string`
- `physicalReality: ChatPhysicalContext` (reuse existing type)
- `preChatMomentum: ChatBiblePreChatMomentum` (reuse existing type)
- `conversationNow: ChatBibleConversationNow` (reuse existing type)

All fields `readonly`. Import existing sub-types from their current locations.

### 2. Create `ChatCharacterContext` interface

New file `src/models/chat/chat-character-context.ts`:
- `characterNow: ChatBibleCharacterNow` (reuse existing type)
- `relationshipNow: ChatBibleRelationshipNow` (reuse existing type)
- `knowledgeNow: ChatBibleKnowledgeNow` (reuse existing type)
- `continuityGuardrails: readonly string[]`
- `responseConstraints: readonly string[]`

All fields `readonly`. Import existing sub-types from their current locations.

### 3. Add `assembleChatBible` function

In `src/models/chat/chat-bible.ts`, add:

```typescript
function assembleChatBible(
  scene: ChatSceneContext,
  character: ChatCharacterContext
): ChatBible {
  return {
    sessionPremise: scene.sessionPremise,
    physicalReality: scene.physicalReality,
    preChatMomentum: scene.preChatMomentum,
    conversationNow: scene.conversationNow,
    characterNow: character.characterNow,
    relationshipNow: character.relationshipNow,
    knowledgeNow: character.knowledgeNow,
    continuityGuardrails: character.continuityGuardrails,
    responseConstraints: character.responseConstraints,
  };
}
```

### 4. Add type guard validators

In `src/models/chat/chat-validation.ts`, add:
- `isChatSceneContext(value: unknown): value is ChatSceneContext` — reuses existing sub-guards (`isChatPhysicalContext`, etc.)
- `isChatCharacterContext(value: unknown): value is ChatCharacterContext` — reuses existing sub-guards

### 5. Re-export new types

In `src/models/chat/index.ts`, add exports for `ChatSceneContext`, `ChatCharacterContext`, and `assembleChatBible`.

## Files to Touch

- `src/models/chat/chat-scene-context.ts` (new)
- `src/models/chat/chat-character-context.ts` (new)
- `src/models/chat/chat-bible.ts` (modify — add `assembleChatBible`)
- `src/models/chat/chat-validation.ts` (modify — add two guards)
- `src/models/chat/index.ts` (modify — re-export new types)

## Out of Scope

- Schemas (CHABIBSTASPL-002)
- Prompts (CHABIBSTASPL-003)
- Generation functions (CHABIBSTASPL-004)
- Pipeline changes (CHABIBSTASPL-005)
- Stage registry / metadata changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Changes to `formatChatBible()` or any downstream prompt formatters
- Changes to `ChatSession`, `ChatTurn`, or any other existing chat types
- Changes to any existing test files (only new tests)

## Acceptance Criteria

### Tests That Must Pass

1. `assembleChatBible(scene, character)` produces a valid `ChatBible` that passes `isChatBible()`.
2. `isChatSceneContext()` returns `true` for valid scene context objects and `false` for missing/invalid fields.
3. `isChatCharacterContext()` returns `true` for valid character context objects and `false` for missing/invalid fields.
4. `assembleChatBible` result has all 9 top-level `ChatBible` fields with correct values from the two inputs.
5. Existing suite: `npm test` passes with no regressions.
6. Existing suite: `npm run typecheck` passes.

### Invariants

1. `ChatBible` interface is unchanged — no fields added, removed, or retyped.
2. All existing `isChatBible()` tests continue to pass without modification.
3. `ChatSceneContext` + `ChatCharacterContext` fields together cover exactly the same fields as `ChatBible` (no overlap, no gaps).

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-scene-context.test.ts` — `isChatSceneContext` guard with valid/invalid inputs
2. `test/unit/models/chat/chat-character-context.test.ts` — `isChatCharacterContext` guard with valid/invalid inputs
3. `test/unit/models/chat/assemble-chat-bible.test.ts` — `assembleChatBible` correctness and round-trip through `isChatBible`

### Commands

1. `npm test -- --testPathPattern="test/unit/models/chat/(chat-scene-context|chat-character-context|assemble-chat-bible)"`
2. `npm run typecheck && npm run lint && npm test`
