import type { ChatSceneContext } from '../../models/chat/index.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import type { ChatBibleContext } from './chat-bible-context.js';
import { buildChatSceneContextMessages } from '../prompts/chat/chat-scene-context-prompt.js';
import {
  CHAT_SCENE_CONTEXT_SCHEMA,
  parseChatSceneContextResponse,
} from '../schemas/chat-scene-context-schema.js';

export interface ChatSceneContextGenerationResult {
  readonly sceneContext: ChatSceneContext;
  readonly rawResponse: string;
}

export async function generateChatSceneContext(
  context: ChatBibleContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatSceneContextGenerationResult> {
  const messages = buildChatSceneContextMessages(context);
  const result = await runLlmStage({
    stageModel: 'chatSceneContext',
    promptType: 'chatSceneContext',
    apiKey,
    options,
    schema: CHAT_SCENE_CONTEXT_SCHEMA,
    messages,
    parseResponse: parseChatSceneContextResponse,
  });

  return {
    sceneContext: result.parsed,
    rawResponse: result.rawResponse,
  };
}
