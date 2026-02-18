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

export const CONCEPT_EVALUATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_evaluation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['evaluatedConcepts'],
      properties: {
        evaluatedConcepts: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'concept',
              'scores',
              'overallScore',
              'strengths',
              'weaknesses',
              'tradeoffSummary',
            ],
            properties: {
              concept: CONCEPT_SPEC_SCHEMA,
              scores: SCORE_SCHEMA,
              overallScore: { type: 'number' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              tradeoffSummary: { type: 'string' },
            },
          },
        },
      },
    },
  },
};
