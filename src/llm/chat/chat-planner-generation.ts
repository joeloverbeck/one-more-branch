import type { ChatBible, ChatTurn, TurnPlannerOutput } from '../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatPlannerMessages } from '../prompts/chat/chat-planner-prompt.js';
import { buildLenientSchema, withGrammarFallback } from '../structured-output-fallback.js';
import {
  CHAT_PLANNER_SCHEMA,
  parseChatPlannerResponse,
} from '../schemas/chat-planner-schema.js';

export interface ChatPlannerContext {
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacterName: string;
  readonly chatBible: ChatBible;
  readonly recentTurns: readonly ChatTurn[];
  readonly latestUserTurn: ChatTurn;
}

export interface ChatPlannerGenerationResult {
  readonly turnPlan: TurnPlannerOutput;
  readonly rawResponse: string;
}

export async function generateChatTurnPlan(
  context: ChatPlannerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatPlannerGenerationResult> {
  const messages = buildChatPlannerMessages(context);
  const result = await withGrammarFallback(
    () =>
      runLlmStage({
        stageModel: 'chatPlanner',
        promptType: 'chatPlanner',
        apiKey,
        options,
        schema: CHAT_PLANNER_SCHEMA,
        messages,
        parseResponse: parseChatPlannerResponse,
      }),
    () =>
      runLlmStage({
        stageModel: 'chatPlanner',
        promptType: 'chatPlanner',
        apiKey,
        options,
        schema: buildLenientSchema(CHAT_PLANNER_SCHEMA),
        messages,
        parseResponse: parseChatPlannerResponse,
      })
  );

  return {
    turnPlan: result.parsed,
    rawResponse: result.rawResponse,
  };
}
