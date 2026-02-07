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
          minItems: 3,
          maxItems: 3,
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
                minItems: 2,
                maxItems: 4,
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
