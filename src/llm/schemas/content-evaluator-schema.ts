import { CONTENT_PACKET_ROLE_VALUES } from '../../models/content-packet.js';
import type { JsonSchema } from '../llm-client-types.js';

const SCORE_DIMENSIONS = [
  'imageCharge',
  'humanAche',
  'socialLoadBearing',
  'branchingPressure',
  'antiGenericity',
  'sceneBurst',
  'structuralIrony',
  'conceptUtility',
] as const;

function buildScoresSchema(): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  for (const dim of SCORE_DIMENSIONS) {
    properties[dim] = { type: 'number' };
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
              required: ['contentId', 'scores', 'strengths', 'weaknesses', 'recommendedRole'],
              properties: {
                contentId: { type: 'string' },
                scores: buildScoresSchema(),
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
                recommendedRole: {
                  type: 'string',
                  enum: [...CONTENT_PACKET_ROLE_VALUES],
                },
              },
            },
          },
        },
      },
    },
  };
}
