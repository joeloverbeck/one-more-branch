import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_SPEC_SCHEMA } from './concept-ideator-schema.js';

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'hookStrength',
    'conflictEngine',
    'agencyBreadth',
    'noveltyLeverage',
    'branchingFitness',
    'llmFeasibility',
  ],
  properties: {
    hookStrength: { type: 'number' },
    conflictEngine: { type: 'number' },
    agencyBreadth: { type: 'number' },
    noveltyLeverage: { type: 'number' },
    branchingFitness: { type: 'number' },
    llmFeasibility: { type: 'number' },
  },
} as const;

const SCORE_EVIDENCE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'hookStrength',
    'conflictEngine',
    'agencyBreadth',
    'noveltyLeverage',
    'branchingFitness',
    'llmFeasibility',
  ],
  properties: {
    hookStrength: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    conflictEngine: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    agencyBreadth: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    noveltyLeverage: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    branchingFitness: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
    llmFeasibility: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
  },
} as const;

export const CONCEPT_EVALUATION_SCORING_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_evaluation_scoring',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['scoredConcepts'],
      properties: {
        scoredConcepts: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['concept', 'scores', 'scoreEvidence'],
            properties: {
              concept: CONCEPT_SPEC_SCHEMA,
              scores: SCORE_SCHEMA,
              scoreEvidence: SCORE_EVIDENCE_SCHEMA,
            },
          },
        },
      },
    },
  },
};

export const CONCEPT_EVALUATION_DEEP_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_evaluation_deep',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['evaluatedConcepts'],
      properties: {
        evaluatedConcepts: {
          type: 'array',
          minItems: 1,
          maxItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['concept', 'strengths', 'weaknesses', 'tradeoffSummary'],
            properties: {
              concept: CONCEPT_SPEC_SCHEMA,
              strengths: { type: 'array', items: { type: 'string' }, minItems: 1 },
              weaknesses: { type: 'array', items: { type: 'string' }, minItems: 1 },
              tradeoffSummary: { type: 'string', minLength: 1 },
            },
          },
        },
      },
    },
  },
};
