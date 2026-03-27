# CHACHASYS-001: Chat Data Models

**Status**: COMPLETED
**Priority**: HIGH
**Effort**: Medium
**Engine Changes**: None
**Deps**: None (greenfield)

## Problem

The chat system needs typed data models for all chat entities: sessions, turns, blocks, bible output, planner output, state updates, rolling summaries, and all associated enums/literal types. These models are the foundation every other CHACHASYS ticket depends on.

## Assumption Reassessment (2026-03-27)

1. `src/models/chat/` directory does not exist yet — confirmed via glob.
2. Existing model patterns use `readonly` interfaces, `readonly` arrays, and exported canonical value sets for reusable literal domains (for example `*_VALUES` constants in `src/models/story-kernel.ts`, `src/models/content-taxonomy.ts`, and `src/models/character-enums.ts`) — follow that pattern instead of introducing bare string unions with no shared source of truth.
3. No existing chat-specific model directory or reusable chat entity contracts exist in `src/models/` yet.
4. The repo already relies on both domain-local barrels (for example `src/models/state/index.ts`) and the root `src/models/index.ts` barrel, so adding chat models cleanly requires wiring both barrels.
5. Pure type-only model files cannot meaningfully satisfy "invalid literal rejects at compile time" through Jest runtime assertions alone in this repo; that guarantee must be enforced through `npm run typecheck`, while Jest should cover exported runtime constants and barrel wiring.

## Architecture Check

1. Dedicated `src/models/chat/` directory mirrors existing `src/models/state/` pattern: one file per domain concept plus a local barrel.
2. Literal domains should expose canonical exported `*_VALUES` arrays and derive their types from those arrays where practical. This avoids duplicated string sets across future validators, schemas, and prompts.
3. All interfaces use `readonly` properties and `readonly` arrays.
4. The root `src/models/index.ts` barrel should re-export the chat barrel so downstream feature code can consume the new domain consistently with the rest of the repo.

## What to Change

### 1. Create `src/models/chat/chat-session.ts`

Define:
- `ChatSession` interface (id, createdAt, updatedAt, targetCharacterId, interlocutorCharacterId, targetCharacterName, interlocutorCharacterName, physicalContext, leadInContext, chatBible, turnCount, rollingSummary, relationshipState, knowledgeState)
- `ChatPhysicalContext` interface (location, microLocation, timeOfDay, privacy, distanceBand, characterActivity, interactableObjects, ambientConditions)
- `TIME_OF_DAY_VALUES` constant and `TimeOfDay` type derived from it (7 values)
- `PRIVACY_VALUES` constant and `Privacy` type derived from it (3 values)
- `DISTANCE_BAND_VALUES` constant and `DistanceBand` type derived from it (5 values)
- `ChatLeadInContext` interface (leadInSummary, recentEvents, whyNow)
- `ChatRelationshipState` interface (dynamic, valence, tension, leverage)
- `ChatKnowledgeState` interface (knownFacts, suspicions, falseBeliefs, secretsRevealed)
- `ChatSessionSummary` interface (for list display: id, targetCharacterName, interlocutorCharacterName, turnCount, updatedAt, location)

### 2. Create `src/models/chat/chat-turn.ts`

Define:
- `ChatTurn` interface (turnNumber, speaker, blocks, rawText, turnMeta, plannerOutput, stateUpdate, timestamp)
- `ChatBlock` interface (type, delivery, text)
- `TurnMeta` interface (expectsReply, endsWithQuestion, visibleEmotion, finalPressure)
- `CHAT_SPEAKER_VALUES` constant and `ChatSpeaker` type derived from it
- `CHAT_BLOCK_TYPE_VALUES` constant and `ChatBlockType` type derived from it

### 3. Create `src/models/chat/chat-bible.ts`

Define:
- `ChatBible` interface (sessionPremise, physicalReality, preChatMomentum, characterNow, relationshipNow, knowledgeNow, conversationNow, continuityGuardrails, responseConstraints)
- `WILLINGNESS_TO_ENGAGE_VALUES` constant and `WillingnessToEngage` type derived from it (5 values)
- All nested sub-interfaces as specified in the spec

### 4. Create `src/models/chat/chat-turn-plan.ts`

Define:
- `TurnPlannerOutput` interface (internalSelfCheck, responseGoal, speechAct, honestyMode, surfaceEmotion, suppressedEmotion, subtext, mustAddress, mustAvoid, blockPlan, actionPlan, questionBack, targetLength, expectedImpact)
- `SPEECH_ACT_VALUES` constant and `SpeechAct` type derived from it (10 values)
- `HONESTY_MODE_VALUES` constant and `HonestyMode` type derived from it (4 values)
- `ActionPlanItem` interface (kind, text, changesPhysicalState)
- `ACTION_PLAN_KIND_VALUES` constant and `ActionPlanKind` type derived from it (5 values)
- `TURN_TARGET_LENGTH_VALUES` constant and `TurnTargetLength` type derived from it (3 values)

### 5. Create `src/models/chat/chat-state-update.ts`

Define:
- `ChatStateUpdate` interface (summaryDelta, relationshipShifts, knowledgeChanges, conversationUpdate, physicalStateUpdate, shouldRefreshChatBible, shouldTriggerSummary)
- All nested sub-interfaces for relationship shifts, knowledge changes, conversation updates, physical state updates

### 6. Create `src/models/chat/chat-rolling-summary.ts`

Define:
- `RollingSummaryOutput` interface (compressedSummary, keyCommitments, keyRevelations, unresolvedQuestions, leverageShifts, emotionalTrajectory)

### 7. Create `src/models/chat/index.ts`

Re-export all public chat contracts and constants from the above files.

### 8. Update `src/models/index.ts`

Re-export the chat barrel so chat models participate in the root models surface.

## Files to Touch

- `src/models/chat/chat-session.ts` (new)
- `src/models/chat/chat-turn.ts` (new)
- `src/models/chat/chat-bible.ts` (new)
- `src/models/chat/chat-turn-plan.ts` (new)
- `src/models/chat/chat-state-update.ts` (new)
- `src/models/chat/chat-rolling-summary.ts` (new)
- `src/models/chat/index.ts` (new)
- `src/models/index.ts` (update)

## Out of Scope

- Persistence (CHACHASYS-002)
- LLM schemas or prompts (CHACHASYS-005 through CHACHASYS-009)
- Type guards or runtime validation (CHACHASYS-002)
- Any server, route, or UI code
- Modifying unrelated existing model files beyond the required root barrel export

## Acceptance Criteria

### Tests That Must Pass

1. Unit test: the chat barrel and root models barrel expose the expected runtime constants
2. Typecheck: representative fixtures can be typed against every new public interface and value-set-derived type
3. Relevant unit tests and lint pass for the new model surface

### Invariants

1. All interface properties are `readonly`
2. All arrays use `readonly` modifier (`readonly string[]`, `readonly ChatBlock[]`)
3. No `any` types
4. No runtime logic in model files — pure type definitions only
5. Chat-local barrel re-exports every public chat contract and constant
6. Root models barrel re-exports the chat barrel surface
7. Literal-domain string values are defined once via exported canonical value arrays, not duplicated across files

## Test Plan

### New/Modified Tests

1. `test/unit/models/chat/chat-models.test.ts` — typed fixture coverage for the new interfaces and runtime assertions for canonical value sets plus the chat barrel
2. `test/unit/models/index.test.ts` — root models barrel assertions for representative chat exports

### Commands

1. `npm run typecheck`
2. `npm run test:unit -- test/unit/models/chat/chat-models.test.ts test/unit/models/index.test.ts`
3. `npm run lint`

## Outcome

- Completed: 2026-03-27
- Actually changed: added the new `src/models/chat/` domain contracts, canonical chat literal `*_VALUES` constants, the chat barrel, and root `src/models/index.ts` re-exports; added focused chat model tests and root barrel coverage.
- Deviations from original plan: updated the design to follow the repo's established canonical value-set pattern instead of bare duplicated string unions, wired the root models barrel because the repo already treats it as part of the public model surface, and typed `newDistanceBand` against `DistanceBand | null` instead of a loose `string | null`.
- Verification: `npm run typecheck`, `npm run test:unit -- test/unit/models/chat/chat-models.test.ts test/unit/models/index.test.ts` (this expanded to the full unit suite under the repo's Jest script and passed), and `npm run lint`.
