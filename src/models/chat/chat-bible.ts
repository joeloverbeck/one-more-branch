import type {
  ChatKnowledgeState,
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatRelationshipState,
} from './chat-session.js';

export const WILLINGNESS_TO_ENGAGE_VALUES = [
  'EAGER',
  'OPEN',
  'GUARDED',
  'RESISTANT',
  'HOSTILE',
] as const;

export type WillingnessToEngage = (typeof WILLINGNESS_TO_ENGAGE_VALUES)[number];

export interface ChatBiblePreChatMomentum extends ChatLeadInContext {
  readonly stakesNow: readonly string[];
  readonly unresolvedPressures: readonly string[];
}

export interface ChatBibleCharacterNow {
  readonly currentObjective: string;
  readonly immediateNeedFromConversation: string;
  readonly emotionalState: string;
  readonly willingnessToEngage: WillingnessToEngage;
  readonly topicsToAdvance: readonly string[];
  readonly topicsToProtect: readonly string[];
}

export interface ChatBibleRelationshipNow extends ChatRelationshipState {
  readonly whatCharacterBelievesAboutInterlocutor: readonly string[];
}

export interface ChatBibleKnowledgeNow extends ChatKnowledgeState {
  readonly secretsKept: readonly string[];
  readonly knowledgeBoundaries: readonly string[];
}

export interface ChatBibleConversationNow {
  readonly rollingSummary: string | null;
  readonly activeThreads: readonly string[];
  readonly commitments: readonly string[];
  readonly sensitiveTopics: readonly string[];
  readonly lastTurnPressure: string | null;
}

export interface ChatBible {
  readonly sessionPremise: string;
  readonly physicalReality: ChatPhysicalContext;
  readonly preChatMomentum: ChatBiblePreChatMomentum;
  readonly characterNow: ChatBibleCharacterNow;
  readonly relationshipNow: ChatBibleRelationshipNow;
  readonly knowledgeNow: ChatBibleKnowledgeNow;
  readonly conversationNow: ChatBibleConversationNow;
  readonly continuityGuardrails: readonly string[];
  readonly responseConstraints: readonly string[];
}
