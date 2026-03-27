import type { RollingSummaryOutput, ChatTurn } from '../../models/chat/index.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatSummaryMessages } from '../prompts/chat/chat-summary-prompt.js';
import {
  CHAT_SUMMARY_SCHEMA,
  parseChatSummaryResponse,
} from '../schemas/chat-summary-schema.js';

export interface ChatSummaryContext {
  readonly existingSummary: string | null;
  readonly turnsToCompress: readonly ChatTurn[];
}

export interface ChatSummaryGenerationResult {
  readonly summary: RollingSummaryOutput;
  readonly rawResponse: string;
}

export async function generateChatSummary(
  context: ChatSummaryContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatSummaryGenerationResult> {
  const messages = buildChatSummaryMessages(context);
  const result = await runLlmStage({
    stageModel: 'chatSummarizer',
    promptType: 'chatSummarizer',
    apiKey,
    options,
    schema: CHAT_SUMMARY_SCHEMA,
    messages,
    parseResponse: parseChatSummaryResponse,
  });

  return {
    summary: result.parsed,
    rawResponse: result.rawResponse,
  };
}
