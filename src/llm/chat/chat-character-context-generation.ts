import type { ChatCharacterContext, ChatSceneContext } from '../../models/chat/index.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatCharacterContextMessages } from '../prompts/chat/chat-character-context-prompt.js';
import {
  CHAT_CHARACTER_CONTEXT_SCHEMA,
  parseChatCharacterContextResponse,
} from '../schemas/chat-character-context-schema.js';
import type { ChatBibleContext } from './chat-bible-context.js';

export interface ChatCharacterContextGenerationResult {
  readonly characterContext: ChatCharacterContext;
  readonly rawResponse: string;
}

export async function generateChatCharacterContext(
  context: ChatBibleContext,
  sceneContext: ChatSceneContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatCharacterContextGenerationResult> {
  const messages = buildChatCharacterContextMessages(context, sceneContext);
  const result = await runLlmStage({
    stageModel: 'chatCharacterContext',
    promptType: 'chatCharacterContext',
    apiKey,
    options,
    schema: CHAT_CHARACTER_CONTEXT_SCHEMA,
    messages,
    parseResponse: parseChatCharacterContextResponse,
  });

  return {
    characterContext: result.parsed,
    rawResponse: result.rawResponse,
  };
}
