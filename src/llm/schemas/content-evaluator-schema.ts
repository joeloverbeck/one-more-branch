import { CONTENT_PACKET_ROLE_VALUES } from '../../models/content-taxonomy.js';
import type { JsonSchema } from '../llm-client-types.js';

const SCORE_DIMENSIONS = [
  'imageCharge',
  'humanAche',
  'socialLoadBearing',
  'branchingPressure',
  'surfaceFreshness',
  'deepOriginality',
  'sceneBurst',
  'structuralIrony',
  'tasteAlignment',
  'causalSpecificity',
] as const;

function buildScoresSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const dim of SCORE_DIMENSIONS) {
    properties[dim] = { type: 'integer', minimum: 0, maximum: 5 };
  }
  return {
    type: 'object',
    additionalProperties: false,
    required: [...SCORE_DIMENSIONS],
    properties,
  };
}

export function buildContentEvaluatorSchema(): JsonSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'content_evaluator',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['evaluations'],
        properties: {
          evaluations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'contentId',
                'scores',
                'strengths',
                'weaknesses',
                'recommendedRole',
                'redundancyCluster',
              ],
              properties: {
                contentId: { type: 'string' },
                scores: buildScoresSchema(),
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                recommendedRole: {
                  type: 'string',
                  enum: [...CONTENT_PACKET_ROLE_VALUES],
                },
                redundancyCluster: {
                  anyOf: [{ type: 'string' }, { type: 'null' }],
                },
              },
            },
          },
        },
      },
    },
  };
}
