import {
  CHARACTER_SCHEMA_FIELDS,
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
        'moralLine',
        'worstFear',
        'formativeWound',
        'misbelief',
        'stressVariants',
        'focalizationFilter',
        'escalationLadder',
        'immediateObjectives',
        'constraints',
        'desires',
        'currentIntentions',
        'sociology',
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
        moralLine: {
          type: 'string',
          description: CHARACTER_SCHEMA_FIELDS.moralLine.description,
        },
        worstFear: {
          type: 'string',
          description: CHARACTER_SCHEMA_FIELDS.worstFear.description,
        },
        formativeWound: {
          type: 'string',
          description: CHARACTER_SCHEMA_FIELDS.formativeWound.description,
        },
        misbelief: {
          type: 'string',
          description: CHARACTER_SCHEMA_FIELDS.misbelief.description,
        },
        stressVariants: {
          type: 'object',
          additionalProperties: false,
          required: ['underThreat', 'inIntimacy', 'whenLying', 'whenAshamed', 'whenWinning'],
          properties: {
            underThreat: {
              type: 'string',
              description: 'How this character\'s voice and behavior change when threatened.',
            },
            inIntimacy: {
              type: 'string',
              description: 'How this character\'s voice and behavior change in intimate moments.',
            },
            whenLying: {
              type: 'string',
              description: 'How this character\'s voice and behavior change when lying.',
            },
            whenAshamed: {
              type: 'string',
              description: 'How this character\'s voice and behavior change when ashamed.',
            },
            whenWinning: {
              type: 'string',
              description: 'How this character\'s voice and behavior change when winning.',
            },
          },
        },
        focalizationFilter: {
          anyOf: [
            {
              type: 'object',
              additionalProperties: false,
              required: ['noticesFirst', 'systematicallyMisses', 'misreadsAs'],
              properties: {
                noticesFirst: {
                  type: 'string',
                  description: 'What this character notices first in any scene or interaction.',
                },
                systematicallyMisses: {
                  type: 'string',
                  description: 'What this character consistently overlooks or fails to perceive.',
                },
                misreadsAs: {
                  type: 'string',
                  description: 'How this character misinterprets ambiguous signals.',
                },
              },
            },
            { type: 'null' },
          ],
          description: CHARACTER_SCHEMA_FIELDS.focalizationFilter.description,
        },
        escalationLadder: {
          type: 'array',
          description: CHARACTER_SCHEMA_FIELDS.escalationLadder.description,
          items: { type: 'string' },
        },
        immediateObjectives: {
          type: 'array',
          description:
            '2-5 concrete, time-bound tactical goals this character is actively pursuing. ' +
            'These drive scene-level action.',
          items: { type: 'string' },
        },
        constraints: {
          type: 'array',
          description:
            '2-4 external limitations restricting this character\'s options. ' +
            'Creates dramatic tension by defining what they CANNOT do.',
          items: { type: 'string' },
        },
        desires: {
          type: 'array',
          description:
            '3-6 concrete desires beyond the super-objective. ' +
            'Each could generate a story beat or scene conflict.',
          items: { type: 'string' },
        },
        currentIntentions: {
          type: 'array',
          description:
            '2-4 active plans this character is executing. ' +
            'What they would DO in the next scene.',
          items: { type: 'string' },
        },
        sociology: {
          type: 'string',
          description:
            'The character\'s social position: class, family structure, economic circumstances, ' +
            'and social world. 2-4 sentences grounding them in material reality.',
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
