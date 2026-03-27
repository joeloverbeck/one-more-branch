# CHACHASYS-001: Chat Data Models

**Status**: PENDING
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (greenfield)

## Problem

The chat system needs typed data models for all chat entities: sessions, turns, blocks, bible output, planner output, state updates, rolling summaries, and all associated enums/literal types. These models are the foundation every other CHACHASYS ticket depends on.

## Assumption Reassessment (2026-03-27)

1. `src/models/chat/` directory does not exist yet — confirmed via glob.
2. Existing model patterns (e.g., `src/models/state/`, `src/models/story-arc.ts`) use `readonly` interfaces with explicit types — follow the same pattern.
3. No existing chat-related types anywhere in the codebase.

## Architecture Check

1. Dedicated `src/models/chat/` directory mirrors existing `src/models/state/` pattern — one file per domain concept, barrel `index.ts` re-export.
2. All interfaces use `readonly` properties (immutability invariant from coding style rules).

## What to Change

### 1. Create `src/models/chat/chat-session.ts`

Define:
- `ChatSession` interface (id, createdAt, updatedAt, targetCharacterId, interlocutorCharacterId, targetCharacterName, interlocutorCharacterName, physicalContext, leadInContext, chatBible, turnCount, rollingSummary, relationshipState, knowledgeState)
- `ChatPhysicalContext` interface (location, microLocation, timeOfDay, privacy, distanceBand, characterActivity, interactableObjects, ambientConditions)
- `TimeOfDay` type literal union (7 values)
- `Privacy` type literal union (3 values)
- `DistanceBand` type literal union (5 values)
- `ChatLeadInContext` interface (leadInSummary, recentEvents, whyNow)
- `ChatRelationshipState` interface (dynamic, valence, tension, leverage)
- `ChatKnowledgeState` interface (knownFacts, suspicions, falseBeliefs, secretsRevealed)
- `ChatSessionSummary` interface (for list display: id, targetCharacterName, interlocutorCharacterName, turnCount, updatedAt, location)

### 2. Create `src/models/chat/chat-turn.ts`

Define:
- `ChatTurn` interface (turnNumber, speaker, blocks, rawText, turnMeta, plannerOutput, stateUpdate, timestamp)
- `ChatBlock` interface (type, delivery, text)
- `TurnMeta` interface (expectsReply, endsWithQuestion, visibleEmotion, finalPressure)
- `ChatSpeaker` type literal union ('USER' | 'CHARACTER')
- `ChatBlockType` type literal union ('ACTION' | 'SPEECH')

### 3. Create `src/models/chat/chat-bible.ts`

Define:
- `ChatBible` interface (sessionPremise, physicalReality, preChatMomentum, characterNow, relationshipNow, knowledgeNow, conversationNow, continuityGuardrails, responseConstraints)
- `WillingnessToEngage` type literal union (5 values)
- All nested sub-interfaces as specified in the spec

### 4. Create `src/models/chat/chat-turn-plan.ts`

Define:
- `TurnPlannerOutput` interface (internalSelfCheck, responseGoal, speechAct, honestyMode, surfaceEmotion, suppressedEmotion, subtext, mustAddress, mustAvoid, blockPlan, actionPlan, questionBack, targetLength, expectedImpact)
- `SpeechAct` type literal union (10 values)
- `HonestyMode` type literal union (4 values)
- `ActionPlanItem` interface (kind, text, changesPhysicalState)
- `ActionPlanKind` type literal union (5 values)
- `TurnTargetLength` type literal union (3 values)

### 5. Create `src/models/chat/chat-state-update.ts`

Define:
- `ChatStateUpdate` interface (summaryDelta, relationshipShifts, knowledgeChanges, conversationUpdate, physicalStateUpdate, shouldRefreshChatBible, shouldTriggerSummary)
- All nested sub-interfaces for relationship shifts, knowledge changes, conversation updates, physical state updates

### 6. Create `src/models/chat/chat-rolling-summary.ts`

Define:
- `RollingSummaryOutput` interface (compressedSummary, keyCommitments, keyRevelations, unresolvedQuestions, leverageShifts, emotionalTrajectory)

### 7. Create `src/models/chat/index.ts`

Re-export all types from the above files.

## Files to Touch

- `src/models/chat/chat-session.ts` (new)
- `src/models/chat/chat-turn.ts` (new)
- `src/models/chat/chat-bible.ts` (new)
- `src/models/chat/chat-turn-plan.ts` (new)
- `src/models/chat/chat-state-update.ts` (new)
- `src/models/chat/chat-rolling-summary.ts` (new)
- `src/models/chat/index.ts` (new)

## Out of Scope

- Persistence (CHACHASYS-002)
- LLM schemas or prompts (CHACHASYS-005 through CHACHASYS-009)
- Type guards or runtime validation (CHACHASYS-002)
- Any server, route, or UI code
- Modifying any existing model files

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: each interface file exports the expected types (compile-time verification via a test file that imports and uses them)
2. Unit test: literal union types reject invalid values at compile time
3. Existing suite: `npm test` passes unchanged

### Invariants

1. All interface properties are `readonly`
2. All arrays use `readonly` modifier (`readonly string[]`, `readonly ChatBlock[]`)
3. No `any` types
4. No runtime logic in model files — pure type definitions only
5. Barrel index re-exports every public type

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-models.test.ts` — compile-time type assertion tests verifying interfaces accept valid data and the barrel export provides all types

### Commands

1. `npm run typecheck`
2. `npm test`
