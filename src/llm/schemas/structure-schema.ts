import type { JsonSchema } from '../types.js';

export const STRUCTURE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_structure_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['overallTheme', 'acts'],
      properties: {
        overallTheme: { type: 'string' },
        acts: {
          type: 'array',
          description: 'Exactly 3 acts following setup, confrontation, and resolution.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'objective', 'stakes', 'entryCondition', 'beats'],
            properties: {
              name: { type: 'string' },
              objective: { type: 'string' },
              stakes: { type: 'string' },
              entryCondition: { type: 'string' },
              beats: {
                type: 'array',
                description: '2-4 beats per act that function as flexible milestones.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['description', 'objective'],
                  properties: {
                    description: { type: 'string' },
                    objective: { type: 'string' },
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
