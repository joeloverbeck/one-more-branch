import { CONFLICT_AXES } from '../../models/conflict-taxonomy.js';
import { DIRECTION_OF_CHANGE_VALUES, DRAMATIC_STANCE_VALUES } from '../../models/story-kernel.js';
import type { JsonSchema } from '../llm-client-types.js';

export const KERNEL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dramaticThesis',
    'antithesis',
    'valueAtStake',
    'opposingForce',
    'directionOfChange',
    'conflictAxis',
    'dramaticStance',
    'thematicQuestion',
    'valueSpectrum',
    'moralArgument',
  ],
  properties: {
    dramaticThesis: { type: 'string' },
    antithesis: { type: 'string' },
    valueAtStake: { type: 'string' },
    opposingForce: { type: 'string' },
    directionOfChange: { type: 'string', enum: [...DIRECTION_OF_CHANGE_VALUES] },
    conflictAxis: { type: 'string', enum: [...CONFLICT_AXES] },
    dramaticStance: { type: 'string', enum: [...DRAMATIC_STANCE_VALUES] },
    thematicQuestion: { type: 'string' },
    valueSpectrum: {
      type: 'object',
      additionalProperties: false,
      required: ['positive', 'contrary', 'contradictory', 'negationOfNegation'],
      properties: {
        positive: { type: 'string' },
        contrary: { type: 'string' },
        contradictory: { type: 'string' },
        negationOfNegation: { type: 'string' },
      },
    },
    moralArgument: { type: 'string' },
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
          description:
            'Generate 6-8 kernels. Count is enforced by runtime validation because Anthropic limits array constraints in response schemas.',
          items: KERNEL_SCHEMA,
        },
      },
    },
  },
};
