import type { ChatBible, ChatStateUpdate, ChatTurn, TurnPlannerOutput } from '../../models/chat/index.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatStateUpdaterMessages } from '../prompts/chat/chat-state-updater-prompt.js';
import {
  CHAT_STATE_UPDATER_SCHEMA,
  parseChatStateUpdaterResponse,
} from '../schemas/chat-state-updater-schema.js';
import type { ChatWriterTurn } from './chat-writer-generation.js';

export interface ChatStateUpdaterContext {
  readonly chatBible: ChatBible;
  readonly latestUserTurn: ChatTurn;
  readonly turnPlan: TurnPlannerOutput;
  readonly writerTurn: ChatWriterTurn;
}

export interface ChatStateUpdaterGenerationResult {
  readonly stateUpdate: ChatStateUpdate;
  readonly rawResponse: string;
}

export async function generateChatStateUpdate(
  context: ChatStateUpdaterContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatStateUpdaterGenerationResult> {
  const messages = buildChatStateUpdaterMessages(context);
  const result = await runLlmStage({
    stageModel: 'chatStateUpdater',
    promptType: 'chatStateUpdater',
    apiKey,
    options,
    schema: CHAT_STATE_UPDATER_SCHEMA,
    messages,
    parseResponse: parseChatStateUpdaterResponse,
  });

  return {
    stateUpdate: result.parsed,
    rawResponse: result.rawResponse,
  };
}
