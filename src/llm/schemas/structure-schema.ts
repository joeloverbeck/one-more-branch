import type { JsonSchema } from '../llm-client-types.js';
import {
  APPROACH_VECTORS,
  MILESTONE_ROLES,
  CRISIS_TYPES,
  ESCALATION_TYPES,
  GAP_MAGNITUDES,
  MIDPOINT_TYPES,
} from '../../models/story-arc.js';

export const STRUCTURE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_structure_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'overallTheme',
        'premise',
        'openingImage',
        'closingImage',
        'pacingBudget',
        'acts',
        'initialNpcAgendas',
      ],
      properties: {
        overallTheme: { type: 'string' },
        premise: {
          type: 'string',
          description: '1-2 sentence story hook capturing the core dramatic question.',
        },
        openingImage: {
          type: 'string',
          description:
            'A concrete opening visual that embodies the protagonist/world state at story start.',
        },
        closingImage: {
          type: 'string',
          description:
            'A concrete closing visual that mirrors or contrasts the opening image to show transformation.',
        },
        pacingBudget: {
          type: 'object',
          additionalProperties: false,
          required: ['targetPagesMin', 'targetPagesMax'],
          properties: {
            targetPagesMin: {
              type: 'number',
              description: 'Minimum target page count for the full story (10-80).',
            },
            targetPagesMax: {
              type: 'number',
              description: 'Maximum target page count for the full story (10-80).',
            },
          },
        },
        initialNpcAgendas: {
          type: 'array',
          description: 'Initial agendas for each NPC. Empty array if no NPCs defined.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['npcName', 'currentGoal', 'leverage', 'fear', 'offScreenBehavior'],
            properties: {
              npcName: {
                type: 'string',
                description: 'Exact NPC name as provided in NPC definitions.',
              },
              currentGoal: {
                type: 'string',
                description: 'What this NPC is currently trying to achieve (1 sentence).',
              },
              leverage: {
                type: 'string',
                description: 'What advantage or resource this NPC holds (1 sentence).',
              },
              fear: {
                type: 'string',
                description: 'What this NPC is afraid of or trying to avoid (1 sentence).',
              },
              offScreenBehavior: {
                type: 'string',
                description:
                  'What this NPC is doing when not in a scene with the protagonist (1 sentence).',
              },
            },
          },
        },
        acts: {
          type: 'array',
          description: '3-5 acts following setup, confrontation, and resolution.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'objective', 'stakes', 'entryCondition', 'milestones'],
            properties: {
              name: { type: 'string' },
              objective: { type: 'string' },
              stakes: { type: 'string' },
              entryCondition: { type: 'string' },
              milestones: {
                type: 'array',
                description: '2-4 milestones per act that function as flexible milestones.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'name',
                    'description',
                    'objective',
                    'causalLink',
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
                    causalLink: {
                      type: 'string',
                      description:
                        'One sentence describing the cause of this milestone. Use prior milestone outcomes where possible; first milestones should reference inciting conditions.',
                    },
                    role: {
                      type: 'string',
                      enum: [...MILESTONE_ROLES],
                      description: 'Dramatic function of this milestone in the story structure.',
                    },
                    escalationType: {
                      anyOf: [
                        {
                          type: 'string',
                          enum: [...ESCALATION_TYPES],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'For escalation/turning_point milestones: HOW stakes rise. Null for setup/reflection/resolution milestones.',
                    },
                    secondaryEscalationType: {
                      anyOf: [
                        {
                          type: 'string',
                          enum: [...ESCALATION_TYPES],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'Optional second escalation axis for escalation/turning_point milestones when pressure rises along two dimensions at once. Null otherwise.',
                    },
                    crisisType: {
                      anyOf: [
                        {
                          type: 'string',
                          enum: [...CRISIS_TYPES],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'For escalation/turning_point milestones: dilemma shape for the milestone. Null for setup/reflection/resolution milestones.',
                    },
                    expectedGapMagnitude: {
                      anyOf: [
                        {
                          type: 'string',
                          enum: [...GAP_MAGNITUDES],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'For escalation/turning_point milestones: expected width of expectation-vs-result divergence at this milestone. Should generally widen over story progression. Null for setup/reflection/resolution milestones.',
                    },
                    isMidpoint: {
                      type: 'boolean',
                      description:
                        'True for exactly one milestone in the full story structure: the midpoint milestone. False for all others.',
                    },
                    midpointType: {
                      anyOf: [
                        {
                          type: 'string',
                          enum: [...MIDPOINT_TYPES],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'FALSE_VICTORY or FALSE_DEFEAT when isMidpoint is true; null otherwise.',
                    },
                    uniqueScenarioHook: {
                      type: ['string', 'null'],
                      description:
                        'For escalation/turning_point milestones: one sentence describing what makes this milestone unique to THIS story. Null for setup/reflection/resolution milestones.',
                    },
                    approachVectors: {
                      type: ['array', 'null'],
                      description:
                        'For escalation/turning_point milestones: 2-3 approach vectors suggesting HOW the protagonist could tackle this milestone. Null for setup/reflection/resolution milestones.',
                      items: {
                        type: 'string',
                        enum: [...APPROACH_VECTORS],
                      },
                    },
                    setpieceSourceIndex: {
                      anyOf: [
                        {
                          type: 'integer',
                          enum: [0, 1, 2, 3, 4, 5],
                        },
                        { type: 'null' },
                      ],
                      description:
                        'Index of concept verification setpiece (0-5) this milestone traces to; null when no setpiece mapping is used.',
                    },
                    obligatorySceneTag: {
                      anyOf: [{ type: 'string' }, { type: 'null' }],
                      description:
                        'Genre obligation tag assigned to this milestone when it fulfills a required obligatory scene; null otherwise.',
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
