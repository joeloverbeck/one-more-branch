# CHABIBSTASPL-003: Create prompt builders for ChatSceneContext and ChatCharacterContext stages

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHABIBSTASPL-001 (types), CHABIBSTASPL-002 (schemas)

## Problem

The split models and schemas now exist, but the split prompt layer does not. The codebase still relies on a single `buildChatBibleMessages()` builder and a single `generateChatBible()` stage. This ticket should only cover the missing prompt/building layer needed for the scene and character stages, plus any small supporting refactor required to keep prompt code independent from generation wiring.

## Assumption Reassessment (2026-03-28)

1. `buildChatBibleMessages(context: ChatBibleContext): ChatMessage[]` still lives in `src/llm/prompts/chat/chat-bible-prompt.ts` — **confirmed**.
2. The current builder still emits 9 user sections: TARGET CHARACTER, INTERLOCUTOR, WORLDBUILDING, RELATIONSHIP STATE, KNOWLEDGE STATE, PHYSICAL CONTEXT, PRE-CHAT LEAD-IN, OLDER CHAT SUMMARY, RECENT CHAT TURNS — **confirmed**.
3. Rolling-summary formatting does **not** live in `chat-prompt-formatters.ts`; it lives in `src/llm/prompts/chat/chat-memory-prompt-adapter.ts` and is consumed by `chat-bible-prompt.ts` — **corrected**.
4. `ChatBibleContext` is currently defined in `src/llm/chat/chat-bible-generation.ts` and imported by `chat-bible-prompt.ts` and its tests — **confirmed, but this is the wrong dependency direction for new prompt builders**.
5. The split contracts already exist and are no longer ticket scope:
   - `src/models/chat/chat-scene-context.ts`
   - `src/models/chat/chat-character-context.ts`
   - `src/llm/schemas/chat-scene-context-schema.ts`
   - `src/llm/schemas/chat-character-context-schema.ts`
   - `assembleChatBible()` in `src/models/chat/chat-bible.ts`
   - validators/tests for scene and character contexts in `src/models/chat/*` and `test/unit/models/chat/*`
6. There is currently **no** prompt-formatter test file to modify for `formatChatSceneContext`; a new formatter-focused test file will be needed — **corrected**.

## Architecture Check

1. Two focused prompts are still the cleaner architecture. The split already exists at the type/schema level, and matching the prompt layer to that split reduces prompt surface area and improves stage cohesion.
2. Prompt modules should not import shared input types from a generation implementation file. If `ChatBibleContext` remains in `chat-bible-generation.ts`, the new prompt builders would depend on a stage-specific module. That coupling is brittle. Extract the shared context type into a prompt/generation-neutral module and have both prompt builders and generation code import from there.
3. No backwards-compatibility aliasing. Keep the legacy builder only where the not-yet-rewired pipeline still needs it. Do not add aliases between old and new prompt builders.

## What to Change

### 1. Create scene context prompt builder

New file `src/llm/prompts/chat/chat-scene-context-prompt.ts`:

**Export**: `buildChatSceneContextMessages(context: ChatBibleContext): ChatMessage[]`

**System prompt** (focused on scene/continuity):
```
You are establishing the objective scene reality for an in-world one-on-one conversation.
Focus on physical environment, narrative momentum, and conversation state.
Physical context is mandatory and authoritative.
State why this conversation is happening now and what pressures are active.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue. Do not analyze character psychology.
```

**User message sections** (subset of current bible prompt):
1. TARGET CHARACTER DECOMPOSITION (identity context only — name, role, location)
2. INTERLOCUTOR CHARACTER PROFILE (identity context only)
3. WORLDBUILDING
4. PHYSICAL CONTEXT
5. PRE-CHAT LEAD-IN
6. OLDER CHAT SUMMARY
7. RECENT CHAT TURNS

Note: Relationship state and knowledge state are omitted from this stage — they're character-centric.

### 2. Create character context prompt builder

New file `src/llm/prompts/chat/chat-character-context-prompt.ts`:

**Export**: `buildChatCharacterContextMessages(context: ChatBibleContext, sceneContext: ChatSceneContext): ChatMessage[]`

**System prompt** (focused on character psychology):
```
You are synthesizing a character's psychological state for an in-world one-on-one conversation.
You receive the established scene context as ground truth — do not contradict it.
Determine the character's current objective, emotional state, and willingness to engage.
Model the relationship dynamic, knowledge boundaries, and information asymmetries.
Derive continuity guardrails and response constraints from ALL available context.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue.
```

**User message sections**:
1. ESTABLISHED SCENE CONTEXT (formatted `ChatSceneContext` from Stage 1)
2. TARGET CHARACTER DECOMPOSITION (full profile)
3. INTERLOCUTOR CHARACTER PROFILE (full profile)
4. RELATIONSHIP STATE
5. KNOWLEDGE STATE
6. RECENT CHAT TURNS (for recency of character dynamics)

### 3. Extract the shared prompt-generation context type

Create a generation-neutral `ChatBibleContext` module so prompt builders do not import from `chat-bible-generation.ts`.

Expected shape remains:
- `targetCharacter`
- `interlocutorCharacter`
- `decomposedWorld`
- `relationshipState`
- `knowledgeState`
- `physicalContext`
- `leadInContext`
- `rollingSummary`
- `recentTurns`

This is a small architectural cleanup directly in support of the prompt split.

### 4. Scene context formatting helper

Add `formatChatSceneContext(scene: ChatSceneContext): string` to `src/llm/prompts/chat/chat-prompt-formatters.ts` for use by the character prompt.

## Files to Touch

- `src/llm/chat/chat-bible-context.ts` (new, or equivalent neutral location for `ChatBibleContext`)
- `src/llm/prompts/chat/chat-scene-context-prompt.ts` (new)
- `src/llm/prompts/chat/chat-character-context-prompt.ts` (new)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify — add `formatChatSceneContext`)
- `src/llm/chat/chat-bible-generation.ts` (modify imports only if `ChatBibleContext` moves)
- `src/llm/prompts/chat/chat-bible-prompt.ts` (modify imports only if `ChatBibleContext` moves)

## Out of Scope

- Creating or wiring `generateChatSceneContext()` / `generateChatCharacterContext()` in this ticket
- Deleting `chat-bible-prompt.ts` (happens in CHABIBSTASPL-005)
- Generation function wiring (CHABIBSTASPL-004)
- Pipeline rewiring (CHABIBSTASPL-005)
- Stage registry changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Changes to `formatChatBible()` (downstream consumers unchanged)
- Model/schema/validator work already completed in earlier tickets
- Changes to planner, writer, or state updater prompts

## Acceptance Criteria

### Tests That Must Pass

1. `buildChatSceneContextMessages` returns a system message and a user message.
2. Scene system message contains "objective scene reality" or similar scene-focused language.
3. Scene user message includes PHYSICAL CONTEXT, PRE-CHAT LEAD-IN, WORLDBUILDING sections.
4. Scene user message does NOT include RELATIONSHIP STATE or KNOWLEDGE STATE sections.
5. `buildChatCharacterContextMessages` returns a system message and a user message.
6. Character system message contains "psychological state" or similar character-focused language.
7. Character user message includes an ESTABLISHED SCENE CONTEXT section with the formatted scene output.
8. Character user message includes RELATIONSHIP STATE and KNOWLEDGE STATE sections.
9. `formatChatSceneContext` produces a readable string covering all scene context fields.
10. Prompt builders import `ChatBibleContext` from a neutral shared module rather than `chat-bible-generation.ts`.
11. Relevant prompt/unit suites pass. `npm run typecheck`, `npm run lint`, and the full relevant test run pass.

### Invariants

1. `buildChatBibleMessages` is unchanged (still exists, still exported, still used until CHABIBSTASPL-005).
2. `formatChatBible` is unchanged.
3. `ChatBibleContext` shape is unchanged even if its module location changes.
4. Existing `ChatSceneContext`, `ChatCharacterContext`, schemas, validators, and `assembleChatBible()` remain canonical and are not reimplemented here.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — Message structure, section presence/absence, system prompt content
2. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — Message structure, scene context inclusion, section presence, system prompt content
3. `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` — New formatter-focused file covering `formatChatSceneContext`
4. `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` and `test/unit/llm/chat/chat-bible-generation.test.ts` — Import-only adjustments if `ChatBibleContext` moves

### Commands

1. `npm run test:unit -- --runInBand test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts`
2. `npm run test:unit -- --runInBand test/unit/llm/prompts/chat/chat-bible-prompt.test.ts test/unit/llm/chat/chat-bible-generation.test.ts`
3. `npm run typecheck`
4. `npm run lint`

## Outcome

- **Completed**: 2026-03-28
- **What actually changed**:
  - Added `buildChatSceneContextMessages()` and `buildChatCharacterContextMessages()`
  - Added `formatChatSceneContext()`
  - Extracted `ChatBibleContext` into `src/llm/chat/chat-bible-context.ts` so prompt code no longer depends on `chat-bible-generation.ts`
  - Added shared prompt-section helpers and kept the legacy chat-bible prompt behavior intact
  - Added prompt/formatter tests and updated legacy tests for the `ChatBibleContext` module move
- **Deviation from original plan**:
  - The ticket originally assumed split models/schemas/assembly work was still pending; that work was already complete and was removed from scope before implementation
  - The scene-stage ticket text referenced character fields like role/location that do not exist on the canonical standalone character type; the implemented scene prompt uses concise identity fields that do exist (`name`, `rawDescription`, `coreTraits`, `appearance`)
  - The character-stage prompt received a richer character-specific summary than the legacy monolithic prompt so psychology-critical fields like `knowledgeBoundaries` are included
- **Verification**:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test:unit -- --runInBand ...` for the affected prompt/chat suites
  - `npm test -- --runInBand`
