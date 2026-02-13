import type { JsonSchema } from '../llm-client-types.js';

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
        'toneKeywords',
        'toneAntiKeywords',
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
        toneKeywords: {
          type: 'array',
          description:
            '3-5 words capturing the target feel of the tone (e.g., ["irreverent", "bawdy", "slapstick", "warm-hearted"]).',
          items: { type: 'string' },
        },
        toneAntiKeywords: {
          type: 'array',
          description:
            '3-5 words describing what the tone should NOT be (e.g., ["grimdark", "portentous", "tragic", "grim"]).',
          items: { type: 'string' },
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
          description: 'Exactly 3 acts following setup, confrontation, and resolution.',
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
                  required: ['name', 'description', 'objective', 'role'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    objective: { type: 'string' },
                    role: {
                      type: 'string',
                      enum: ['setup', 'escalation', 'turning_point', 'resolution'],
                      description: 'Dramatic function of this beat in the story structure.',
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
