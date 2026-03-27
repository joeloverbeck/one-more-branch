# Spec: Character Chat System

## Overview

Add a standalone chat feature that lets users have one-on-one in-character conversations with any saved character. The user selects two saved `StandaloneDecomposedCharacter` profiles — one as the LLM-controlled target character, one as the user's avatar — provides physical context and lead-in situation, then chats in real time. Chats are persisted to disk and can be resumed at any time.

## Goals

1. Implement a 4-stage LLM pipeline per turn: Chat Bible Curator (conditional) -> Turn Planner -> Turn Writer -> Chat State Updater
2. Persist chat sessions as file-based JSON (resumable across browser sessions)
3. Build a chat setup form, chat list page, and chat conversation page
4. Add "Chat with Character" link to the Characters dropdown in the global header
5. Support dynamic physical context updates as the conversation evolves
6. Implement rolling LLM-generated summaries for long conversation memory management
7. Create prompt documentation files and model configuration entries for all new stages

## Dependencies

- Saved `StandaloneDecomposedCharacter` profiles (existing `character-repository.ts`)
- LLM stage runner infrastructure (existing `llm-stage-runner.ts`)
- Content policy (existing `content-policy.ts`)
- File-based persistence patterns (existing `storage.ts`, `page-serializer.ts`)
- Client-side JS concatenation (existing `scripts/concat-client-js.js`)

## Architecture

### Pipeline Flow

```
User types message (free text as their avatar character)
    |
    v
[Parse user input: *asterisks* = ACTION, rest = SPEECH]
    |
    v
[Store user turn in turns.json]
    |
    v
[Should refresh bible?] --yes--> [Chat Bible Curator (LLM)]
    | no                                    |
    v                                       v
[Turn Planner (LLM)] <------------ [Cache bible in chat.json]
    |
    v
[Turn Writer (LLM)]
    |
    v
[Chat State Updater (LLM)]
    |
    |-> [Store CHARACTER turn in turns.json]
    |-> [Update physical context in chat.json]
    |-> [Update relationship/knowledge state in chat.json]
    |-> [shouldRefreshChatBible? -> flag for next turn]
    |
    v
[Every N turns?] --yes--> [Rolling Summary (LLM)]
    | no                        |
    v                           v
[Return response to UI]  [Update rollingSummary in chat.json]
```

### Bible Refresh Triggers

- Session start (first turn of a new or resumed session)
- State Updater sets `shouldRefreshChatBible: true`
- Location change detected in State Updater
- Every 10 turns as safety net

### Rolling Summary Triggers

- Every 8 turns
- On session resume if no existing summary and >8 turns exist

### Session Resume Flow

1. Load `chat.json` (metadata, physical context, relationship state, rolling summary, cached bible)
2. Load `turns.json` (all turns)
3. Trigger bible refresh before first new turn
4. Display conversation history, accept new input

## Storage Structure

```
chats/
  {chatId}/
    chat.json       # Session metadata, physical context, rolling state, cached bible
    turns.json      # All turns (user and character)
```

## Data Models

### Files to Create

```
src/models/
  chat/
    chat-session.ts          # ChatSession, ChatPhysicalContext, ChatLeadInContext
    chat-turn.ts             # ChatTurn, ChatBlock, TurnMeta
    chat-bible.ts            # ChatBible (Bible Curator output)
    chat-turn-plan.ts        # TurnPlannerOutput (Turn Planner output)
    chat-state-update.ts     # ChatStateUpdate (State Updater output)
    chat-rolling-summary.ts  # RollingSummaryOutput (Summary output)
    index.ts                 # Re-exports
```

### ChatSession (`chat.json`)

```typescript
interface ChatSession {
  readonly id: string;                           // UUID
  readonly createdAt: string;                    // ISO timestamp
  readonly updatedAt: string;                    // ISO timestamp
  readonly targetCharacterId: string;            // StandaloneDecomposedCharacter ID
  readonly interlocutorCharacterId: string;      // User avatar character ID
  readonly targetCharacterName: string;          // Denormalized for display
  readonly interlocutorCharacterName: string;    // Denormalized for display
  readonly physicalContext: ChatPhysicalContext;  // Current (mutable via State Updater)
  readonly leadInContext: ChatLeadInContext;      // Set once at creation
  readonly chatBible: ChatBible | null;          // Latest bible output (cached)
  readonly turnCount: number;
  readonly rollingSummary: string | null;         // Compressed older turns
  readonly relationshipState: ChatRelationshipState;
  readonly knowledgeState: ChatKnowledgeState;
}

interface ChatPhysicalContext {
  readonly location: string;
  readonly microLocation: string;
  readonly timeOfDay: TimeOfDay;
  readonly privacy: Privacy;
  readonly distanceBand: DistanceBand;
  readonly characterActivity: string;
  readonly interactableObjects: readonly string[];
  readonly ambientConditions: readonly string[];
}

type TimeOfDay = 'DAWN' | 'MORNING' | 'MIDDAY' | 'AFTERNOON' | 'DUSK' | 'EVENING' | 'LATE_NIGHT';
type Privacy = 'PRIVATE' | 'SEMI_PRIVATE' | 'PUBLIC';
type DistanceBand = 'INTIMATE' | 'ARM_REACH' | 'CONVERSATIONAL' | 'ACROSS_ROOM' | 'DISTANT';

interface ChatLeadInContext {
  readonly leadInSummary: string;
  readonly recentEvents: readonly string[];
  readonly whyNow: string;
}

interface ChatRelationshipState {
  readonly dynamic: string;
  readonly valence: number;       // -5 to +5
  readonly tension: number;       // 0 to 10
  readonly leverage: string;
}

interface ChatKnowledgeState {
  readonly knownFacts: readonly string[];
  readonly suspicions: readonly string[];
  readonly falseBeliefs: readonly string[];
  readonly secretsRevealed: readonly string[];
}
```

### ChatTurn (`turns.json`)

```typescript
interface ChatTurn {
  readonly turnNumber: number;
  readonly speaker: 'USER' | 'CHARACTER';
  readonly blocks: readonly ChatBlock[];
  readonly rawText?: string;                     // Original user text (USER turns only)
  readonly turnMeta?: TurnMeta;                  // Writer output (CHARACTER turns only)
  readonly plannerOutput?: TurnPlannerOutput;     // Hidden planning (CHARACTER turns only)
  readonly stateUpdate?: ChatStateUpdate;         // State changes (CHARACTER turns only)
  readonly timestamp: string;
}

interface ChatBlock {
  readonly type: 'ACTION' | 'SPEECH';
  readonly delivery?: string;                    // SPEECH blocks only: 'clipped', 'warm', 'dry', etc.
  readonly text: string;
}

interface TurnMeta {
  readonly expectsReply: boolean;
  readonly endsWithQuestion: boolean;
  readonly visibleEmotion: string;
  readonly finalPressure: string | null;
}
```

### ChatBible (Chat Bible Curator output)

```typescript
interface ChatBible {
  readonly sessionPremise: string;
  readonly physicalReality: ChatPhysicalContext;
  readonly preChatMomentum: {
    readonly leadInSummary: string;
    readonly recentEvents: readonly string[];
    readonly whyNow: string;
    readonly stakesNow: readonly string[];
    readonly unresolvedPressures: readonly string[];
  };
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
    readonly secretsKept: readonly string[];
    readonly knowledgeBoundaries: readonly string[];
  };
  readonly conversationNow: {
    readonly rollingSummary: string | null;
    readonly activeThreads: readonly string[];
    readonly commitments: readonly string[];
    readonly sensitiveTopics: readonly string[];
    readonly lastTurnPressure: string | null;
  };
  readonly continuityGuardrails: readonly string[];
  readonly responseConstraints: readonly string[];
}

type WillingnessToEngage = 'EAGER' | 'OPEN' | 'GUARDED' | 'RESISTANT' | 'HOSTILE';
```

### TurnPlannerOutput (Turn Planner output)

```typescript
interface TurnPlannerOutput {
  readonly internalSelfCheck: {
    readonly whatDoIWant: string;
    readonly whatDoIKnow: string;
    readonly whatAmIHiding: string;
    readonly howHonestAmI: string;
  };
  readonly responseGoal: string;
  readonly speechAct: SpeechAct;
  readonly honestyMode: HonestyMode;
  readonly surfaceEmotion: string;
  readonly suppressedEmotion: string | null;
  readonly subtext: string;
  readonly mustAddress: readonly string[];
  readonly mustAvoid: readonly string[];
  readonly blockPlan: readonly ('ACTION' | 'SPEECH')[];
  readonly actionPlan: readonly ActionPlanItem[];
  readonly questionBack: string | null;
  readonly targetLength: 'SHORT' | 'MEDIUM' | 'LONG';
  readonly expectedImpact: {
    readonly relationshipDeltaHint: number;   // -2 to +2
    readonly tensionDeltaHint: number;        // -2 to +2
    readonly revealsSecret: boolean;
  };
}

type SpeechAct = 'ASSERT' | 'DEFLECT' | 'PROBE' | 'CONCEDE' | 'CHALLENGE'
  | 'COMFORT' | 'THREATEN' | 'REVEAL' | 'DECEIVE' | 'WITHDRAW';

type HonestyMode = 'FULL' | 'PARTIAL' | 'EVASIVE' | 'DECEPTIVE';

interface ActionPlanItem {
  readonly kind: 'GESTURE' | 'POSTURE_SHIFT' | 'OBJECT_INTERACTION' | 'MOVEMENT' | 'EXPRESSION';
  readonly text: string;
  readonly changesPhysicalState: boolean;
}
```

### ChatStateUpdate (Chat State Updater output)

```typescript
interface ChatStateUpdate {
  readonly summaryDelta: string;
  readonly relationshipShifts: readonly {
    readonly shiftDescription: string;
    readonly suggestedValenceChange: number;      // -2 to +2
    readonly suggestedTensionChange: number;      // -2 to +2
    readonly suggestedNewDynamic: string | null;
  }[];
  readonly knowledgeChanges: {
    readonly newKnownFacts: readonly string[];
    readonly newSuspicions: readonly string[];
    readonly falseBeliefsCorrected: readonly string[];
    readonly secretsRevealed: readonly string[];
  };
  readonly conversationUpdate: {
    readonly commitmentsMade: readonly string[];
    readonly threatsMade: readonly string[];
    readonly questionsOpened: readonly string[];
    readonly questionsResolved: readonly string[];
  };
  readonly physicalStateUpdate: {
    readonly locationChanged: boolean;
    readonly newLocation: string | null;
    readonly newMicroLocation: string | null;
    readonly newDistanceBand: string | null;
    readonly objectStateChanges: readonly string[];
  };
  readonly shouldRefreshChatBible: boolean;
  readonly shouldTriggerSummary: boolean;
}
```

### RollingSummaryOutput (Rolling Summary output)

```typescript
interface RollingSummaryOutput {
  readonly compressedSummary: string;
  readonly keyCommitments: readonly string[];
  readonly keyRevelations: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly leverageShifts: readonly string[];
  readonly emotionalTrajectory: string;
}
```

## Persistence Layer

### Files to Create

```
src/persistence/
  chat-repository.ts        # Chat session CRUD + turn management
  chat-serializer.ts        # Serialization/deserialization for chat types
```

### Chat Repository API

```typescript
// Session operations
saveChat(session: ChatSession): Promise<void>
loadChat(chatId: string): Promise<ChatSession | null>
listChats(): Promise<ChatSessionSummary[]>
updateChat(chatId: string, updater: (session: ChatSession) => ChatSession): Promise<ChatSession>
deleteChat(chatId: string): Promise<void>

// Turn operations
saveTurn(chatId: string, turn: ChatTurn): Promise<void>
loadTurns(chatId: string): Promise<ChatTurn[]>
getRecentTurns(chatId: string, count: number): Promise<ChatTurn[]>

// Summary type for list display
interface ChatSessionSummary {
  readonly id: string;
  readonly targetCharacterName: string;
  readonly interlocutorCharacterName: string;
  readonly turnCount: number;
  readonly updatedAt: string;
  readonly location: string;
}
```

Storage directory: `chats/` at project root (same level as `stories/`). Add to `.gitignore`.

## LLM Integration

### Files to Create

```
src/llm/
  chat/
    chat-bible-generation.ts           # Chat Bible Curator stage
    chat-planner-generation.ts         # Turn Planner stage
    chat-writer-generation.ts          # Turn Writer stage
    chat-state-updater-generation.ts   # Chat State Updater stage
    chat-summary-generation.ts         # Rolling Summary stage
    chat-pipeline.ts                   # Orchestrates the per-turn pipeline
  prompts/
    chat/
      chat-bible-prompt.ts            # Bible Curator prompt builder
      chat-planner-prompt.ts          # Turn Planner prompt builder
      chat-writer-prompt.ts           # Turn Writer prompt builder
      chat-state-updater-prompt.ts    # State Updater prompt builder
      chat-summary-prompt.ts          # Rolling Summary prompt builder
  schemas/
    chat-bible-schema.ts              # Bible Curator response schema
    chat-planner-schema.ts            # Turn Planner response schema
    chat-writer-schema.ts             # Turn Writer response schema
    chat-state-updater-schema.ts      # State Updater response schema
    chat-summary-schema.ts            # Rolling Summary response schema
```

### New LLM Stage Keys

Add to `src/config/llm-stage-registry.ts`:

```typescript
'chatBible',
'chatPlanner',
'chatWriter',
'chatStateUpdater',
'chatSummarizer',
```

### Config Entries

Add to `configs/default.json` under `llm.models`:

```json
"chatBible": "anthropic/claude-sonnet-4.6",
"chatPlanner": "anthropic/claude-sonnet-4.6",
"chatWriter": "anthropic/claude-sonnet-4.6",
"chatStateUpdater": "x-ai/grok-4.20-beta",
"chatSummarizer": "x-ai/grok-4.20-beta"
```

Add to `configs/default.json` under `llm.stageMaxTokens`:

```json
"chatBible": 3000,
"chatPlanner": 1000,
"chatWriter": 2000,
"chatStateUpdater": 2000,
"chatSummarizer": 1500
```

Add to `configs/default.json` under `llm.stageTemperatures`:

```json
"chatBible": 0.3,
"chatPlanner": 0.3,
"chatWriter": 0.7,
"chatStateUpdater": 0.2,
"chatSummarizer": 0.2
```

### Chat Pipeline Orchestrator

```typescript
// src/llm/chat/chat-pipeline.ts

interface ChatPipelineContext {
  readonly chatSession: ChatSession;
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly recentTurns: readonly ChatTurn[];
  readonly userMessage: string;
  readonly parsedUserBlocks: readonly ChatBlock[];
}

interface ChatPipelineResult {
  readonly characterTurn: ChatTurn;
  readonly updatedSession: ChatSession;           // With updated physical context, relationship, knowledge
  readonly bibleWasRefreshed: boolean;
  readonly summaryWasGenerated: boolean;
}

async function runChatPipeline(
  context: ChatPipelineContext,
  apiKey: string,
): Promise<ChatPipelineResult>
```

The pipeline:
1. Check bible refresh triggers -> conditionally run Chat Bible Curator
2. Run Turn Planner with bible + recent turns + user message
3. Run Turn Writer with planner output + speech fingerprint + recent turns
4. Run Chat State Updater with bible + planner output + writer output
5. Apply state updates to session (physical context, relationship, knowledge)
6. Check summary trigger -> conditionally run Rolling Summary
7. Return result

### Prompt Design

All prompts include the NC-21 content policy block from `content-policy.ts`.

#### Chat Bible Curator Prompt

**System message:**

```
You are curating an authoritative brief for a one-on-one in-world chat.
Physical context is mandatory and authoritative.
Separate permanent profile, current state, and conversation memory.
Preserve knowledge boundaries, false beliefs, and secrets.
State why this conversation is happening now.
Surface what the character wants, what they fear, what they will protect, and what pressure is active.
Compress aggressively for the next 1-3 turns only.
Do not write dialogue.

[CONTENT POLICY BLOCK]
```

**User message sections:**

1. TARGET CHARACTER DECOMPOSITION (full `StandaloneDecomposedCharacter` data)
2. INTERLOCUTOR CHARACTER PROFILE (avatar character's decomposed data)
3. RELATIONSHIP STATE (current relationship between the two)
4. PHYSICAL CONTEXT (current `ChatPhysicalContext`)
5. PRE-CHAT LEAD-IN (from `ChatLeadInContext`)
6. OLDER CHAT SUMMARY (rolling summary, if any)
7. RECENT CHAT TURNS (last 6-12 turns, structured)

#### Turn Planner Prompt

**System message:**

```
Plan exactly one character turn.
Respect decision pattern, conflict priority, current intentions, false beliefs, secrets, and knowledge boundaries.
The turn must react to the latest user message.
Use physical reality as hard constraints.
Small observable actions are allowed; impossible or offscreen actions are not.
Decide both visible behavior and hidden conversational intent.
Preserve subtext; do not flatten everything into exposition.
Do not write final dialogue.
Before planning, perform an internal self-check: What do I want? What do I know? What am I hiding? How honest am I willing to be right now?

[CONTENT POLICY BLOCK]
```

**User message sections:**

1. CHAT BIBLE (cached bible output)
2. TARGET CHARACTER SPEECH FINGERPRINT (from decomposed character)
3. RECENT CHAT TURNS (last 6-12 turns)
4. LATEST USER MESSAGE (current user input)

#### Turn Writer Prompt

**System message:**

```
Write exactly one in-world turn for the target character.
This is chat, not page prose.
ACTION is concise, visible, and non-omniscient.
SPEECH carries the character voice.
Follow the planner's honesty mode, subtext, and action plan.
Respect physical reality, knowledge boundaries, and secrets.
Do not narrate the interlocutor's inner thoughts.
Keep the turn bounded and reply-shaped.
Maximum 2 action blocks; maximum 3 speech blocks.
Allow controlled imperfections in speech: self-corrections, hesitations, false starts when they serve characterization.

[CONTENT POLICY BLOCK]
```

**User message sections:**

1. TARGET CHARACTER NAME
2. FULL SPEECH FINGERPRINT (full speech fingerprint from decomposed character including catchphrases, vocabulary profile, sentence patterns, verbal tics, dialogue samples, anti-examples, discourse markers, register shifts)
3. CHAT BIBLE (cached bible output)
4. TURN PLAN (planner output)
5. RECENT CHAT TURNS (last 6-12 turns)
6. LATEST USER MESSAGE

#### Chat State Updater Prompt

**System message:**

```
Extract only state changes that actually occurred.
Track relationship shifts only when meaningful.
Track knowledge asymmetry: what changed in who knows what, what false beliefs remain, what secrets moved.
Track commitments, threats, opened questions, resolved questions.
Track physical changes only if shown in the written turn.
Signal when the chat bible should be refreshed.
Signal when a rolling summary should be generated.

[CONTENT POLICY BLOCK]
```

**User message sections:**

1. PRE-TURN CHAT BIBLE (cached bible)
2. LATEST USER MESSAGE
3. TURN PLAN (planner output)
4. FINAL WRITTEN TURN (writer output)

#### Rolling Summary Prompt

**System message:**

```
Compress the provided chat turns into a factual summary.
Focus on: commitments made, lies told, confessions given, unresolved questions, leverage shifts, exact factual disclosures.
Do not summarize sentiment. Summarize facts, decisions, and power dynamics.
Preserve any information needed for continuity in future turns.
```

**User message sections:**

1. EXISTING ROLLING SUMMARY (if any, to append to)
2. TURNS TO COMPRESS (the batch of older turns being compressed)

## Prompt Documentation

### Files to Create

```
prompts/
  chat-bible-curator-prompt.md
  chat-turn-planner-prompt.md
  chat-turn-writer-prompt.md
  chat-state-updater-prompt.md
  chat-summarizer-prompt.md
```

Each doc follows the existing prompt doc format:
- Purpose and trigger
- System prompt content
- User prompt sections with field descriptions
- Output schema with field descriptions
- Example output
- Constraints and invariants

## Server Layer

### Files to Create/Modify

```
src/server/
  routes/
    chat.ts                  # Chat routes (list, new, view, turn, delete)
  services/
    chat-service.ts          # Chat business logic (create, send turn, resume)
  views/
    pages/
      chat-list.ejs          # Chat list page
      chat-new.ejs           # Chat setup form
      chat.ejs               # Chat conversation page
  utils/
    chat-input-parser.ts     # Parse *action* and speech from user input
```

### Routes

```
GET  /chat                     -> Render chat-list.ejs (all saved chats)
GET  /chat/new                 -> Render chat-new.ejs (setup form)
POST /chat                     -> Create new chat -> redirect to /chat/:chatId
GET  /chat/:chatId             -> Render chat.ejs (load conversation)
POST /chat/:chatId/turn        -> Send user message -> run pipeline -> JSON response
DELETE /chat/:chatId           -> Delete chat -> redirect to /chat
GET  /chat/:chatId/progress/:progressId -> Progress polling for turn generation
```

### Chat Service

```typescript
// src/server/services/chat-service.ts

async function createChat(params: CreateChatParams): Promise<ChatSession>
async function sendTurn(chatId: string, userMessage: string, apiKey: string): Promise<ChatPipelineResult>
async function resumeChat(chatId: string): Promise<{ session: ChatSession; turns: ChatTurn[] }>
async function deleteChat(chatId: string): Promise<void>
async function listChats(): Promise<ChatSessionSummary[]>
```

### Header Modification

Add to `src/server/views/partials/header.ejs` in the Characters dropdown:

```html
<a class="dropdown-item" href="/chat">Chat with Character</a>
```

## Client-Side JavaScript

### Files to Create

```
public/js/src/
  20-chat-controller.js      # Chat page controller (send messages, render responses)
  21-chat-new-controller.js   # Chat setup form controller
  22-chat-list-controller.js  # Chat list page controller
```

After creating, regenerate `app.js`:

```bash
node scripts/concat-client-js.js
```

### Chat Controller Features

- Text input with send button (Enter to send)
- Parse user input (*asterisks* -> ACTION, rest -> SPEECH)
- Display loading indicator during pipeline execution ("Character is thinking..." with stage updates)
- Render CHARACTER response blocks (ACTION in italics, SPEECH in quotes with delivery tags)
- Render USER blocks (same format)
- Auto-scroll to newest message
- Display physical context summary in sidebar
- Display relationship state in sidebar

### Chat Setup Form Controller

- Fetch saved characters from `/characters/api/list`
- Populate target and interlocutor character dropdowns
- Validate that two different characters are selected
- Validate required fields (location, micro-location, time of day, character activity)
- Handle API key from session storage

## User Input Parsing

Parse free text into `ChatBlock[]`:

- Text wrapped in `*asterisks*` -> ACTION block
- All other text -> SPEECH block
- Example: `*leans forward* "I don't believe you." *taps the table*`
  -> `[ACTION("leans forward"), SPEECH("I don't believe you."), ACTION("taps the table")]`
- If no asterisks, the entire input is one SPEECH block
- Raw text is preserved alongside parsed blocks

## Error Handling

- **LLM failure mid-pipeline**: User turn is already saved. Pipeline can be retried from the failed stage. Planner output is cached in memory during the turn.
- **Session resume with stale bible**: Always trigger bible refresh before first new turn on resume.
- **Character deleted**: Chat remains viewable (denormalized names in chat.json) but cannot generate new turns. Show warning.
- **Empty chat history**: First turn has no recent turns — planner and writer receive only the bible and the user's first message.
- **Very long conversations (100+ turns)**: Rolling summary keeps token usage bounded. Recursive re-compression if summary itself grows too long.
- **Validation**: Setup form validates both characters selected and different, location not empty, time of day selected, character activity not empty, API key valid. User message validated: not empty, max 2000 chars.

## Testing

### Unit Tests

```
test/unit/
  models/chat/                    # Chat model type guards and validation
  persistence/chat-repository/    # Chat CRUD operations
  server/utils/chat-input-parser/ # User input parsing (*action* vs speech)
  llm/chat/                       # Pipeline trigger logic, bible refresh logic
```

### Integration Tests

```
test/integration/
  chat-pipeline/                  # Full pipeline with mocked LLM
  chat-session-resume/            # Session resume flow
  chat-rolling-summary/           # Summary generation trigger
```

### E2E Tests

```
test/e2e/
  chat-flow/                      # Setup form -> send message -> receive response
```

### Coverage Target

70% (matching project standard).

## Key Invariants

- **Chat persistence**: Every turn is persisted before the pipeline runs. No turn is lost on failure.
- **Bible caching**: The bible is cached in chat.json. It is only regenerated on explicit triggers, never on every turn.
- **Physical context mutability**: The State Updater can change any physical context field. The updated context is persisted immediately.
- **Character immutability**: The `StandaloneDecomposedCharacter` profiles are never modified by the chat system. All state changes are local to the chat session.
- **Memory separation**: Conversational memory (rolling summary, recent turns) is separate from character knowledge state (facts, beliefs, secrets). These are stored in different fields and passed to different prompt sections.
- **Content policy**: All 5 LLM prompt stages include the NC-21 content policy block.
- **API key security**: Never persisted to disk, only in browser session storage. Passed explicitly to every LLM call.
- **Two different characters**: The target character and interlocutor character must be different saved characters.

## Files Summary

### New Files

| File | Purpose |
|------|---------|
| `src/models/chat/chat-session.ts` | ChatSession, ChatPhysicalContext, ChatLeadInContext types |
| `src/models/chat/chat-turn.ts` | ChatTurn, ChatBlock, TurnMeta types |
| `src/models/chat/chat-bible.ts` | ChatBible type |
| `src/models/chat/chat-turn-plan.ts` | TurnPlannerOutput type |
| `src/models/chat/chat-state-update.ts` | ChatStateUpdate type |
| `src/models/chat/chat-rolling-summary.ts` | RollingSummaryOutput type |
| `src/models/chat/index.ts` | Re-exports |
| `src/persistence/chat-repository.ts` | Chat session + turn CRUD |
| `src/persistence/chat-serializer.ts` | Serialization/deserialization |
| `src/llm/chat/chat-bible-generation.ts` | Bible Curator LLM stage |
| `src/llm/chat/chat-planner-generation.ts` | Turn Planner LLM stage |
| `src/llm/chat/chat-writer-generation.ts` | Turn Writer LLM stage |
| `src/llm/chat/chat-state-updater-generation.ts` | State Updater LLM stage |
| `src/llm/chat/chat-summary-generation.ts` | Rolling Summary LLM stage |
| `src/llm/chat/chat-pipeline.ts` | Pipeline orchestrator |
| `src/llm/prompts/chat/chat-bible-prompt.ts` | Bible Curator prompt builder |
| `src/llm/prompts/chat/chat-planner-prompt.ts` | Turn Planner prompt builder |
| `src/llm/prompts/chat/chat-writer-prompt.ts` | Turn Writer prompt builder |
| `src/llm/prompts/chat/chat-state-updater-prompt.ts` | State Updater prompt builder |
| `src/llm/prompts/chat/chat-summary-prompt.ts` | Rolling Summary prompt builder |
| `src/llm/schemas/chat-bible-schema.ts` | Bible Curator response schema |
| `src/llm/schemas/chat-planner-schema.ts` | Turn Planner response schema |
| `src/llm/schemas/chat-writer-schema.ts` | Turn Writer response schema |
| `src/llm/schemas/chat-state-updater-schema.ts` | State Updater response schema |
| `src/llm/schemas/chat-summary-schema.ts` | Rolling Summary response schema |
| `src/server/routes/chat.ts` | Chat routes |
| `src/server/services/chat-service.ts` | Chat business logic |
| `src/server/views/pages/chat-list.ejs` | Chat list page template |
| `src/server/views/pages/chat-new.ejs` | Chat setup form template |
| `src/server/views/pages/chat.ejs` | Chat conversation page template |
| `src/server/utils/chat-input-parser.ts` | User input parser |
| `public/js/src/20-chat-controller.js` | Chat page JS controller |
| `public/js/src/21-chat-new-controller.js` | Setup form JS controller |
| `public/js/src/22-chat-list-controller.js` | Chat list JS controller |
| `prompts/chat-bible-curator-prompt.md` | Bible Curator prompt doc |
| `prompts/chat-turn-planner-prompt.md` | Turn Planner prompt doc |
| `prompts/chat-turn-writer-prompt.md` | Turn Writer prompt doc |
| `prompts/chat-state-updater-prompt.md` | State Updater prompt doc |
| `prompts/chat-summarizer-prompt.md` | Rolling Summary prompt doc |

### Files to Modify

| File | Change |
|------|--------|
| `src/config/llm-stage-registry.ts` | Add 5 new stage keys |
| `configs/default.json` | Add model, maxTokens, temperature entries for 5 new stages |
| `src/server/views/partials/header.ejs` | Add "Chat with Character" to Characters dropdown |
| `src/server/routes/index.ts` | Register chat routes |
| `.gitignore` | Add `chats/` directory |

## Verification

1. **Create a chat**: Navigate to `/chat/new`, select two different characters, fill in physical context and lead-in, submit. Verify `chats/{chatId}/chat.json` is created with correct data.
2. **Send first turn**: Type a message, send. Verify bible is generated (first turn trigger), planner runs, writer produces ACTION/SPEECH blocks, state updater runs. Verify turn is stored in `turns.json`.
3. **Send multiple turns**: Verify planner/writer/state updater run per turn. Verify bible is NOT refreshed on every turn (only on triggers).
4. **Physical context update**: Send a message that causes the character to move. Verify state updater detects location change and updates `chat.json`. Verify bible refresh is triggered on next turn.
5. **Rolling summary**: Send 8+ turns. Verify summary is generated and stored in `chat.json`. Verify older turns are still in `turns.json` (raw turns preserved, summary is additive).
6. **Resume chat**: Close browser, reopen `/chat/{chatId}`. Verify conversation history is displayed. Verify bible is refreshed before first new turn.
7. **Chat list**: Navigate to `/chat`. Verify all saved chats are listed with character names, turn count, last updated time.
8. **Delete chat**: Delete a chat. Verify `chats/{chatId}/` directory is removed.
9. **Run tests**: `npm test` passes, `npm run test:coverage` meets 70% threshold.
10. **Lint and typecheck**: `npm run lint` and `npm run typecheck` pass.
