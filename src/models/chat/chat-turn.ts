import type { ChatBibleRelationshipNow } from './chat-bible.js';
import type { ChatStateUpdate } from './chat-state-update.js';
import type { TurnPlannerOutput } from './chat-turn-plan.js';

export const CHAT_SPEAKER_VALUES = ['USER', 'CHARACTER'] as const;

export type ChatSpeaker = (typeof CHAT_SPEAKER_VALUES)[number];

export const CHAT_BLOCK_TYPE_VALUES = ['ACTION', 'SPEECH'] as const;

export type ChatBlockType = (typeof CHAT_BLOCK_TYPE_VALUES)[number];

export interface ChatBlock {
  readonly type: ChatBlockType;
  readonly delivery?: string;
  readonly text: string;
}

export interface TurnMeta {
  readonly expectsReply: boolean;
  readonly endsWithQuestion: boolean;
  readonly visibleEmotion: string;
  readonly finalPressure: string | null;
}

export type ChatRelationshipSnapshot = ChatBibleRelationshipNow;

export interface ChatTurn {
  readonly turnNumber: number;
  readonly speaker: ChatSpeaker;
  readonly blocks: readonly ChatBlock[];
  readonly rawText?: string;
  readonly turnMeta?: TurnMeta;
  readonly plannerOutput?: TurnPlannerOutput;
  readonly stateUpdate?: ChatStateUpdate;
  readonly relationshipSnapshot?: ChatRelationshipSnapshot;
  readonly timestamp: string;
}
