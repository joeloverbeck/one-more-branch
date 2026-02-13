import type { LorekeeperResult } from '../lorekeeper-types.js';
import { LorekeeperResultSchema } from './lorekeeper-validation-schema.js';

export function validateLorekeeperResponse(
  rawJson: unknown,
  rawResponse: string
): LorekeeperResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = LorekeeperResultSchema.parse(parsed);

  return {
    sceneWorldContext: validated.sceneWorldContext.trim(),
    relevantCharacters: validated.relevantCharacters.map((c) => ({
      name: c.name.trim(),
      role: c.role.trim(),
      relevantProfile: c.relevantProfile.trim(),
      speechPatterns: c.speechPatterns.trim(),
      protagonistRelationship: c.protagonistRelationship.trim(),
      ...(c.interCharacterDynamics.trim().length > 0
        ? { interCharacterDynamics: c.interCharacterDynamics.trim() }
        : {}),
      currentState: c.currentState.trim(),
    })),
    relevantCanonFacts: validated.relevantCanonFacts
      .map((f) => f.trim())
      .filter((f) => f.length > 0),
    relevantHistory: validated.relevantHistory.trim(),
    rawResponse,
  };
}
