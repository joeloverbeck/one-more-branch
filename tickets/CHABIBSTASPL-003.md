# CHABIBSTASPL-003: Create prompt builders for ChatSceneContext and ChatCharacterContext stages

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: CHABIBSTASPL-001 (types), CHABIBSTASPL-002 (schemas)

## Problem

The two new LLM stages each need a prompt builder that assembles system + user messages from the pipeline context. The scene prompt is a subset of the current `buildChatBibleMessages()`. The character prompt is similar but also includes the Stage 1 scene context output so the LLM can ground character psychology in established scene reality.

## Assumption Reassessment (2026-03-27)

1. `buildChatBibleMessages(context: ChatBibleContext): ChatMessage[]` lives in `src/llm/prompts/chat/chat-bible-prompt.ts` — **confirmed**.
2. The prompt uses 9 user-message sections: TARGET CHARACTER, INTERLOCUTOR, WORLDBUILDING, RELATIONSHIP STATE, KNOWLEDGE STATE, PHYSICAL CONTEXT, PRE-CHAT LEAD-IN, OLDER CHAT SUMMARY, RECENT CHAT TURNS — **confirmed**.
3. Helper functions `formatRollingSummaryForPrompt()` and `formatRecentTurns()` exist in `chat-prompt-formatters.ts` — **confirmed**.
4. `ChatBibleContext` interface is defined in `chat-bible-generation.ts` with fields: `targetCharacter`, `interlocutorCharacter`, `decomposedWorld`, `relationshipState`, `knowledgeState`, `physicalContext`, `leadInContext`, `rollingSummary`, `recentTurns` — **confirmed**.
5. Test file at `test/unit/llm/prompts/chat/chat-bible-prompt.test.ts` — **confirmed**.

## Architecture Check

1. Two focused prompts are cleaner than one large prompt. Each prompt has a tighter system instruction aligned with its stage's purpose. The scene prompt focuses on objective context; the character prompt focuses on psychological synthesis grounded in scene output.
2. No backwards-compatibility aliasing. Old prompt builder stays until CHABIBSTASPL-005.

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

### 3. Scene context formatting helper

Add `formatChatSceneContext(scene: ChatSceneContext): string` to `src/llm/prompts/chat/chat-prompt-formatters.ts` for use by the character prompt.

## Files to Touch

- `src/llm/prompts/chat/chat-scene-context-prompt.ts` (new)
- `src/llm/prompts/chat/chat-character-context-prompt.ts` (new)
- `src/llm/prompts/chat/chat-prompt-formatters.ts` (modify — add `formatChatSceneContext`)

## Out of Scope

- Deleting `chat-bible-prompt.ts` (happens in CHABIBSTASPL-005)
- Generation function wiring (CHABIBSTASPL-004)
- Pipeline rewiring (CHABIBSTASPL-005)
- Stage registry changes (CHABIBSTASPL-006)
- Strict-false fallback (CHABIBSTASPL-007)
- Changes to `formatChatBible()` (downstream consumers unchanged)
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
10. Existing suite: `npm test` passes. `npm run typecheck` passes.

### Invariants

1. `buildChatBibleMessages` is unchanged (still exists, still exported, still used until CHABIBSTASPL-005).
2. `formatChatBible` is unchanged.
3. `ChatBibleContext` interface is unchanged.

## Test Plan

### New/Modified Tests

1. `test/unit/llm/prompts/chat/chat-scene-context-prompt.test.ts` — Message structure, section presence/absence, system prompt content
2. `test/unit/llm/prompts/chat/chat-character-context-prompt.test.ts` — Message structure, scene context inclusion, section presence, system prompt content
3. `test/unit/llm/prompts/chat/chat-prompt-formatters.test.ts` — Add tests for `formatChatSceneContext` (modify existing test file)

### Commands

1. `npm test -- --testPathPattern="test/unit/llm/prompts/chat/chat-(scene|character)-context-prompt"`
2. `npm run typecheck && npm run lint && npm test`
