import {
  SPEECH_REQUIRED_FIELDS,
  SPEECH_SCHEMA_FIELDS,
} from '../entity-decomposition-contract.js';
import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

function buildSchemaProperties(
  fields: Record<string, { type: string; description: string }>
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
        'motivations',
        'knowledgeBoundaries',
        'appearance',
        'decisionPattern',
        'coreBeliefs',
        'conflictPriority',
        'falseBeliefs',
        'secretsKept',
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
        motivations: {
          type: 'string',
          description: 'What drives this character. 1-2 sentences.',
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
