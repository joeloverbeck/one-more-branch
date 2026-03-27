import type { ChatBible } from './chat-bible.js';

export const TIME_OF_DAY_VALUES = [
  'DAWN',
  'MORNING',
  'MIDDAY',
  'AFTERNOON',
  'DUSK',
  'EVENING',
  'LATE_NIGHT',
] as const;

export type TimeOfDay = (typeof TIME_OF_DAY_VALUES)[number];

export const PRIVACY_VALUES = ['PRIVATE', 'SEMI_PRIVATE', 'PUBLIC'] as const;

export type Privacy = (typeof PRIVACY_VALUES)[number];

export const DISTANCE_BAND_VALUES = [
  'INTIMATE',
  'ARM_REACH',
  'CONVERSATIONAL',
  'ACROSS_ROOM',
  'DISTANT',
] as const;

export type DistanceBand = (typeof DISTANCE_BAND_VALUES)[number];

export interface ChatPhysicalContext {
  readonly location: string;
  readonly microLocation: string;
  readonly timeOfDay: TimeOfDay;
  readonly privacy: Privacy;
  readonly distanceBand: DistanceBand;
  readonly characterActivity: string;
  readonly interactableObjects: readonly string[];
  readonly ambientConditions: readonly string[];
}

export interface ChatLeadInContext {
  readonly leadInSummary: string;
  readonly recentEvents: readonly string[];
  readonly whyNow: string;
}

export interface ChatRelationshipState {
  readonly dynamic: string;
  readonly valence: number;
  readonly tension: number;
  readonly leverage: string;
}

export interface ChatKnowledgeState {
  readonly knownFacts: readonly string[];
  readonly suspicions: readonly string[];
  readonly falseBeliefs: readonly string[];
  readonly secretsRevealed: readonly string[];
}

export interface ChatSession {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly targetCharacterId: string;
  readonly interlocutorCharacterId: string;
  readonly targetCharacterName: string;
  readonly interlocutorCharacterName: string;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
  readonly chatBible: ChatBible | null;
  readonly turnCount: number;
  readonly rollingSummary: string | null;
  readonly relationshipState: ChatRelationshipState;
  readonly knowledgeState: ChatKnowledgeState;
}

export interface ChatSessionSummary {
  readonly id: string;
  readonly targetCharacterName: string;
  readonly interlocutorCharacterName: string;
  readonly turnCount: number;
  readonly updatedAt: string;
  readonly location: string;
}
