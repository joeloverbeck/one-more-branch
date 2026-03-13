import {
  SPEECH_REQUIRED_FIELDS,
  SPEECH_SCHEMA_FIELDS,
} from '../entity-decomposition-contract.js';
import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

function buildSchemaProperties(
  fields: Record<string, { type: string; description: string; values?: readonly string[] }>
): Record<string, SchemaProperty> {
  const properties: Record<string, SchemaProperty> = {};

  for (const [key, field] of Object.entries(fields)) {
    if (field.type === 'array') {
      properties[key] = {
        type: 'array',
        description: field.description,
        items: { type: 'string' },
      };
      continue;
    }

    if (field.type === 'nullable_object') {
      continue;
    }

    if (field.type === 'nullable_enum' && field.values) {
      properties[key] = {
        anyOf: [
          { type: 'string', enum: [...field.values] },
          { type: 'null' },
        ],
        description: field.description,
      };
      continue;
    }

    properties[key] = {
      type: 'string',
      description: field.description,
    };
  }

  return properties;
}

const SPEECH_PROPERTIES = buildSchemaProperties(SPEECH_SCHEMA_FIELDS);

/**
 * Schema for standalone character decomposition — no story-dependent fields
 * (thematicStance, protagonistRelationship).
 */
export const CHARACTER_DECOMPOSITION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'character_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'name',
        'coreTraits',
        'superObjective',
        'knowledgeBoundaries',
        'appearance',
        'decisionPattern',
        'coreBeliefs',
        'conflictPriority',
        'falseBeliefs',
        'secretsKept',
        'stakes',
        'pressurePoint',
        'personalDilemmas',
        'emotionSalience',
        'speechFingerprint',
      ],
      properties: {
        name: {
          type: 'string',
          description: 'Character name as provided.',
        },
        coreTraits: {
          type: 'array',
          description: '3-5 defining personality traits. E.g. ["stubborn", "loyal", "sarcastic"].',
          items: { type: 'string' },
        },
        superObjective: {
          type: 'string',
          description:
            'The character\'s overarching dramatic goal — the single deepest drive that shapes all their actions. ' +
            'E.g. "To prove she deserves to exist on her own terms." 1 sentence.',
        },
        stakes: {
          type: 'array',
          description:
            'What this character stands to lose or gain. 2-4 concrete items. ' +
            'E.g. ["Her freedom if the pact is discovered", "The only family she has left"].',
          items: { type: 'string' },
        },
        pressurePoint: {
          type: 'string',
          description:
            'The vulnerability that could force this character to act against their own self-interest. 1 sentence.',
        },
        personalDilemmas: {
          type: 'array',
          description:
            'Competing loyalties or values that create internal conflict. 1-3 items.',
          items: { type: 'string' },
        },
        emotionSalience: {
          anyOf: [
            { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
            { type: 'null' },
          ],
          description:
            'How emotionally expressive this character is. LOW = stoic/guarded, MEDIUM = situationally expressive, HIGH = emotionally driven.',
        },
        knowledgeBoundaries: {
          type: 'string',
          description:
            'What this character knows and does NOT know. Important for preventing ' +
            'information leaks between characters. 1-2 sentences.',
        },
        appearance: {
          type: 'string',
          description: 'Brief physical description. 1-2 sentences.',
        },
        decisionPattern: {
          type: 'string',
          description:
            'How this character approaches decisions and what they prioritize under pressure. 1-2 sentences.',
        },
        coreBeliefs: {
          type: 'array',
          description:
            '2-3 fundamental beliefs that drive this character\'s behavior. ' +
            'These should sound like things the character would think or say.',
          items: { type: 'string' },
        },
        conflictPriority: {
          type: 'string',
          description: 'When this character\'s goals conflict, what wins? One sentence.',
        },
        falseBeliefs: {
          type: 'array',
          description:
            'Things this character sincerely believes that are WRONG. Misconceptions, not lies. ' +
            'Empty array if no notable false beliefs.',
          items: { type: 'string' },
        },
        secretsKept: {
          type: 'array',
          description:
            'Things this character knows but actively conceals from others. ' +
            'Empty array if no notable secrets.',
          items: { type: 'string' },
        },
        speechFingerprint: {
          type: 'object',
          additionalProperties: false,
          required: [...SPEECH_REQUIRED_FIELDS],
          properties: SPEECH_PROPERTIES,
        },
      },
    },
  },
};
