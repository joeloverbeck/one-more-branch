import type { JsonSchema } from '../llm-client-types.js';
import { MIDPOINT_TYPES } from '../../models/story-arc.js';

const NULLABLE_SIGNATURE_PLACEMENT = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['actIndex', 'description'],
      properties: {
        actIndex: { type: 'integer' },
        description: { type: 'string' },
      },
    },
    { type: 'null' },
  ],
} as const;

export const MACRO_ARCHITECTURE_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'macro_architecture_generation',
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
        'anchorMoments',
        'initialNpcAgendas',
        'setpieceBank',
        'acts',
      ],
      properties: {
        overallTheme: { type: 'string' },
        premise: { type: 'string' },
        openingImage: { type: 'string' },
        closingImage: { type: 'string' },
        pacingBudget: {
          type: 'object',
          additionalProperties: false,
          required: ['targetPagesMin', 'targetPagesMax'],
          properties: {
            targetPagesMin: { type: 'number' },
            targetPagesMax: { type: 'number' },
          },
        },
        anchorMoments: {
          type: 'object',
          additionalProperties: false,
          required: ['incitingIncident', 'midpoint', 'climax', 'signatureScenarioPlacement'],
          properties: {
            incitingIncident: {
              type: 'object',
              additionalProperties: false,
              required: ['actIndex', 'description'],
              properties: {
                actIndex: { type: 'integer' },
                description: { type: 'string' },
              },
            },
            midpoint: {
              type: 'object',
              additionalProperties: false,
              required: ['actIndex', 'milestoneSlot', 'midpointType'],
              properties: {
                actIndex: { type: 'integer' },
                milestoneSlot: { type: 'integer' },
                midpointType: {
                  type: 'string',
                  enum: [...MIDPOINT_TYPES],
                },
              },
            },
            climax: {
              type: 'object',
              additionalProperties: false,
              required: ['actIndex', 'description'],
              properties: {
                actIndex: { type: 'integer' },
                description: { type: 'string' },
              },
            },
            signatureScenarioPlacement: NULLABLE_SIGNATURE_PLACEMENT,
          },
        },
        initialNpcAgendas: {
          type: 'array',
          description: 'Initial NPC agendas. Empty array if no NPCs are relevant at macro stage.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['npcName', 'currentGoal', 'leverage', 'fear', 'offScreenBehavior'],
            properties: {
              npcName: { type: 'string' },
              currentGoal: { type: 'string' },
              leverage: { type: 'string' },
              fear: { type: 'string' },
              offScreenBehavior: { type: 'string' },
            },
          },
        },
        setpieceBank: {
          type: 'array',
          description: '6 concept-specific escalating situations in rising intensity, forming a causal chain from opening to climax.',
          minItems: 6,
          maxItems: 6,
          items: { type: 'string' },
        },
        acts: {
          type: 'array',
          description: '3-5 macro acts. Runtime validation enforces the act-count constraint.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'name',
              'objective',
              'stakes',
              'entryCondition',
              'actQuestion',
              'exitReversal',
              'promiseTargets',
              'obligationTargets',
            ],
            properties: {
              name: { type: 'string' },
              objective: { type: 'string' },
              stakes: { type: 'string' },
              entryCondition: { type: 'string' },
              actQuestion: { type: 'string' },
              exitReversal: { type: 'string' },
              promiseTargets: {
                type: 'array',
                description: 'Premise promises advanced by this act.',
                items: { type: 'string' },
              },
              obligationTargets: {
                type: 'array',
                description: 'Genre obligations allocated to this act.',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
