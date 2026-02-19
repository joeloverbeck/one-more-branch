import type { JsonSchema } from '../llm-client-types.js';

export const SPINE_REWRITE_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'spine_rewrite',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'centralDramaticQuestion',
        'protagonistNeedVsWant',
        'primaryAntagonisticForce',
        'storySpineType',
        'conflictAxis',
        'conflictType',
        'characterArcType',
        'toneFeel',
        'toneAvoid',
      ],
      properties: {
        centralDramaticQuestion: {
          type: 'string',
          description:
            'The NEW central dramatic question the story will now explore. Must account for what has already happened.',
        },
        protagonistNeedVsWant: {
          type: 'object',
          additionalProperties: false,
          required: ['need', 'want', 'dynamic'],
          properties: {
            need: {
              type: 'string',
              description: 'The NEW inner transformation the protagonist must undergo.',
            },
            want: {
              type: 'string',
              description: 'The NEW outer goal the protagonist consciously pursues.',
            },
            dynamic: {
              type: 'string',
              enum: ['CONVERGENT', 'DIVERGENT', 'SUBSTITUTIVE', 'IRRECONCILABLE'],
              description: 'How the new need and want relate.',
            },
          },
        },
        primaryAntagonisticForce: {
          type: 'object',
          additionalProperties: false,
          required: ['description', 'pressureMechanism'],
          properties: {
            description: {
              type: 'string',
              description: 'The NEW antagonistic force that opposes the protagonist.',
            },
            pressureMechanism: {
              type: 'string',
              description:
                'How the new antagonistic force creates difficult choices that widen the gap between need and want.',
            },
          },
        },
        storySpineType: {
          type: 'string',
          enum: [
            'QUEST',
            'SURVIVAL',
            'ESCAPE',
            'REVENGE',
            'RESCUE',
            'RIVALRY',
            'MYSTERY',
            'TEMPTATION',
            'TRANSFORMATION',
            'FORBIDDEN_LOVE',
            'SACRIFICE',
            'FALL_FROM_GRACE',
            'RISE_TO_POWER',
            'COMING_OF_AGE',
            'REBELLION',
          ],
          description: 'The new primary narrative pattern.',
        },
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
          ],
          description: 'The new thematic tension axis guiding the rewritten spine.',
        },
        conflictType: {
          type: 'string',
          enum: [
            'PERSON_VS_PERSON',
            'PERSON_VS_SELF',
            'PERSON_VS_SOCIETY',
            'PERSON_VS_NATURE',
            'PERSON_VS_TECHNOLOGY',
            'PERSON_VS_SUPERNATURAL',
            'PERSON_VS_FATE',
          ],
          description: 'The new primary source of opposition.',
        },
        characterArcType: {
          type: 'string',
          enum: ['POSITIVE_CHANGE', 'FLAT', 'DISILLUSIONMENT', 'FALL', 'CORRUPTION'],
          description: 'The new character arc trajectory.',
        },
        toneFeel: {
          type: 'array',
          description:
            '3-5 atmospheric adjectives describing HOW the rewritten story FEELS, not WHAT genre it IS. Derive sensory, emotional, and rhythmic qualities. FORBIDDEN: Do not repeat or paraphrase genre/tone labels.',
          items: { type: 'string' },
        },
        toneAvoid: {
          type: 'array',
          description:
            '3-5 tonal anti-patterns the rewritten story must never drift toward.',
          items: { type: 'string' },
        },
      },
    },
  },
};
