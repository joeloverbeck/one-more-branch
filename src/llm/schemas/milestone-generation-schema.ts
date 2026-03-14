import type { JsonSchema } from '../llm-client-types.js';
import {
  APPROACH_VECTORS,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
  MILESTONE_ROLES,
} from '../../models/story-arc.js';

export const MILESTONE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'milestone_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['acts'],
      properties: {
        acts: {
          type: 'array',
          description:
            'One item per macro act, in the same order as the locked macro architecture. Runtime validates exact act count and 2-4 milestones per act.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['actIndex', 'milestones'],
            properties: {
              actIndex: { type: 'integer' },
              milestones: {
                type: 'array',
                description:
                  '2-4 milestones for this act. Runtime validates midpoint placement and other structural invariants.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'name',
                    'description',
                    'objective',
                    'causalLink',
                    'exitCondition',
                    'role',
                    'escalationType',
                    'secondaryEscalationType',
                    'crisisType',
                    'expectedGapMagnitude',
                    'isMidpoint',
                    'midpointType',
                    'uniqueScenarioHook',
                    'approachVectors',
                    'setpieceSourceIndex',
                    'obligatorySceneTag',
                  ],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    objective: { type: 'string' },
                    causalLink: { type: 'string' },
                    exitCondition: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: [...MILESTONE_ROLES],
                    },
                    escalationType: {
                      anyOf: [{ type: 'string', enum: [...ESCALATION_TYPES] }, { type: 'null' }],
                    },
                    secondaryEscalationType: {
                      anyOf: [{ type: 'string', enum: [...ESCALATION_TYPES] }, { type: 'null' }],
                    },
                    crisisType: {
                      anyOf: [{ type: 'string', enum: [...CRISIS_TYPES] }, { type: 'null' }],
                    },
                    expectedGapMagnitude: {
                      anyOf: [{ type: 'string', enum: [...GAP_MAGNITUDES] }, { type: 'null' }],
                    },
                    isMidpoint: { type: 'boolean' },
                    midpointType: {
                      anyOf: [{ type: 'string', enum: [...MIDPOINT_TYPES] }, { type: 'null' }],
                    },
                    uniqueScenarioHook: {
                      anyOf: [{ type: 'string' }, { type: 'null' }],
                    },
                    approachVectors: {
                      anyOf: [
                        {
                          type: 'array',
                          items: {
                            type: 'string',
                            enum: [...APPROACH_VECTORS],
                          },
                        },
                        { type: 'null' },
                      ],
                    },
                    setpieceSourceIndex: {
                      anyOf: [{ type: 'integer', enum: [0, 1, 2, 3, 4, 5] }, { type: 'null' }],
                    },
                    obligatorySceneTag: {
                      anyOf: [{ type: 'string' }, { type: 'null' }],
                    },
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
