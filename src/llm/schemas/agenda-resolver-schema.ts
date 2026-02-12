import type { JsonSchema } from '../types.js';

export const AGENDA_RESOLVER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'npc_agenda_resolver',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['updatedAgendas'],
      properties: {
        updatedAgendas: {
          type: 'array',
          description:
            'Agendas that changed due to the scene. Empty array if nothing material changed.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['npcName', 'currentGoal', 'leverage', 'fear', 'offScreenBehavior'],
            properties: {
              npcName: {
                type: 'string',
                description: 'Exact NPC name from the NPC definitions.',
              },
              currentGoal: {
                type: 'string',
                description: 'Updated goal for this NPC (1-2 sentences).',
              },
              leverage: {
                type: 'string',
                description: 'Updated advantage or resource this NPC holds (1-2 sentences).',
              },
              fear: {
                type: 'string',
                description: 'Updated fear or avoidance for this NPC (1-2 sentences).',
              },
              offScreenBehavior: {
                type: 'string',
                description:
                  'What this NPC is doing off-screen after this scene (1-2 sentences).',
              },
            },
          },
        },
      },
    },
  },
};
