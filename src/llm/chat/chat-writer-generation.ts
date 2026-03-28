import type {
  ChatBible,
  ChatBlock,
  ChatTurn,
  TurnPlannerOutput,
} from '../../models/chat/index.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import type { GenerationOptions } from '../generation-pipeline-types.js';
import { LLMError } from '../llm-client-types.js';
import { runLlmStage } from '../llm-stage-runner.js';
import { buildChatWriterMessages } from '../prompts/chat/chat-writer-prompt.js';
import { buildLenientSchema, withGrammarFallback } from '../structured-output-fallback.js';
import {
  CHAT_WRITER_SCHEMA,
  parseChatWriterResponse,
  type ChatWriterTurn as ParsedChatWriterTurn,
} from '../schemas/chat-writer-schema.js';

export interface ChatWriterContext {
  readonly targetCharacter: StandaloneDecomposedCharacter;
  readonly interlocutorCharacterName: string;
  readonly chatBible: ChatBible;
  readonly turnPlan: TurnPlannerOutput;
  readonly recentTurns: readonly ChatTurn[];
  readonly latestUserTurn: ChatTurn;
}

export type ChatWriterTurn = ParsedChatWriterTurn;

export interface ChatWriterGenerationResult {
  readonly writerTurn: ChatWriterTurn;
  readonly rawResponse: string;
}

function countBlocksByType(blocks: readonly ChatBlock[], type: ChatBlock['type']): number {
  return blocks.filter((block) => block.type === type).length;
}

function validateWriterTurnAgainstPlan(
  writerTurn: ChatWriterTurn,
  turnPlan: TurnPlannerOutput
): ChatWriterTurn {
  for (const [index, block] of writerTurn.blocks.entries()) {
    if (block.type === 'ACTION' && block.delivery !== undefined) {
      throw new LLMError(
        `Chat Writer ACTION block at index ${index} must not include delivery`,
        'INVALID_CHAT_WRITER_OUTPUT',
        false,
        { block, index }
      );
    }
  }

  const actionCount = countBlocksByType(writerTurn.blocks, 'ACTION');
  if (actionCount > 2) {
    throw new LLMError('Chat Writer returned more than 2 ACTION blocks', 'INVALID_CHAT_WRITER_OUTPUT', false, {
      actionCount,
    });
  }

  const speechCount = countBlocksByType(writerTurn.blocks, 'SPEECH');
  if (speechCount > 3) {
    throw new LLMError('Chat Writer returned more than 3 SPEECH blocks', 'INVALID_CHAT_WRITER_OUTPUT', false, {
      speechCount,
    });
  }

  const actualBlockPlan = writerTurn.blocks.map((block) => block.type);
  if (
    actualBlockPlan.length !== turnPlan.blockPlan.length ||
    actualBlockPlan.some((blockType, index) => blockType !== turnPlan.blockPlan[index])
  ) {
    throw new LLMError(
      'Chat Writer blocks must match turnPlan.blockPlan exactly',
      'INVALID_CHAT_WRITER_OUTPUT',
      false,
      {
        expectedBlockPlan: turnPlan.blockPlan,
        actualBlockPlan,
      }
    );
  }

  return writerTurn;
}

export async function generateChatWriterTurn(
  context: ChatWriterContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<ChatWriterGenerationResult> {
  const messages = buildChatWriterMessages(context);
  const result = await withGrammarFallback(
    () =>
      runLlmStage({
        stageModel: 'chatWriter',
        promptType: 'chatWriter',
        apiKey,
        options,
        schema: CHAT_WRITER_SCHEMA,
        messages,
        parseResponse: parseChatWriterResponse,
      }),
    () =>
      runLlmStage({
        stageModel: 'chatWriter',
        promptType: 'chatWriter',
        apiKey,
        options,
        schema: buildLenientSchema(CHAT_WRITER_SCHEMA),
        messages,
        parseResponse: parseChatWriterResponse,
      })
  );

  return {
    writerTurn: validateWriterTurnAgainstPlan(result.parsed, context.turnPlan),
    rawResponse: result.rawResponse,
  };
}
