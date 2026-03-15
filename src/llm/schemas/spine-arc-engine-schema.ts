import type { JsonSchema } from '../llm-client-types.js';

export const SPINE_ARC_ENGINE_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'spine_arc_engine_elaboration',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['elaborations'],
      properties: {
        elaborations: {
          type: 'array',
          description:
            'Arc engine elaboration for each foundation. Array must match the input foundations in count and order.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'storySpineType',
              'conflictType',
              'protagonistNeedVsWant',
            ],
            properties: {
              storySpineType: {
                type: 'string',
                enum: [
                  'QUEST',
                  'SURVIVAL',
                  'ESCAPE',
                  'REVENGE',
                  'RESCUE',
                  'RIVALRY',
                  'MYSTERY',
                  'TEMPTATION',
                  'TRANSFORMATION',
                  'FORBIDDEN_LOVE',
                  'SACRIFICE',
                  'FALL_FROM_GRACE',
                  'RISE_TO_POWER',
                  'COMING_OF_AGE',
                  'REBELLION',
                ],
                description: 'The primary narrative pattern.',
              },
              conflictType: {
                type: 'string',
                enum: [
                  'PERSON_VS_PERSON',
                  'PERSON_VS_SELF',
                  'PERSON_VS_SOCIETY',
                  'PERSON_VS_NATURE',
                  'PERSON_VS_TECHNOLOGY',
                  'PERSON_VS_SUPERNATURAL',
                  'PERSON_VS_FATE',
                ],
                description: 'The primary source of opposition.',
              },
              protagonistNeedVsWant: {
                type: 'object',
                additionalProperties: false,
                required: ['need', 'want', 'dynamic'],
                properties: {
                  need: {
                    type: 'string',
                    description:
                      'The inner transformation the protagonist must undergo.',
                  },
                  want: {
                    type: 'string',
                    description:
                      'The outer goal the protagonist consciously pursues.',
                  },
                  dynamic: {
                    type: 'string',
                    enum: ['CONVERGENT', 'DIVERGENT', 'SUBSTITUTIVE', 'IRRECONCILABLE'],
                    description:
                      'How need and want relate.',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
