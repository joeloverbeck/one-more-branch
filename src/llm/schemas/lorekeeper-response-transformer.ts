import type { LorekeeperResult } from '../lorekeeper-types.js';
import {
  LOREKEEPER_CHARACTER_REQUIRED_FIELDS,
  LOREKEEPER_REQUIRED_FIELDS,
} from '../lorekeeper-contract.js';
import { LorekeeperResultSchema } from './lorekeeper-validation-schema.js';

function trimField<T extends Record<string, unknown>, TKey extends keyof T>(
  source: T,
  key: TKey
): string {
  const value = source[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function validateLorekeeperResponse(
  rawJson: unknown,
  rawResponse: string
): LorekeeperResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = LorekeeperResultSchema.parse(parsed);
  const [sceneWorldContextField, relevantCharactersField, relevantCanonFactsField, relevantHistoryField] =
    LOREKEEPER_REQUIRED_FIELDS;
  const [
    nameField,
    roleField,
    relevantProfileField,
    speechPatternsField,
    protagonistRelationshipField,
    interCharacterDynamicsField,
    currentStateField,
  ] = LOREKEEPER_CHARACTER_REQUIRED_FIELDS;

  return {
    sceneWorldContext: trimField(validated, sceneWorldContextField),
    relevantCharacters: validated[relevantCharactersField].map((c) => ({
      name: trimField(c, nameField),
      role: trimField(c, roleField),
      relevantProfile: trimField(c, relevantProfileField),
      speechPatterns: trimField(c, speechPatternsField),
      protagonistRelationship: trimField(c, protagonistRelationshipField),
      ...(trimField(c, interCharacterDynamicsField).length > 0
        ? { interCharacterDynamics: trimField(c, interCharacterDynamicsField) }
        : {}),
      currentState: trimField(c, currentStateField),
    })),
    relevantCanonFacts: validated[relevantCanonFactsField]
      .map((f) => f.trim())
      .filter((f) => f.length > 0),
    relevantHistory: trimField(validated, relevantHistoryField),
    rawResponse,
  };
}
