import type { GenerationOptions } from '../generation-pipeline-types.js';
import type { ChatBible } from '../../models/chat/index.js';
import type { ChatBibleContext } from './chat-bible-context.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatBibleMessages } from '../prompts/chat/chat-bible-prompt.js';
import {
  CHAT_BIBLE_SCHEMA,
  parseChatBibleResponse,
} from '../schemas/chat-bible-schema.js';

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
