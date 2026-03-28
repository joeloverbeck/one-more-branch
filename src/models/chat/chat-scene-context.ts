import type {
  ChatBibleConversationNow,
  ChatBiblePreChatMomentum,
} from './chat-bible.js';
import type { ChatPhysicalContext } from './chat-session.js';

export interface ChatSceneContext {
  readonly sessionPremise: string;
  readonly physicalReality: ChatPhysicalContext;
  readonly preChatMomentum: ChatBiblePreChatMomentum;
  readonly conversationNow: ChatBibleConversationNow;
}
