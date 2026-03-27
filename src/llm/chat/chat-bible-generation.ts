import type { GenerationOptions } from '../generation-pipeline-types.js';
import type {
  ChatBible,
  ChatKnowledgeState,
  ChatLeadInContext,
  ChatPhysicalContext,
  ChatRelationshipState,
  ChatTurn,
  RollingSummaryOutput,
} from '../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatBibleMessages } from '../prompts/chat/chat-bible-prompt.js';
import {
  CHAT_BIBLE_SCHEMA,
  parseChatBibleResponse,
} from '../schemas/chat-bible-schema.js';

export interface ChatBibleContext {
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacter: StandaloneDecomposedCharacter;
  readonly decomposedWorld: DecomposedWorld;
  readonly relationshipState: ChatRelationshipState;
  readonly knowledgeState: ChatKnowledgeState;
  readonly physicalContext: ChatPhysicalContext;
  readonly leadInContext: ChatLeadInContext;
  readonly rollingSummary: RollingSummaryOutput | null;
  readonly recentTurns: readonly ChatTurn[];
}

export interface ChatBibleGenerationResult {
  readonly chatBible: ChatBible;
  readonly rawResponse: string;
}

export async function generateChatBible(
  context: ChatBibleContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatBibleGenerationResult> {
  const messages = buildChatBibleMessages(context);
  const result = await runLlmStage({
    stageModel: 'chatBible',
    promptType: 'chatBible',
    apiKey,
    options,
    schema: CHAT_BIBLE_SCHEMA,
    messages,
    parseResponse: parseChatBibleResponse,
  });

  return {
    chatBible: result.parsed,
    rawResponse: result.rawResponse,
  };
}
