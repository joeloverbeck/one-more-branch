import type { ChatSceneContext } from '../../models/chat/index.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import type { ChatGenerationContext } from './chat-generation-context.js';
import { buildChatSceneContextMessages } from '../prompts/chat/chat-scene-context-prompt.js';
import { buildLenientSchema, withGrammarFallback } from '../structured-output-fallback.js';
import {
  CHAT_SCENE_CONTEXT_SCHEMA,
  parseChatSceneContextResponse,
} from '../schemas/chat-scene-context-schema.js';

export interface ChatSceneContextGenerationResult {
  readonly sceneContext: ChatSceneContext;
  readonly rawResponse: string;
}

export async function generateChatSceneContext(
  context: ChatGenerationContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatSceneContextGenerationResult> {
  const messages = buildChatSceneContextMessages(context);
  const result = await withGrammarFallback(
    () =>
      runLlmStage({
        stageModel: 'chatSceneContext',
        promptType: 'chatSceneContext',
        apiKey,
        options,
        schema: CHAT_SCENE_CONTEXT_SCHEMA,
        messages,
        parseResponse: parseChatSceneContextResponse,
      }),
    () =>
      runLlmStage({
        stageModel: 'chatSceneContext',
        promptType: 'chatSceneContext',
        apiKey,
        options,
        schema: buildLenientSchema(CHAT_SCENE_CONTEXT_SCHEMA),
        messages,
        parseResponse: parseChatSceneContextResponse,
      })
  );

  return {
    sceneContext: result.parsed,
    rawResponse: result.rawResponse,
  };
}
