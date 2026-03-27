# Create Chat Functionality

I asked the following to ChatGPT Pro:

"We're implementing a platform for interactive branching storytelling. However, sometimes we just want to chat with any of the characters created. We have sophisticated pipelines, with multiple stages, in order to produce story kernels, story concepts, the story architecture, each narrative page, etc. Now I want you to research online and reason about what would be the proper pipeline for a chat functionality inside our app that would include the following features: -A one-on-one chat with an already decomposed character. -A physical context for the chat should be required (time of the day, physical location, etc.) -Probably we'd need a different context for what is the recent history leading up to this chat. -The chat pipeline should include the previous messages of the chat if there are any. -The character's response could allow not only speech but also some narrative physical action. Your deliverables should be what you believe would be the specific pipeline for this chat functionality, including the prompt details and the LLM output schemas. I've provided for reference the prompt docs for actual LLM stages we use in our app."

## ChatGPT's response

My take: build this as a sibling pipeline, not a shortcut through the page writer.

Your current architecture already proves the right pattern: separate planning from continuity curation, separate prose generation from state extraction, and keep character intelligence explicit. Your Character Decomposer already gives you the immutable layer chat needs—speech fingerprint, knowledge boundaries, false beliefs, secrets kept, decision pattern, objectives, and intentions—but it explicitly operates on a single character in isolation and is contextualized later. So chat cannot be “decomposed character + transcript.” It needs a second, branch-local current-state layer before generation.

The page pipeline also shows the right structural split: Page Planner sets scene intent, the Story Bible curates relevant context, the Scene Blueprint handles paragraph-level structure, the Writer generates prose, and NPC Intelligence extracts relationship and knowledge shifts. For chat, the right move is to keep that separation of concerns but compress it to the scale of a single turn instead of a full page. Do not reuse the opening/continuation writer prompt wholesale: those prompts are explicitly built for second-person scene prose and paragraph flow, which is the wrong output mode for a turn-bounded chat UI.

The outside research points in the same direction. CharacterGPT reports better response accuracy when character traits are structured rather than left unstructured; Generative Agents grounds believable behavior in stored experiences, reflection, and dynamic retrieval; recent NPC-dialogue work explicitly separates conversational memory from world-knowledge memory; and official API guidance distinguishes tool/function calling for system actions from structured schemas for model outputs, while recommending trimming/compression for long-running conversations instead of dragging the full transcript forever.

One thing missing from your feature list: you also need an interlocutor card. Even in a one-on-one chat, the character needs to know who they believe they are talking to, what relationship already exists, and what facts about that person are already established. Without that, the NPC’s behavior will drift.

### Non-negotiables

No physical context, no chat. Otherwise you do not have a character in a world; you have a persona bot.

No lead-in context, no serious session. The recent history leading up to the chat is a different memory layer from the chat transcript itself. The first explains why these two are here now; the second records what they say and do once the conversation starts.

Minor embodied beats belong inside chat. Scene-sized action does not. If the character leaves, attacks, introduces new actors, or materially changes the situation beyond a conversational beat, hand off back to your normal scene pipeline.

### Required runtime contract

I would require something like this before the first turn:

{
  "chatMode": "SANDBOX",
  "targetCharacterId": "{{character id}}",
  "interlocutor": {
    "displayName": "{{protagonist or user-avatar name}}",
    "roleInWorld": "PROTAGONIST",
    "currentState": "{{brief current condition}}",
    "relationshipLabel": "{{how the target character relates to them}}",
    "factsCharacterAlreadyKnows": ["{{fact}}"]
  },
  "physicalContext": {
    "location": "{{required}}",
    "microLocation": "{{required}}",
    "timeOfDay": "LATE_NIGHT",
    "dateOrStoryTime": "{{optional but useful}}",
    "privacy": "SEMI_PRIVATE",
    "distanceBand": "ARM_REACH",
    "characterActivity": "{{required}}",
    "interactableObjects": ["{{object}}"],
    "ambientConditions": ["{{condition}}"],
    "hardConstraints": ["{{constraint}}"]
  },
  "leadInContext": {
    "leadInSummary": "{{required}}",
    "recentEvents": ["{{event}}"],
    "whyNow": "{{required}}",
    "stakesNow": ["{{stake}}"],
    "unresolvedPressures": ["{{pressure}}"]
  },
  "chatMemory": {
    "rollingSummary": "{{older turns compressed}}",
    "recentRawTurns": ["{{last 6-12 turns, structured}}"],
    "salientRetrievedMemories": ["{{retrieved memory}}"]
  },
  "latestUserMessage": "{{current turn input}}"
}

The extra fields beyond time/location matter. Privacy, distance, current activity, and interactable objects are what make physical action blocks believable instead of generic.

### The pipeline

#### 0. Hydrator / Memory Retriever

Deterministic, every turn.

This stage should load four separate things:

1. Immutable character profile from the decomposer.
2. Dynamic branch-local character state.
3. Physical/lead-in session state.
4. Memory from two distinct stores:
4.1. conversational memory
4.2. world/branch knowledge memory

I would retrieve from those memory stores independently, not as one blob. Recent NPC-dialogue work explicitly separates conversational memory from world-knowledge memory, and that maps perfectly to your need to keep “what happened before the chat” separate from “what has been said in the chat.” For retrieval ranking, I would use relevance + recency + dramatic importance, following the generative-agent pattern.

Use tool/function calls for this hydration layer and structured schemas for the LLM stages. Official docs make that distinction explicit. If you use OpenAI specifically, a Conversation or previous_response_id can hold thread state, but still keep your own rolling summary and retrieval layer. Also keep static prompt prefixes—system instructions, content policy, character sheet—at the front, and put dynamic state and latest message at the end so prefix caching can hit.

#### 1. Chat Bible Curator

Runs on session start, on physical-context change, after major state change, or when the updater asks for a refresh.

This is your chat analogue to the Story Bible. It should be compact and authoritative.

System prompt should say:

You are curating an authoritative brief for a one-on-one in-world chat.
Physical context is mandatory and authoritative.
Separate permanent profile, current state, and conversation memory.
Preserve knowledge boundaries, false beliefs, and secrets.
State why this conversation is happening now.
Surface what the character wants, what they fear, what they will protect, and what pressure is active.
Compress aggressively for the next 1–3 turns only.
Do not write dialogue.

User prompt sections should be:

TARGET CHARACTER DECOMPOSITION
TARGET CHARACTER CURRENT STATE
INTERLOCUTOR CARD
RELATIONSHIP STATE
PHYSICAL CONTEXT
PRE-CHAT LEAD-IN
SALIENT RETRIEVED MEMORIES
OLDER CHAT SUMMARY
RECENT CHAT TURNS

Response shape:

{
  "sessionPremise": "{{why these two are talking here and now}}",
  "physicalReality": {
    "location": "{{room / area}}",
    "microLocation": "{{exact spot within location}}",
    "timeOfDay": "LATE_NIGHT",
    "dateOrStoryTime": "{{optional time anchor}}",
    "privacy": "SEMI_PRIVATE",
    "distanceBand": "ARM_REACH",
    "characterActivity": "{{what the character is doing as the turn opens}}",
    "interactableObjects": ["{{object}}"],
    "ambientConditions": ["{{condition}}"],
    "hardConstraints": ["{{constraint}}"]
  },
  "preChatMomentum": {
    "leadInSummary": "{{brief causal setup}}",
    "recentEvents": ["{{event}}"],
    "whyNow": "{{why the conversation is happening now}}",
    "stakesNow": ["{{stake}}"],
    "unresolvedPressures": ["{{pressure}}"]
  },
  "characterNow": {
    "currentObjective": "{{what the character wants right now}}",
    "immediateNeedFromConversation": "{{what they want from this talk}}",
    "emotionalState": "{{current feeling}}",
    "willingnessToEngage": "GUARDED",
    "topicsToAdvance": ["{{topic}}"],
    "topicsToProtect": ["{{topic}}"]
  },
  "relationshipNow": {
    "dynamic": "{{label}}",
    "valence": 0,
    "tension": 0,
    "leverage": "{{who currently has what leverage}}",
    "whatCharacterBelievesAboutInterlocutor": ["{{belief}}"]
  },
  "knowledgeNow": {
    "knownFacts": ["{{fact}}"],
    "suspicions": ["{{suspicion}}"],
    "falseBeliefs": ["{{false belief}}"],
    "secretsKept": ["{{secret}}"],
    "knowledgeBoundaries": ["{{things the character does not know}}"]
  },
  "conversationNow": {
    "rollingSummary": "{{older conversation summary}}",
    "activeThreads": ["{{thread}}"],
    "commitments": ["{{commitment}}"],
    "sensitiveTopics": ["{{topic}}"],
    "lastTurnPressure": "{{pressure carrying forward}}"
  },
  "continuityGuardrails": ["{{do not contradict}}"],
  "responseConstraints": ["{{constraint for the next turn}}"]
}

This stage should consume the same kinds of context your writer already gets through storyBible.sceneWorldContext, relevantProfile, currentState, and relevantHistory, but shrink it into a one-on-one chat brief instead of a full page-context bundle.

#### 2. Turn Planner

Runs every user turn.

This is the page-planner equivalent for chat, but much smaller. Its job is not to write lines. Its job is to decide what the character is doing with the turn.

I would also put a tiny non-user-visible self-check inside this stage: What do I want? What do I know? What am I hiding? How honest am I willing to be right now? Recent role-play work found persona-aware self-reflection improves consistency, and this is the cheapest place to put that discipline.

System prompt should say:

Plan exactly one character turn.
Respect decision pattern, conflict priority, current intentions, false beliefs, secrets, and knowledge boundaries.
The turn must react to the latest user message.
Use physical reality as hard constraints.
Small observable actions are allowed; impossible or offscreen actions are not.
Decide both visible behavior and hidden conversational intent.
Preserve subtext; do not flatten everything into exposition.
Do not write final dialogue.

User prompt sections should be:

CHAT BIBLE
TARGET CHARACTER SPEECH FINGERPRINT
RECENT CHAT TURNS
LATEST USER MESSAGE

Response shape:

{
  "responseGoal": "{{what this turn is trying to accomplish}}",
  "speechAct": "DEFLECT",
  "honestyMode": "PARTIAL",
  "surfaceEmotion": "{{visible feeling}}",
  "suppressedEmotion": "{{hidden feeling}}",
  "subtext": "{{what the character is really doing beneath the words}}",
  "mustAddress": ["{{thing that must be responded to}}"],
  "mustAvoid": ["{{thing the character refuses to expose}}"],
  "blockPlan": ["ACTION", "SPEECH", "SPEECH"],
  "actionPlan": [
    {
      "kind": "OBJECT_INTERACTION",
      "text": "{{observable action}}",
      "changesPhysicalState": true
    }
  ],
  "questionBack": "{{optional question to push back on the user}}",
  "targetLength": "MEDIUM",
  "expectedImpact": {
    "relationshipDeltaHint": 0,
    "tensionDeltaHint": 1,
    "revealsSecret": false
  }
}

#### 3. Turn Writer

Runs every user turn.

This is the actual chat-generation stage.

Strong opinion: speech carries the fingerprint; action should be concise and observable. Do not let action blocks turn into mini-scene prose. They should be neutral, visual, and renderable. The page writer is for scene prose; the chat writer is for embodied turns.

Because chat is much more dialogue-heavy than your page writer, I would pass the full speech fingerprint here: catchphrases, vocabulary profile, sentence patterns, verbal tics, dialogue samples, anti-examples, discourse markers, and register shifts. Your current page prompts already pass a reduced voice bundle into the writer; chat should use the richer version because dialogue is the whole product.

System prompt should say:

Write exactly one in-world turn for the target character.
This is chat, not page prose.
ACTION is concise, visible, and non-omniscient.
SPEECH carries the character voice.
Follow the planner’s honesty mode, subtext, and action plan.
Respect physical reality, knowledge boundaries, and secrets.
Do not narrate the interlocutor’s inner thoughts.
Keep the turn bounded and reply-shaped.
Maximum 2 action blocks; maximum 3 speech blocks.

User prompt sections should be:

TARGET CHARACTER NAME
FULL SPEECH FINGERPRINT
CHAT BIBLE
TURN PLAN
RECENT CHAT TURNS
LATEST USER MESSAGE

Response shape:

{
  "blocks": [
    {
      "type": "ACTION",
      "text": "{{observable physical action}}"
    },
    {
      "type": "SPEECH",
      "delivery": "{{clipped / warm / dry / strained}}",
      "text": "{{spoken line}}"
    }
  ],
  "turnMeta": {
    "expectsReply": true,
    "endsWithQuestion": false,
    "visibleEmotion": "{{what shows on the surface}}",
    "finalPressure": "{{what this turn pressures the interlocutor to answer or do}}"
  }
}

That schema is meant to produce ACTION -> SPEECH -> SPEECH, not paragraphs.

#### 4. Chat State Updater

Runs every user turn.

This is the most important continuity stage after the writer. It is your chat equivalent of NPC Intelligence plus memory distillation.

I would not invent a brand-new relationship/knowledge format here. Reuse the same envelopes your NPC Intelligence stage already understands: relationshipShiftsDetected, knowledgeAsymmetryDetected, and dramaticIronyOpportunities. That gives you one shared continuity language for scene pages and chat turns.

System prompt should say:

Extract only state changes that actually occurred.
Separate session-local memory from branch-canon mutation.
Track relationship shifts only when meaningful.
Track knowledge asymmetry: what changed in who knows what, what false beliefs remain, what secrets moved.
Track commitments, threats, opened questions, resolved questions.
Track physical changes only if shown.
Produce memory candidates worth retrieving later.
Signal when chat should hand off to the scene pipeline.

User prompt sections should be:

CHAT MODE
PRE-TURN CHAT BIBLE
LATEST USER MESSAGE
TURN PLAN
FINAL WRITTEN TURN

Response shape:

{
  "summaryDelta": "{{one-turn factual summary}}",
  "relationshipShiftsDetected": [
    {
      "npcName": "{{target character name}}",
      "shiftDescription": "{{what changed}}",
      "suggestedValenceChange": 0,
      "suggestedNewDynamic": ""
    }
  ],
  "knowledgeAsymmetryDetected": [
    {
      "characterName": "{{character or interlocutor name}}",
      "knownFacts": ["{{fact}}"],
      "falseBeliefs": ["{{false belief}}"],
      "secrets": ["{{secret}}"]
    }
  ],
  "dramaticIronyOpportunities": ["{{opportunity}}"],
  "conversationUpdate": {
    "commitmentsMade": ["{{commitment}}"],
    "threatsMade": ["{{threat}}"],
    "questionsOpened": ["{{question}}"],
    "questionsResolved": ["{{question}}"],
    "sensitiveTopics": ["{{topic}}"]
  },
  "physicalStateUpdate": {
    "locationChanged": false,
    "newMicroLocation": "",
    "distanceBand": "",
    "poseChange": "",
    "objectStateChanges": ["{{change}}"]
  },
  "memoryCandidates": [
    {
      "text": "{{memory worth retrieving later}}",
      "importance": "HIGH",
      "tags": ["{{tag}}"]
    }
  ],
  "persistScope": "SESSION_ONLY",
  "modeTransition": {
    "shouldExitChat": false,
    "targetMode": "CHAT",
    "reason": ""
  },
  "shouldRefreshChatBible": false
}

When modeTransition.shouldExitChat becomes true, hand back to your normal page pipeline. That is the line between “embodied chat” and “this has become a scene.”

### What I would do with memory

Keep three separate stores:

Immutable character profile: decomposed character.
World/branch memory: story facts, recent events, relationship state, knowledge asymmetry, current objectives.
Conversation memory: rolling summary, recent raw turns, salient memories from prior chats.

Do not jam all three into one prompt blob. The outside NPC-memory work is explicit about separating conversational memory from world knowledge, and your own architecture already separates permanent profile from branch-specific state.

For long sessions, keep the last 6–12 raw turns plus a rolling summary. Do not keep the full transcript forever. The point of the summary is not “sentiment.” It is commitments, lies, confessions, unresolved questions, leverage shifts, and exact factual disclosures. OpenAI’s context-engineering guidance is blunt that uncurated long context hurts coherence, tool accuracy, latency, and cost, and that trimming/compression are practical fixes.

### Sandbox vs canon

I would ship this with SANDBOX by default.

That means:

the chat writes back to conversation memory,
relationship/knowledge deltas can be stored session-locally,
branch canon is not mutated unless the session is explicitly canonical.

Then the exact same updater output can set persistScope = BRANCH_CANON for in-story chats you do want to matter. That keeps casual “talk to the character” sessions from silently mutating the actual branch.

### How this maps to your existing system

This is the clean mapping:

Chat Bible Curator = your Story Bible / Lorekeeper equivalent.
Turn Planner = Page Planner lite.
Turn Writer = Writer, but chat-mode instead of second-person scene-mode.
Chat State Updater = NPC Intelligence + memory distillation.
Scene handoff = back to Page Planner / Scene Blueprint / Writer when the interaction stops being a chat and becomes a scene.

That is why I would not reuse the full Scene Blueprint stage per turn. Your blueprint prompt is explicitly for paragraph-level scene architecture with multiple units and paragraph weights; that is right for pages and wrong for chat. The correct replacement is a tiny turn planner with an action/speech block plan.

So the proper pipeline, in one line, is:

Hydrator/Retriever → Chat Bible Curator → Turn Planner → Turn Writer → Chat State Updater → persist / refresh / optional scene handoff

That is the version I actually believe will hold up in production.

The next sensible step would be turning these into concrete TypeScript/Zod schemas and prompt files that mirror the structure of your current prompt docs.