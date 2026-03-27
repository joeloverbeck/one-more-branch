# Chat Bible Stage Split

**Status**: PENDING
**Created**: 2026-03-27
**Scope**: Split the single `chatBible` LLM stage into two smaller stages to fix the Anthropic "compiled grammar is too large" error

## Problem

The `CHAT_BIBLE_SCHEMA` in `src/llm/schemas/chat-bible-schema.ts` has ~45 properties across 7 nested objects with `strict: true`. When Anthropic compiles this into a constrained grammar (GBNF), the compiled output exceeds their internal size limit, producing:

```
"The compiled grammar is too large, which would cause performance issues.
Simplify your tool schemas or reduce the number of strict tools."
```

This error occurs on **every** chatBible call, making the chat feature unusable with Anthropic models. The story engine's planner already has a `strict: false` fallback for the same error, but the chat pipeline has no such protection. However, a fallback alone is suboptimal because:
1. Every call would fail-then-retry, adding 2-5s latency
2. `strict: false` loses grammar enforcement guarantees

## Solution: Split Into Two Sequential LLM Stages

Replace the single `CURATING_CHAT_BIBLE` stage with two smaller stages:
1. **`CURATING_CHAT_SCENE`** (Scene & Continuity) - ~18 properties
2. **`CURATING_CHAT_CHARACTER`** (Character & Synthesis) - ~27 properties, receives Stage 1 output as input

Both stages keep `strict: true` and stay well under the ~30-property safe limit for Anthropic grammar compilation.

### Stage 1: Chat Scene Context (`chatSceneContext`)

**Purpose**: Establish the objective scene reality, narrative momentum, and conversation state. These are primarily input-derived (reflecting physical context, lead-in, and recent turns) with light LLM synthesis.

**Output schema** (~18 properties):

```typescript
interface ChatSceneContext {
  readonly sessionPremise: string;
  readonly physicalReality: {
    readonly location: string;
    readonly microLocation: string;
    readonly timeOfDay: TimeOfDay;
    readonly privacy: Privacy;
    readonly distanceBand: DistanceBand;
    readonly characterActivity: string;
    readonly interactableObjects: readonly string[];
    readonly ambientConditions: readonly string[];
  };
  readonly preChatMomentum: {
    readonly leadInSummary: string;
    readonly recentEvents: readonly string[];
    readonly whyNow: string;
    readonly stakesNow: readonly string[];
    readonly unresolvedPressures: readonly string[];
  };
  readonly conversationNow: {
    readonly rollingSummary: string | null;
    readonly activeThreads: readonly string[];
    readonly commitments: readonly string[];
    readonly sensitiveTopics: readonly string[];
    readonly lastTurnPressure: string | null;
  };
}
```

**Input**: Same as current chatBible context (characters, world, relationship/knowledge state, physical context, lead-in, rolling summary, recent turns).

**LLM stage name**: `chatSceneContext`
**Generation stage**: `CURATING_CHAT_SCENE`

### Stage 2: Chat Character Context (`chatCharacterContext`)

**Purpose**: Synthesize the character's psychological state, relationship dynamics, knowledge model, and guardrails — grounded in the scene reality from Stage 1.

**Output schema** (~27 properties):

```typescript
interface ChatCharacterContext {
  readonly characterNow: {
    readonly currentObjective: string;
    readonly immediateNeedFromConversation: string;
    readonly emotionalState: string;
    readonly willingnessToEngage: WillingnessToEngage;
    readonly topicsToAdvance: readonly string[];
    readonly topicsToProtect: readonly string[];
  };
  readonly relationshipNow: {
    readonly dynamic: string;
    readonly valence: number;
    readonly tension: number;
    readonly leverage: string;
    readonly whatCharacterBelievesAboutInterlocutor: readonly string[];
  };
  readonly knowledgeNow: {
    readonly knownFacts: readonly string[];
    readonly suspicions: readonly string[];
    readonly falseBeliefs: readonly string[];
    readonly secretsRevealed: readonly string[];
    readonly secretsKept: readonly string[];
    readonly knowledgeBoundaries: readonly string[];
  };
  readonly continuityGuardrails: readonly string[];
  readonly responseConstraints: readonly string[];
}
```

**Input**: Same base context as Stage 1, PLUS the `ChatSceneContext` output from Stage 1. The prompt should include the scene context so the LLM can ground character psychology in established scene reality (e.g., emotional state influenced by physical environment and recent pressures).

**LLM stage name**: `chatCharacterContext`
**Generation stage**: `CURATING_CHAT_CHARACTER`

## Why This Split

### Dependency analysis

The ChatBible sections have internal cross-dependencies:

- `physicalReality`, `preChatMomentum`, `conversationNow` are **primarily input-derived** — they reflect the physical context, lead-in, and recent turns with light synthesis
- `characterNow.emotionalState` depends on `preChatMomentum` (pressures shape emotion)
- `characterNow.willingnessToEngage` depends on `relationshipNow` (relationship shapes willingness)
- `knowledgeNow.secretsKept` depends on `relationshipNow.leverage`
- `continuityGuardrails` and `responseConstraints` **synthesize across all sections** — they need both scene and character context

This means Stage 2 benefits from receiving Stage 1's output as input, but Stage 1 has no dependency on Stage 2.

### Industry consensus

Multi-stage character AI systems use a "world-first, character-second" pattern: characters react to their environment, so character synthesis benefits from established scene context.

## Composite ChatBible Type

The downstream stages (planner, writer, state updater) currently consume a single `ChatBible` interface. To minimize downstream changes, reassemble the two halves into a composite:

```typescript
interface ChatBible {
  // From ChatSceneContext
  readonly sessionPremise: string;
  readonly physicalReality: ChatPhysicalContext;
  readonly preChatMomentum: ChatBiblePreChatMomentum;
  readonly conversationNow: ChatBibleConversationNow;
  // From ChatCharacterContext
  readonly characterNow: ChatBibleCharacterNow;
  readonly relationshipNow: ChatBibleRelationshipNow;
  readonly knowledgeNow: ChatBibleKnowledgeNow;
  readonly continuityGuardrails: readonly string[];
  readonly responseConstraints: readonly string[];
}
```

The `ChatBible` type itself does not change — it is assembled by merging `ChatSceneContext` + `ChatCharacterContext` in the pipeline. Downstream consumers (`formatChatBible`, planner prompt, writer prompt, state updater prompt) remain unchanged.

## Files to Create

1. **`src/models/chat/chat-scene-context.ts`** — `ChatSceneContext` interface
2. **`src/models/chat/chat-character-context.ts`** — `ChatCharacterContext` interface
3. **`src/llm/schemas/chat-scene-context-schema.ts`** — JSON schema for scene stage output
4. **`src/llm/schemas/chat-character-context-schema.ts`** — JSON schema for character stage output
5. **`src/llm/prompts/chat/chat-scene-context-prompt.ts`** — Prompt builder for scene stage
6. **`src/llm/prompts/chat/chat-character-context-prompt.ts`** — Prompt builder for character stage (receives scene context as input)
7. **`src/llm/chat/chat-scene-context-generation.ts`** — Generation function for scene stage
8. **`src/llm/chat/chat-character-context-generation.ts`** — Generation function for character stage

## Files to Modify

1. **`src/llm/chat/chat-pipeline.ts`** — Replace single `generateChatBible()` call with sequential `generateChatSceneContext()` → `generateChatCharacterContext()` → merge into `ChatBible`
2. **`src/models/chat/chat-bible.ts`** — Keep `ChatBible` interface unchanged; add assembly function `assembleChatBible(scene: ChatSceneContext, character: ChatCharacterContext): ChatBible`
3. **`src/models/chat/index.ts`** — Re-export new types
4. **`src/models/chat/chat-validation.ts`** — Add `isChatSceneContext` and `isChatCharacterContext` validators
5. **`src/config/llm-stage-registry.ts`** — Add `chatSceneContext` and `chatCharacterContext` stage names; remove `chatBible`
6. **`src/engine/generated-generation-stages.ts`** — Add `CURATING_CHAT_SCENE` and `CURATING_CHAT_CHARACTER`; remove `CURATING_CHAT_BIBLE`
7. **`src/config/generation-stage-metadata.json`** — Add metadata for new stages; remove `CURATING_CHAT_BIBLE`
8. **`public/js/src/01-constants.js`** — Add display names and phrase pools for new stages; remove old chatBible stage
9. **`public/js/app.js`** — Regenerate via `node scripts/concat-client-js.js`

## Files to Delete

1. **`src/llm/schemas/chat-bible-schema.ts`** — Replaced by two smaller schemas
2. **`src/llm/prompts/chat/chat-bible-prompt.ts`** — Replaced by two smaller prompts
3. **`src/llm/chat/chat-bible-generation.ts`** — Replaced by two smaller generation functions

## Downstream Impact

- **`formatChatBible()`** in `src/llm/prompts/chat/chat-prompt-formatters.ts` — **No change**. It receives a `ChatBible` which is assembled before being passed to downstream stages.
- **Chat planner, writer, state updater prompts** — **No change**. They consume `ChatBible` via `formatChatBible()`.
- **`ChatSession.chatBible`** — **No change**. The persisted type remains `ChatBible | null`. Assembly happens at generation time, persistence stores the merged result.
- **`chat-state-applier.ts`** — **No change**. It receives the assembled `ChatBible`.

## Testing Strategy

### Unit Tests

1. **Schema validation**: Verify both new schemas compile with `strict: true` and accept valid data
2. **`assembleChatBible`**: Verify correct merge of scene + character contexts
3. **`isChatSceneContext` / `isChatCharacterContext`**: Validator coverage
4. **New generation functions**: Mock `runLlmStage` and verify correct schema/prompt wiring
5. **Pipeline integration**: Verify the pipeline calls scene → character → merge → planner in sequence

### Manual Verification

1. Start a new chat session — verify chatBible generation succeeds without grammar error
2. Chat for 10+ turns — verify chatBible refresh still works
3. Resume a chat session — verify chatBible regeneration works
4. Compare generated ChatBible quality before/after split (spot-check a few sessions)

### Regression

- Run full test suite: `npm test`
- Run client tests: `npm run test:client`
- Type check: `npm run typecheck`
- Lint: `npm run lint`

## Grammar Safety Budget

| Schema | Properties | Nesting | Nullable fields | Safe? |
|--------|-----------|---------|-----------------|-------|
| ChatSceneContext | ~18 | 2 levels | 2 (`rollingSummary`, `lastTurnPressure`) | Yes |
| ChatCharacterContext | ~27 | 2 levels | 0 | Yes |
| Old ChatBible | ~45 | 2 levels | 2 | No (too large) |

Safe limits (inferred from Anthropic behavior): <30 properties, <3 nesting levels, <15 nullable fields.

## Additionally: Add `strict: false` Fallback to All Chat Stages

As a safety net, also add the planner-style `strict: false` fallback to all chat generation functions (scene context, character context, planner, writer, state updater, summarizer). This protects against future schema growth pushing any individual stage over the grammar limit.

Pattern to follow: `src/llm/planner-generation.ts:165` (`generatePlannerWithFallback`).
