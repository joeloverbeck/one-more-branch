import type { JsonSchema } from '../llm-client-types.js';

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'hookStrength',
    'conflictEngine',
    'agencyBreadth',
    'noveltyLeverage',
    'llmFeasibility',
    'ironicPremise',
    'sceneGenerativePower',
  ],
  properties: {
    hookStrength: { type: 'number' },
    conflictEngine: { type: 'number' },
    agencyBreadth: { type: 'number' },
    noveltyLeverage: { type: 'number' },
    llmFeasibility: { type: 'number' },
    ironicPremise: { type: 'number' },
    sceneGenerativePower: { type: 'number' },
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
    'llmFeasibility',
    'ironicPremise',
    'sceneGenerativePower',
  ],
  properties: {
    hookStrength: { type: 'array', items: { type: 'string' }, minItems: 1 },
    conflictEngine: { type: 'array', items: { type: 'string' }, minItems: 1 },
    agencyBreadth: { type: 'array', items: { type: 'string' }, minItems: 1 },
    noveltyLeverage: { type: 'array', items: { type: 'string' }, minItems: 1 },
    llmFeasibility: { type: 'array', items: { type: 'string' }, minItems: 1 },
    ironicPremise: { type: 'array', items: { type: 'string' }, minItems: 1 },
    sceneGenerativePower: { type: 'array', items: { type: 'string' }, minItems: 1 },
  },
} as const;

export const CONCEPT_SINGLE_SCORING_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_single_scoring',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['scoredConcept'],
      properties: {
        scoredConcept: {
          type: 'object',
          additionalProperties: false,
          required: ['scores', 'scoreEvidence'],
          properties: {
            scores: SCORE_SCHEMA,
            scoreEvidence: SCORE_EVIDENCE_SCHEMA,
          },
        },
      },
    },
  },
};

export const CONCEPT_SINGLE_DEEP_EVAL_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_single_deep_eval',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['evaluatedConcept'],
      properties: {
        evaluatedConcept: {
          type: 'object',
          additionalProperties: false,
          required: ['strengths', 'weaknesses', 'tradeoffSummary'],
          properties: {
            strengths: { type: 'array', items: { type: 'string' }, minItems: 1 },
            weaknesses: { type: 'array', items: { type: 'string' }, minItems: 1 },
            tradeoffSummary: { type: 'string', minLength: 1 },
          },
        },
      },
    },
  },
};
