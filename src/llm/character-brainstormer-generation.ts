import { buildCharacterBrainstormerMessages } from './prompts/character-brainstormer-prompt.js';
import {
  CHARACTER_BRAINSTORMER_SCHEMA,
  parseCharacterBrainstormerResponse,
} from './schemas/character-brainstormer-schema.js';
import type {
  CharacterBrainstormerContext,
  CharacterBrainstormerResult,
} from './character-brainstormer-types.js';
import type { GenerationOptions } from './generation-pipeline-types.js';
import { runLlmStage } from './llm-stage-runner.js';

export async function generateCharacterBrainstorm(
  context: CharacterBrainstormerContext,
  apiKey: string,
  options?: Partial<GenerationOptions>
): Promise<CharacterBrainstormerResult & { readonly rawResponse: string }> {
  const messages = buildCharacterBrainstormerMessages(context);
  const result = await runLlmStage({
    stageModel: 'characterBrainstormer',
    promptType: 'characterBrainstormer',
    apiKey,
    options,
    schema: CHARACTER_BRAINSTORMER_SCHEMA,
    messages,
    parseResponse: parseCharacterBrainstormerResponse,
  });

  return {
    ...result.parsed,
    rawResponse: result.rawResponse,
  };
}
