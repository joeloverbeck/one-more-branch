import type { JsonSchema } from '../llm-client-types.js';

export const SPINE_FOUNDATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'spine_foundation_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['foundations'],
      properties: {
        foundations: {
          type: 'array',
          description: '5-6 thematic foundations with divergent conflictAxis and characterArcType.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'conflictAxis',
              'characterArcType',
              'protagonistDeepestFear',
              'toneFeel',
              'toneAvoid',
              'thematicPremise',
            ],
            properties: {
              conflictAxis: {
                type: 'string',
                enum: [
                  'INDIVIDUAL_VS_SYSTEM',
                  'TRUTH_VS_STABILITY',
                  'DUTY_VS_DESIRE',
                  'FREEDOM_VS_SAFETY',
                  'KNOWLEDGE_VS_INNOCENCE',
                  'POWER_VS_MORALITY',
                  'LOYALTY_VS_SURVIVAL',
                  'IDENTITY_VS_BELONGING',
                  'JUSTICE_VS_MERCY',
                  'PROGRESS_VS_TRADITION',
                ],
                description: 'The thematic tension axis that frames the conflict.',
              },
              characterArcType: {
                type: 'string',
                enum: [
                  'POSITIVE_CHANGE',
                  'FLAT',
                  'DISILLUSIONMENT',
                  'FALL',
                  'CORRUPTION',
                ],
                description: 'The character arc trajectory.',
              },
              protagonistDeepestFear: {
                type: 'string',
                description:
                  'The fear that drives the protagonist to resist transformation. One sentence.',
              },
              toneFeel: {
                type: 'array',
                description:
                  '3-5 atmospheric adjectives describing HOW the story FEELS. Sensory, emotional, rhythmic qualities — NOT genre labels.',
                items: { type: 'string' },
              },
              toneAvoid: {
                type: 'array',
                description:
                  '3-5 tonal anti-patterns the story must never drift toward.',
                items: { type: 'string' },
              },
              thematicPremise: {
                type: 'string',
                description:
                  'Egri-style one-line premise (e.g., "Ruthless ambition leads to self-destruction"). Scaffolding for Stage 2.',
              },
            },
          },
        },
      },
    },
  },
};
