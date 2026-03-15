import type { JsonSchema } from '../llm-client-types.js';

export const SPINE_SYNTHESIS_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'spine_dramatic_synthesis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['syntheses'],
      properties: {
        syntheses: {
          type: 'array',
          description:
            'Dramatic synthesis for each arc engine result. Array must match the input in count and order.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'primaryAntagonisticForce',
              'centralDramaticQuestion',
              'wantNeedCollisionPoint',
            ],
            properties: {
              primaryAntagonisticForce: {
                type: 'object',
                additionalProperties: false,
                required: ['description', 'pressureMechanism'],
                properties: {
                  description: {
                    type: 'string',
                    description:
                      'What opposes the protagonist. Not necessarily a villain — can be a system, environment, internal flaw, or social pressure.',
                  },
                  pressureMechanism: {
                    type: 'string',
                    description:
                      'HOW the antagonistic force creates difficult choices that widen the gap between need and want.',
                  },
                },
              },
              centralDramaticQuestion: {
                type: 'string',
                description:
                  'The single dramatic question the story exists to answer. One sentence ending with a question mark, specific to this character and world.',
              },
              wantNeedCollisionPoint: {
                type: 'string',
                description:
                  'The specific moment or condition where pursuing the want actively blocks the need. One sentence.',
              },
            },
          },
        },
      },
    },
  },
};
