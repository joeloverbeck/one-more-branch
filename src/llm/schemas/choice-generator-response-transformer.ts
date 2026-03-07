import type { ChoiceGeneratorResult } from '../choice-generator-types.js';
import { ChoiceGeneratorResultSchema } from './choice-generator-validation-schema.js';

export function validateChoiceGeneratorResponse(
  rawJson: unknown,
  rawResponse: string
): ChoiceGeneratorResult {
  const validated = ChoiceGeneratorResultSchema.parse(rawJson);

  return {
    choices: validated.choices.map((choice) => ({
      text: choice.text.trim(),
      choiceType: choice.choiceType,
      primaryDelta: choice.primaryDelta,
    })),
    rawResponse,
  };
}
