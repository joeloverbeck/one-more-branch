import type { JsonSchema } from '../llm-client-types.js';

export const SCENE_QUALITY_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'scene_quality_evaluation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        toneAdherent: {
          type: 'boolean',
          description:
            'True if the narrative prose matches the target tone in mood, vocabulary, and emotional register. False if it drifts toward a different genre feel.',
        },
        toneDriftDescription: {
          type: 'string',
          description:
            'If toneAdherent is false, briefly describes what feels off and what the tone should be. Empty string when toneAdherent is true.',
        },
        thematicCharge: {
          type: 'string',
          enum: ['THESIS_SUPPORTING', 'ANTITHESIS_SUPPORTING', 'AMBIGUOUS'],
          description:
            'Scene-level thematic valence relative to the thematic question and antithesis. THESIS_SUPPORTING when scene outcomes support the thesis-direction answer, ANTITHESIS_SUPPORTING when outcomes support the antithesis-direction answer, AMBIGUOUS when evidence is mixed or unresolved.',
        },
        thematicChargeDescription: {
          type: 'string',
          description:
            '1-2 sentences explaining the thematicCharge classification with concrete scene evidence.',
        },
        narrativeFocus: {
          type: 'string',
          enum: ['DEEPENING', 'BROADENING', 'BALANCED'],
          description:
            'Scene-level depth-vs-breadth focus. DEEPENING develops existing threads/relationships/conflicts; BROADENING introduces new elements or expands scope; BALANCED does both without strong dominance.',
        },
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
        'toneAdherent',
        'toneDriftDescription',
        'thematicCharge',
        'thematicChargeDescription',
        'narrativeFocus',
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
