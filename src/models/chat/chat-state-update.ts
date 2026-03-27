import type { DistanceBand } from './chat-session.js';

export interface ChatRelationshipShift {
  readonly shiftDescription: string;
  readonly suggestedValenceChange: number;
  readonly suggestedTensionChange: number;
  readonly suggestedNewDynamic: string | null;
}

export interface ChatKnowledgeChanges {
  readonly newKnownFacts: readonly string[];
  readonly newSuspicions: readonly string[];
  readonly falseBeliefsCorrected: readonly string[];
  readonly secretsRevealed: readonly string[];
}

export interface ChatConversationUpdate {
  readonly commitmentsMade: readonly string[];
  readonly threatsMade: readonly string[];
  readonly questionsOpened: readonly string[];
  readonly questionsResolved: readonly string[];
}

export interface ChatPhysicalStateUpdate {
  readonly locationChanged: boolean;
  readonly newLocation: string | null;
  readonly newMicroLocation: string | null;
  readonly newDistanceBand: DistanceBand | null;
  readonly objectStateChanges: readonly string[];
}

export interface ChatStateUpdate {
  readonly summaryDelta: string;
  readonly relationshipShifts: readonly ChatRelationshipShift[];
  readonly knowledgeChanges: ChatKnowledgeChanges;
  readonly conversationUpdate: ChatConversationUpdate;
  readonly physicalStateUpdate: ChatPhysicalStateUpdate;
  readonly shouldRefreshChatBible: boolean;
  readonly shouldTriggerSummary: boolean;
}
