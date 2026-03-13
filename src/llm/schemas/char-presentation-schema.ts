import {
  SPEECH_REQUIRED_FIELDS,
  SPEECH_SCHEMA_FIELDS,
} from '../entity-decomposition-contract.js';
import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

function buildSpeechProperties(): Record<string, SchemaProperty> {
  const properties: Record<string, SchemaProperty> = {};

  for (const [key, field] of Object.entries(SPEECH_SCHEMA_FIELDS)) {
    if (field.type === 'array') {
      properties[key] = {
        type: 'array',
        description: field.description,
        items: { type: 'string' },
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

const SPEECH_FINGERPRINT_PROPERTIES = buildSpeechProperties();

export const CHAR_PRESENTATION_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'char_presentation_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'characterName',
        'voiceRegister',
        'speechFingerprint',
        'appearance',
        'knowledgeBoundaries',
        'conflictPriority',
        'stressVariants',
        'relationSpecificVariants',
      ],
      properties: {
        characterName: {
          type: 'string',
          description: "The character's name, matching the name from the character web assignment.",
        },
        voiceRegister: {
          anyOf: [
            {
              type: 'string',
              enum: [
                'FORMAL',
                'NEUTRAL',
                'COLLOQUIAL',
                'CEREMONIAL',
                'TECHNICAL',
                'VULGAR',
                'POETIC',
              ],
            },
          ],
          description: 'The broad default register this character speaks in.',
        },
        speechFingerprint: {
          type: 'object',
          additionalProperties: false,
          required: [...SPEECH_REQUIRED_FIELDS],
          properties: SPEECH_FINGERPRINT_PROPERTIES,
        },
        appearance: {
          type: 'string',
          description: 'Brief physical presentation guidance for the character.',
        },
        knowledgeBoundaries: {
          type: 'string',
          description:
            'What this character knows, suspects, misreads, and cannot know. Used to prevent information leakage.',
        },
        conflictPriority: {
          type: 'string',
          description: 'What wins when this character faces competing goals or loyalties.',
        },
        stressVariants: {
          type: 'object',
          additionalProperties: false,
          required: ['underThreat', 'inIntimacy', 'whenLying', 'whenAshamed', 'whenWinning'],
          properties: {
            underThreat: {
              type: 'string',
              description: 'Voice shift when physically or socially threatened.',
            },
            inIntimacy: {
              type: 'string',
              description: 'Voice shift in vulnerable or intimate moments.',
            },
            whenLying: {
              type: 'string',
              description: 'Voice shift when deliberately deceiving.',
            },
            whenAshamed: {
              type: 'string',
              description: 'Voice shift when confronting personal shame.',
            },
            whenWinning: {
              type: 'string',
              description: 'Voice shift when in a position of power or triumph.',
            },
          },
        },
        relationSpecificVariants: {
          type: 'array',
          description:
            '0 or more entries for major cast relationships showing how voice changes toward specific characters.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['towardCharacter', 'registerShift', 'emotionalLeakage'],
            properties: {
              towardCharacter: {
                type: 'string',
                description: 'Name of the other character.',
              },
              registerShift: {
                type: 'string',
                description: 'How formality and diction changes toward this character.',
              },
              emotionalLeakage: {
                type: 'string',
                description:
                  "What feelings slip through despite the character's control.",
              },
            },
          },
        },
      },
    },
  },
};
