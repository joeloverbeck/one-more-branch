import type { JsonSchema } from '../llm-client-types.js';

export const AGENDA_RESOLVER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'npc_agenda_resolver',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['updatedAgendas', 'updatedRelationships'],
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
                description: 'What this NPC is doing off-screen after this scene (1-2 sentences).',
              },
            },
          },
        },
        updatedRelationships: {
          type: 'array',
          description:
            'NPC-protagonist relationships that changed due to this scene. Include the FULL updated relationship object for each changed NPC. Empty array if no relationships changed.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'npcName',
              'valence',
              'dynamic',
              'history',
              'currentTension',
              'leverage',
            ],
            properties: {
              npcName: {
                type: 'string',
                description: 'Exact NPC name from the NPC definitions.',
              },
              valence: {
                type: 'number',
                description:
                  'Updated relationship valence (-5 to +5). Negative = hostile/cold, positive = warm/allied.',
              },
              dynamic: {
                type: 'string',
                description:
                  'Updated relationship dynamic label (e.g., mentor, rival, ally, target, dependency, protector).',
              },
              history: {
                type: 'string',
                description: 'Updated relationship history (1-2 sentences).',
              },
              currentTension: {
                type: 'string',
                description:
                  'Updated current tension in the relationship (1-2 sentences).',
              },
              leverage: {
                type: 'string',
                description:
                  'Updated leverage one party holds over the other (1 sentence).',
              },
            },
          },
        },
      },
    },
  },
};
