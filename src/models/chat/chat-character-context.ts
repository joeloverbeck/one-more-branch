import type {
  ChatBibleCharacterNow,
  ChatBibleKnowledgeNow,
  ChatBibleRelationshipNow,
} from './chat-bible.js';

export interface ChatCharacterContext {
  readonly characterNow: ChatBibleCharacterNow;
  readonly relationshipNow: ChatBibleRelationshipNow;
  readonly knowledgeNow: ChatBibleKnowledgeNow;
  readonly continuityGuardrails: readonly string[];
  readonly responseConstraints: readonly string[];
}
