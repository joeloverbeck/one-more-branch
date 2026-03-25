import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import type {
  BrainstormedCharacter,
  CharacterBrainstormerResult,
} from '../character-brainstormer-types.js';

export const CHARACTER_BRAINSTORMER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'character_brainstormer',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['characters', 'diversityNote'],
      properties: {
        characters: {
          type: 'array',
          description: 'Array of 6-10 unique, original character concepts.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'name',
              'highConceptPitch',
              'coreWound',
              'centralContradiction',
              'archetypeAndSubversion',
              'suggestedStoryFunction',
              'relationshipDynamicHint',
              'whatMakesThemMemorable',
              'metaphorFamily',
            ],
            properties: {
              name: {
                type: 'string',
                description: 'Character name fitting worldbuilding context.',
              },
              highConceptPitch: {
                type: 'string',
                description: '1-2 sentence elevator pitch with inherent tension.',
              },
              coreWound: {
                type: 'string',
                description: 'Specific formative wound at diagnostic specificity.',
              },
              centralContradiction: {
                type: 'string',
                description: 'Public trait vs. private reality.',
              },
              archetypeAndSubversion: {
                type: 'string',
                description: 'Base archetype + subversion method + why.',
              },
              suggestedStoryFunction: {
                type: 'string',
                description: 'Dramatic role relative to protagonist.',
              },
              relationshipDynamicHint: {
                type: 'string',
                description: 'How they create dramatic friction.',
              },
              whatMakesThemMemorable: {
                type: 'string',
                description: 'Single most distinctive quality.',
              },
              metaphorFamily: {
                type: 'string',
                description: 'Cognitive domain for comparisons.',
              },
            },
          },
        },
        diversityNote: {
          type: 'string',
          description: 'Explanation of techniques used for diversity across the set.',
        },
      },
    },
  },
};

const CHARACTER_FIELDS = [
  'name',
  'highConceptPitch',
  'coreWound',
  'centralContradiction',
  'archetypeAndSubversion',
  'suggestedStoryFunction',
  'relationshipDynamicHint',
  'whatMakesThemMemorable',
  'metaphorFamily',
] as const;

function parseCharacter(raw: unknown, index: number): BrainstormedCharacter {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new LLMError(
      `Character ${index + 1} must be an object`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = raw as Record<string, unknown>;
  const result: Record<string, string> = {};

  for (const field of CHARACTER_FIELDS) {
    const value = data[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new LLMError(
        `Character ${index + 1} missing or empty field: ${field}`,
        'STRUCTURE_PARSE_ERROR',
        true
      );
    }
    result[field] = value.trim();
  }

  return result as unknown as BrainstormedCharacter;
}

export function parseCharacterBrainstormerResponse(
  parsed: unknown
): Omit<CharacterBrainstormerResult, 'rawResponse'> {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new LLMError(
      'Character brainstormer response must be an object',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const data = parsed as Record<string, unknown>;

  if (!Array.isArray(data['characters'])) {
    throw new LLMError(
      'Character brainstormer response missing characters array',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (data['characters'].length < 6) {
    throw new LLMError(
      `Expected at least 6 characters, got ${data['characters'].length}`,
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  if (typeof data['diversityNote'] !== 'string' || data['diversityNote'].trim().length === 0) {
    throw new LLMError(
      'Character brainstormer response missing diversityNote',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  const characters = data['characters'].slice(0, 10).map((c, i) => parseCharacter(c, i));

  return {
    characters,
    diversityNote: data['diversityNote'].trim(),
  };
}
