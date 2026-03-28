# CHABIBSTASPL-001: Define ChatSceneContext and ChatCharacterContext model types

**Status**: COMPLETED
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
7. The root models barrel (`src/models/index.ts`) re-exports chat contracts via an explicit named export list, not a wildcard export — **confirmed**. New public chat model contracts must be added there too if they are intended to be first-class model exports.
8. The existing chat unit test layout already has central contract coverage in `test/unit/models/chat/chat-models.test.ts` and root-barrel coverage in `test/unit/models/index.test.ts` — **confirmed**. The implementation should extend these tests where appropriate instead of forcing all coverage into new files.

## Architecture Check

1. Splitting into two interfaces with a single assembly function is cleaner than adding optional fields or unions to `ChatBible`. The model boundary stays explicit: stage-specific contracts in, canonical `ChatBible` out.
2. The assembly logic belongs in the model layer, not duplicated in generation or pipeline code. A single `assembleChatBible()` function gives one canonical merge point and keeps downstream stages consuming a stable `ChatBible`.
3. No backwards-compatibility aliasing should be introduced. The new types are additive stage contracts; `ChatBible` remains the canonical composite shape.

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

### 6. Re-export through the root models barrel

In `src/models/index.ts`, add `ChatSceneContext`, `ChatCharacterContext`, and `assembleChatBible` to the explicit chat export lists so the public models barrel remains complete and consistent.

## Files to Touch

- `src/models/chat/chat-scene-context.ts` (new)
- `src/models/chat/chat-character-context.ts` (new)
- `src/models/chat/chat-bible.ts` (modify — add `assembleChatBible`)
- `src/models/chat/chat-validation.ts` (modify — add two guards)
- `src/models/chat/index.ts` (modify — re-export new types)
- `src/models/index.ts` (modify — re-export new public chat model contracts)

## Out of Scope

- Schemas (CHABIBSTASPL-002)
- Prompts (CHABIBSTASPL-003)
- Generation functions (CHABIBSTASPL-004)
- Pipeline changes (CHABIBSTASPL-005)
- Stage registry / metadata changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Changes to `formatChatBible()` or any downstream prompt formatters
- Changes to `ChatSession`, `ChatTurn`, or any other existing chat types
- Broad prompt/pipeline/schema changes from later tickets
- Unnecessary file rewrites where a focused additive change is sufficient

## Acceptance Criteria

### Tests That Must Pass

1. `assembleChatBible(scene, character)` produces a valid `ChatBible` that passes `isChatBible()`.
2. `isChatSceneContext()` returns `true` for valid scene context objects and `false` for missing/invalid fields.
3. `isChatCharacterContext()` returns `true` for valid character context objects and `false` for missing/invalid fields.
4. `assembleChatBible` result has all 9 top-level `ChatBible` fields with correct values from the two inputs.
5. New contracts are re-exported from both `src/models/chat/index.ts` and `src/models/index.ts`.
6. Relevant unit suites pass, followed by `npm run typecheck`, `npm run lint`, and `npm test`.

### Invariants

1. `ChatBible` interface is unchanged — no fields added, removed, or retyped.
2. All existing `isChatBible()` tests continue to pass without modification.
3. `ChatSceneContext` + `ChatCharacterContext` fields together cover exactly the same fields as `ChatBible` (no overlap, no gaps).

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-scene-context.test.ts` — `isChatSceneContext` guard with valid/invalid inputs
2. `test/unit/models/chat/chat-character-context.test.ts` — `isChatCharacterContext` guard with valid/invalid inputs
3. `test/unit/models/chat/chat-models.test.ts` — extend the existing chat contract coverage with representative `ChatSceneContext` / `ChatCharacterContext` fixtures and `assembleChatBible()` assertions
4. `test/unit/models/index.test.ts` — extend root models barrel coverage for the new exports

### Commands

1. `npm test -- --testPathPatterns="test/unit/models/chat/(chat-scene-context|chat-character-context|chat-models)"`
2. `npm test -- --testPathPatterns="test/unit/models/index.test.ts"`
3. `npm run typecheck`
4. `npm run lint`
5. `npm test`

## Outcome

- **Completion date**: 2026-03-27
- **What actually changed**: Added `ChatSceneContext` and `ChatCharacterContext` model contracts, added `assembleChatBible()` in the chat model layer, added `isChatSceneContext()` / `isChatCharacterContext()` validators, and re-exported the new contracts through both `src/models/chat/index.ts` and `src/models/index.ts`.
- **Testing work completed**: Added focused validator tests for both new contracts, extended existing chat contract coverage to exercise assembly into a valid `ChatBible`, and extended root models barrel coverage for the new export surface.
- **Deviation from original plan**: The ticket was corrected first to reflect the actual repository architecture. In particular, the root models barrel required explicit updates, and the test strategy was adjusted to extend existing contract/barrel tests rather than forcing all coverage into new files. During final verification, one unrelated stale integration assertion in `test/integration/server/kernel-routes.test.ts` was updated to match the current LLM route error formatter contract.
- **Verification results**: `npm test -- --testPathPatterns='test/unit/models/chat/(chat-scene-context|chat-character-context|chat-models)'`, `npm test -- --testPathPatterns='test/unit/models/index.test.ts'`, `npm run typecheck`, `npm run lint`, and `npm test` all passed.
