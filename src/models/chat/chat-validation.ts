import type {
  ChatKnowledgeState,
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatRelationshipState,
  ChatSession,
} from './chat-session.js';
import {
  DISTANCE_BAND_VALUES,
  PRIVACY_VALUES,
  TIME_OF_DAY_VALUES,
} from './chat-session.js';
import type { ChatBible, ChatBibleCharacterNow, ChatBibleConversationNow, ChatBibleKnowledgeNow, ChatBiblePreChatMomentum, ChatBibleRelationshipNow } from './chat-bible.js';
import { WILLINGNESS_TO_ENGAGE_VALUES } from './chat-bible.js';
import type {
  ActionPlanItem,
  TurnPlannerExpectedImpact,
  TurnPlannerInternalSelfCheck,
  TurnPlannerOutput,
} from './chat-turn-plan.js';
import {
  ACTION_PLAN_KIND_VALUES,
  HONESTY_MODE_VALUES,
  SPEECH_ACT_VALUES,
  TURN_TARGET_LENGTH_VALUES,
} from './chat-turn-plan.js';
import type {
  ChatBlock,
  ChatSpeaker,
  ChatTurn,
  TurnMeta,
} from './chat-turn.js';
import { CHAT_BLOCK_TYPE_VALUES, CHAT_SPEAKER_VALUES } from './chat-turn.js';
import type {
  ChatConversationUpdate,
  ChatKnowledgeChanges,
  ChatPhysicalStateUpdate,
  ChatRelationshipShift,
  ChatStateUpdate,
} from './chat-state-update.js';
import type { RollingSummaryOutput } from './chat-rolling-summary.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isEnumValue<TValue extends string>(
  value: unknown,
  candidates: readonly TValue[]
): value is TValue {
  return typeof value === 'string' && candidates.includes(value as TValue);
}

export function isChatPhysicalContext(value: unknown): value is ChatPhysicalContext {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['location']) &&
    isString(value['microLocation']) &&
    isEnumValue(value['timeOfDay'], TIME_OF_DAY_VALUES) &&
    isEnumValue(value['privacy'], PRIVACY_VALUES) &&
    isEnumValue(value['distanceBand'], DISTANCE_BAND_VALUES) &&
    isString(value['characterActivity']) &&
    isStringArray(value['interactableObjects']) &&
    isStringArray(value['ambientConditions'])
  );
}

export function isChatLeadInContext(value: unknown): value is ChatLeadInContext {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['leadInSummary']) &&
    isStringArray(value['recentEvents']) &&
    isString(value['whyNow'])
  );
}

export function isChatRelationshipState(value: unknown): value is ChatRelationshipState {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['dynamic']) &&
    isFiniteNumber(value['valence']) &&
    isFiniteNumber(value['tension']) &&
    isString(value['leverage'])
  );
}

export function isChatKnowledgeState(value: unknown): value is ChatKnowledgeState {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isStringArray(value['knownFacts']) &&
    isStringArray(value['suspicions']) &&
    isStringArray(value['falseBeliefs']) &&
    isStringArray(value['secretsRevealed'])
  );
}

function isChatBiblePreChatMomentum(value: unknown): value is ChatBiblePreChatMomentum {
  if (!isChatLeadInContext(value)) {
    return false;
  }

  const record = value as unknown as Record<string, unknown>;
  return isStringArray(record['stakesNow']) && isStringArray(record['unresolvedPressures']);
}

function isChatBibleCharacterNow(value: unknown): value is ChatBibleCharacterNow {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['currentObjective']) &&
    isString(value['immediateNeedFromConversation']) &&
    isString(value['emotionalState']) &&
    isEnumValue(value['willingnessToEngage'], WILLINGNESS_TO_ENGAGE_VALUES) &&
    isStringArray(value['topicsToAdvance']) &&
    isStringArray(value['topicsToProtect'])
  );
}

function isChatBibleRelationshipNow(value: unknown): value is ChatBibleRelationshipNow {
  if (!isChatRelationshipState(value)) {
    return false;
  }

  return isStringArray(
    (value as unknown as Record<string, unknown>)['whatCharacterBelievesAboutInterlocutor']
  );
}

function isChatBibleKnowledgeNow(value: unknown): value is ChatBibleKnowledgeNow {
  if (!isChatKnowledgeState(value)) {
    return false;
  }

  const record = value as unknown as Record<string, unknown>;
  return isStringArray(record['secretsKept']) && isStringArray(record['knowledgeBoundaries']);
}

function isChatBibleConversationNow(value: unknown): value is ChatBibleConversationNow {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNullableString(value['rollingSummary']) &&
    isStringArray(value['activeThreads']) &&
    isStringArray(value['commitments']) &&
    isStringArray(value['sensitiveTopics']) &&
    isNullableString(value['lastTurnPressure'])
  );
}

export function isChatBible(value: unknown): value is ChatBible {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['sessionPremise']) &&
    isChatPhysicalContext(value['physicalReality']) &&
    isChatBiblePreChatMomentum(value['preChatMomentum']) &&
    isChatBibleCharacterNow(value['characterNow']) &&
    isChatBibleRelationshipNow(value['relationshipNow']) &&
    isChatBibleKnowledgeNow(value['knowledgeNow']) &&
    isChatBibleConversationNow(value['conversationNow']) &&
    isStringArray(value['continuityGuardrails']) &&
    isStringArray(value['responseConstraints'])
  );
}

function isTurnPlannerInternalSelfCheck(value: unknown): value is TurnPlannerInternalSelfCheck {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['whatDoIWant']) &&
    isString(value['whatDoIKnow']) &&
    isString(value['whatAmIHiding']) &&
    isString(value['howHonestAmI'])
  );
}

function isActionPlanItem(value: unknown): value is ActionPlanItem {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isEnumValue(value['kind'], ACTION_PLAN_KIND_VALUES) &&
    isString(value['text']) &&
    isBoolean(value['changesPhysicalState'])
  );
}

function isTurnPlannerExpectedImpact(value: unknown): value is TurnPlannerExpectedImpact {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isNumberInRange(value['relationshipDeltaHint'], -2, 2) &&
    isNumberInRange(value['tensionDeltaHint'], -2, 2) &&
    isBoolean(value['revealsSecret'])
  );
}

export function isChatBlock(value: unknown): value is ChatBlock {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isEnumValue(value['type'], CHAT_BLOCK_TYPE_VALUES) &&
    isString(value['text']) &&
    (value['delivery'] === undefined || isString(value['delivery']))
  );
}

export function isTurnPlannerOutput(value: unknown): value is TurnPlannerOutput {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isTurnPlannerInternalSelfCheck(value['internalSelfCheck']) &&
    isString(value['responseGoal']) &&
    isEnumValue(value['speechAct'], SPEECH_ACT_VALUES) &&
    isEnumValue(value['honestyMode'], HONESTY_MODE_VALUES) &&
    isString(value['surfaceEmotion']) &&
    isNullableString(value['suppressedEmotion']) &&
    isString(value['subtext']) &&
    isStringArray(value['mustAddress']) &&
    isStringArray(value['mustAvoid']) &&
    Array.isArray(value['blockPlan']) &&
    value['blockPlan'].every((blockType) => isEnumValue(blockType, CHAT_BLOCK_TYPE_VALUES)) &&
    Array.isArray(value['actionPlan']) &&
    value['actionPlan'].every(isActionPlanItem) &&
    isNullableString(value['questionBack']) &&
    isEnumValue(value['targetLength'], TURN_TARGET_LENGTH_VALUES) &&
    isTurnPlannerExpectedImpact(value['expectedImpact'])
  );
}

function isChatRelationshipShift(value: unknown): value is ChatRelationshipShift {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['shiftDescription']) &&
    isFiniteNumber(value['suggestedValenceChange']) &&
    isFiniteNumber(value['suggestedTensionChange']) &&
    isNullableString(value['suggestedNewDynamic'])
  );
}

function isChatKnowledgeChanges(value: unknown): value is ChatKnowledgeChanges {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isStringArray(value['newKnownFacts']) &&
    isStringArray(value['newSuspicions']) &&
    isStringArray(value['falseBeliefsCorrected']) &&
    isStringArray(value['secretsRevealed'])
  );
}

function isChatConversationUpdate(value: unknown): value is ChatConversationUpdate {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isStringArray(value['commitmentsMade']) &&
    isStringArray(value['threatsMade']) &&
    isStringArray(value['questionsOpened']) &&
    isStringArray(value['questionsResolved'])
  );
}

function isChatPhysicalStateUpdate(value: unknown): value is ChatPhysicalStateUpdate {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isBoolean(value['locationChanged']) &&
    isNullableString(value['newLocation']) &&
    isNullableString(value['newMicroLocation']) &&
    (value['newDistanceBand'] === null ||
      isEnumValue(value['newDistanceBand'], DISTANCE_BAND_VALUES)) &&
    isStringArray(value['objectStateChanges'])
  );
}

export function isChatStateUpdate(value: unknown): value is ChatStateUpdate {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['summaryDelta']) &&
    Array.isArray(value['relationshipShifts']) &&
    value['relationshipShifts'].every(isChatRelationshipShift) &&
    isChatKnowledgeChanges(value['knowledgeChanges']) &&
    isChatConversationUpdate(value['conversationUpdate']) &&
    isChatPhysicalStateUpdate(value['physicalStateUpdate']) &&
    isBoolean(value['shouldRefreshChatBible']) &&
    isBoolean(value['shouldTriggerSummary'])
  );
}

export function isTurnMeta(value: unknown): value is TurnMeta {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isBoolean(value['expectsReply']) &&
    isBoolean(value['endsWithQuestion']) &&
    isString(value['visibleEmotion']) &&
    isNullableString(value['finalPressure'])
  );
}

export function isChatTurn(value: unknown): value is ChatTurn {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    Number.isInteger(value['turnNumber']) &&
    isEnumValue(value['speaker'], CHAT_SPEAKER_VALUES) &&
    Array.isArray(value['blocks']) &&
    value['blocks'].every(isChatBlock) &&
    (value['rawText'] === undefined || isString(value['rawText'])) &&
    (value['turnMeta'] === undefined || isTurnMeta(value['turnMeta'])) &&
    (value['plannerOutput'] === undefined || isTurnPlannerOutput(value['plannerOutput'])) &&
    (value['stateUpdate'] === undefined || isChatStateUpdate(value['stateUpdate'])) &&
    isIsoDateString(value['timestamp'])
  );
}

export function isChatSession(value: unknown): value is ChatSession {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['id']) &&
    isIsoDateString(value['createdAt']) &&
    isIsoDateString(value['updatedAt']) &&
    isString(value['targetCharacterId']) &&
    isString(value['interlocutorCharacterId']) &&
    isString(value['targetCharacterName']) &&
    isString(value['interlocutorCharacterName']) &&
    isChatPhysicalContext(value['physicalContext']) &&
    isChatLeadInContext(value['leadInContext']) &&
    (value['chatBible'] === null || isChatBible(value['chatBible'])) &&
    Number.isInteger(value['turnCount']) &&
    isNullableString(value['rollingSummary']) &&
    isChatRelationshipState(value['relationshipState']) &&
    isChatKnowledgeState(value['knowledgeState'])
  );
}

export function isChatTurnArray(value: unknown): value is readonly ChatTurn[] {
  return Array.isArray(value) && value.every(isChatTurn);
}

export function isRollingSummaryOutput(value: unknown): value is RollingSummaryOutput {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    isString(value['compressedSummary']) &&
    isStringArray(value['keyCommitments']) &&
    isStringArray(value['keyRevelations']) &&
    isStringArray(value['unresolvedQuestions']) &&
    isStringArray(value['leverageShifts']) &&
    isString(value['emotionalTrajectory'])
  );
}

export function parseChatSession(value: unknown, sourcePath: string): ChatSession {
  if (!isChatSession(value)) {
    throw new Error(`Invalid chat session payload at ${sourcePath}`);
  }

  return value;
}

export function parseChatTurn(value: unknown, sourcePath: string): ChatTurn {
  if (!isChatTurn(value)) {
    throw new Error(`Invalid chat turn payload at ${sourcePath}`);
  }

  return value;
}

export function parseChatTurns(value: unknown, sourcePath: string): ChatTurn[] {
  if (!isChatTurnArray(value)) {
    throw new Error(`Invalid chat turns payload at ${sourcePath}`);
  }

  return [...value];
}

export function isChatSpeaker(value: unknown): value is ChatSpeaker {
  return isEnumValue(value, CHAT_SPEAKER_VALUES);
}
