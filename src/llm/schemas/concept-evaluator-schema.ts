import type { JsonSchema } from '../llm-client-types.js';

const SCORE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'hookStrength',
    'conflictEngine',
    'agencyBreadth',
    'noveltyLeverage',

    'ironicPremise',
    'sceneGenerativePower',
    'contentCharge',
  ],
  properties: {
    hookStrength: { type: 'number' },
    conflictEngine: { type: 'number' },
    agencyBreadth: { type: 'number' },
    noveltyLeverage: { type: 'number' },

    ironicPremise: { type: 'number' },
    sceneGenerativePower: { type: 'number' },
    contentCharge: { type: 'number' },
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

    'ironicPremise',
    'sceneGenerativePower',
    'contentCharge',
  ],
  properties: {
    hookStrength: { type: 'array', items: { type: 'string' }, minItems: 1 },
    conflictEngine: { type: 'array', items: { type: 'string' }, minItems: 1 },
    agencyBreadth: { type: 'array', items: { type: 'string' }, minItems: 1 },
    noveltyLeverage: { type: 'array', items: { type: 'string' }, minItems: 1 },

    ironicPremise: { type: 'array', items: { type: 'string' }, minItems: 1 },
    sceneGenerativePower: { type: 'array', items: { type: 'string' }, minItems: 1 },
    contentCharge: { type: 'array', items: { type: 'string' }, minItems: 1 },
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
            required: ['conceptId', 'scores', 'scoreEvidence'],
            properties: {
              conceptId: { type: 'string', minLength: 1 },
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
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['conceptId', 'strengths', 'weaknesses', 'tradeoffSummary'],
            properties: {
              conceptId: { type: 'string', minLength: 1 },
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
