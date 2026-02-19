import type { JsonSchema } from '../llm-client-types.js';
import { KERNEL_SCHEMA } from './kernel-ideator-schema.js';

const KERNEL_SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dramaticClarity',
    'thematicUniversality',
    'generativePotential',
    'conflictTension',
    'emotionalDepth',
  ],
  properties: {
    dramaticClarity: { type: 'number' },
    thematicUniversality: { type: 'number' },
    generativePotential: { type: 'number' },
    conflictTension: { type: 'number' },
    emotionalDepth: { type: 'number' },
  },
} as const;

const KERNEL_SCORE_EVIDENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'dramaticClarity',
    'thematicUniversality',
    'generativePotential',
    'conflictTension',
    'emotionalDepth',
  ],
  properties: {
    dramaticClarity: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    thematicUniversality: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    generativePotential: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    conflictTension: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    emotionalDepth: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
  },
} as const;

export const KERNEL_EVALUATION_SCORING_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'kernel_evaluation_scoring',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['scoredKernels'],
      properties: {
        scoredKernels: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['kernel', 'scores', 'scoreEvidence'],
            properties: {
              kernel: KERNEL_SCHEMA,
              scores: KERNEL_SCORE_SCHEMA,
              scoreEvidence: KERNEL_SCORE_EVIDENCE_SCHEMA,
            },
          },
        },
      },
    },
  },
};

export const KERNEL_EVALUATION_DEEP_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'kernel_evaluation_deep',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['evaluatedKernels'],
      properties: {
        evaluatedKernels: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['kernel', 'strengths', 'weaknesses', 'tradeoffSummary'],
            properties: {
              kernel: KERNEL_SCHEMA,
              strengths: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
              weaknesses: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 3 },
              tradeoffSummary: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
  },
};
