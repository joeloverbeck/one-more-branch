import type { JsonSchema } from '../llm-client-types.js';

export const NPC_INTELLIGENCE_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'npc_intelligence_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        npcCoherenceAdherent: {
          type: 'boolean',
          description:
            'True if NPCs in the scene acted consistently with their stated agendas. True when no NPC agendas are provided.',
        },
        npcCoherenceIssues: {
          type: 'string',
          description:
            'If npcCoherenceAdherent is false, briefly names the NPC and explains the inconsistency. Empty string when coherent or no agendas.',
        },
        relationshipShiftsDetected: {
          type: 'array',
          description:
            'NPC relationship shifts with the protagonist observed in this scene. Only flag significant changes, not routine interactions. Empty array if no shifts detected.',
          items: {
            type: 'object',
            properties: {
              npcName: {
                type: 'string',
                description: 'Exact NPC name.',
              },
              shiftDescription: {
                type: 'string',
                description: 'What changed in the relationship (1-2 sentences).',
              },
              suggestedValenceChange: {
                type: 'number',
                description:
                  'Suggested change to valence score (-3 to +3). Positive = warmer, negative = colder.',
              },
              suggestedNewDynamic: {
                type: 'string',
                description:
                  'New dynamic label if the relationship dynamic itself changed. Empty string if dynamic unchanged.',
              },
            },
            required: [
              'npcName',
              'shiftDescription',
              'suggestedValenceChange',
              'suggestedNewDynamic',
            ],
            additionalProperties: false,
          },
        },
        knowledgeAsymmetryDetected: {
          type: 'array',
          description:
            'Per-character information-asymmetry observations evidenced by this scene. Empty array when no meaningful updates are observed.',
          items: {
            type: 'object',
            properties: {
              characterName: { type: 'string' },
              knownFacts: { type: 'array', items: { type: 'string' } },
              falseBeliefs: { type: 'array', items: { type: 'string' } },
              secrets: { type: 'array', items: { type: 'string' } },
            },
            required: ['characterName', 'knownFacts', 'falseBeliefs', 'secrets'],
            additionalProperties: false,
          },
        },
        dramaticIronyOpportunities: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Concrete dramatic irony opportunities surfaced by this scene (player/protagonist vs character knowledge gaps). Empty array when none.',
        },
      },
      required: [
        'npcCoherenceAdherent',
        'npcCoherenceIssues',
        'relationshipShiftsDetected',
        'knowledgeAsymmetryDetected',
        'dramaticIronyOpportunities',
      ],
      additionalProperties: false,
    },
  },
};
