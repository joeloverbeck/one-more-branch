import { DIRECTION_OF_CHANGE_VALUES } from '../../models/story-kernel.js';
import type { JsonSchema } from '../llm-client-types.js';

export const KERNEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dramaticThesis',
    'valueAtStake',
    'opposingForce',
    'directionOfChange',
    'thematicQuestion',
  ],
  properties: {
    dramaticThesis: { type: 'string' },
    valueAtStake: { type: 'string' },
    opposingForce: { type: 'string' },
    directionOfChange: { type: 'string', enum: [...DIRECTION_OF_CHANGE_VALUES] },
    thematicQuestion: { type: 'string' },
  },
} as const;

export const KERNEL_IDEATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'kernel_ideation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['kernels'],
      properties: {
        kernels: {
          type: 'array',
          minItems: 6,
          maxItems: 8,
          items: KERNEL_SCHEMA,
        },
      },
    },
  },
};
