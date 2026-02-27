import type { JsonSchema } from '../llm-client-types.js';
import {
  APPROACH_VECTORS,
  BEAT_ROLES,
  CRISIS_TYPES,
  ESCALATION_TYPES,
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
            required: ['name', 'objective', 'stakes', 'entryCondition', 'beats'],
            properties: {
              name: { type: 'string' },
              objective: { type: 'string' },
              stakes: { type: 'string' },
              entryCondition: { type: 'string' },
              beats: {
                type: 'array',
                description: '2-4 beats per act that function as flexible milestones.',
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
                    'crisisType',
                    'isMidpoint',
                    'midpointType',
                    'uniqueScenarioHook',
                    'approachVectors',
                    'setpieceSourceIndex',
                  ],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    objective: { type: 'string' },
                    causalLink: {
                      type: 'string',
                      description:
                        'One sentence describing the cause of this beat. Use prior beat outcomes where possible; first beats should reference inciting conditions.',
                    },
                    role: {
                      type: 'string',
                      enum: [...BEAT_ROLES],
                      description: 'Dramatic function of this beat in the story structure.',
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
                        'For escalation/turning_point beats: HOW stakes rise. Null for setup/reflection/resolution beats.',
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
                        'For escalation/turning_point beats: dilemma shape for the beat. Null for setup/reflection/resolution beats.',
                    },
                    isMidpoint: {
                      type: 'boolean',
                      description:
                        'True for exactly one beat in the full story structure: the midpoint beat. False for all others.',
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
                        'For escalation/turning_point beats: one sentence describing what makes this beat unique to THIS story. Null for setup/reflection/resolution beats.',
                    },
                    approachVectors: {
                      type: ['array', 'null'],
                      description:
                        'For escalation/turning_point beats: 2-3 approach vectors suggesting HOW the protagonist could tackle this beat. Null for setup/reflection/resolution beats.',
                      items: {
                        type: 'string',
                        enum: [...APPROACH_VECTORS],
                      },
                    },
                    setpieceSourceIndex: {
                      anyOf: [
                        {
                          type: 'integer',
                          minimum: 0,
                          maximum: 5,
                        },
                        { type: 'null' },
                      ],
                      description:
                        'Index of concept verification setpiece (0-5) this beat traces to; null when no setpiece mapping is used.',
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
