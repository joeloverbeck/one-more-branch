import type { JsonSchema } from '../llm-client-types.js';

export const SPINE_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'story_spine_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['options'],
      properties: {
        options: {
          type: 'array',
          description: 'Exactly 3 spine options with divergent storySpineType or conflictType.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'centralDramaticQuestion',
              'protagonistNeedVsWant',
              'primaryAntagonisticForce',
              'storySpineType',
              'conflictType',
              'characterArcType',
              'toneFeel',
              'toneAvoid',
            ],
            properties: {
              centralDramaticQuestion: {
                type: 'string',
                description:
                  'The single dramatic question the story exists to answer. One sentence, specific to this character and world.',
              },
              protagonistNeedVsWant: {
                type: 'object',
                additionalProperties: false,
                required: ['need', 'want', 'dynamic'],
                properties: {
                  need: {
                    type: 'string',
                    description:
                      'The inner transformation the protagonist must undergo (what they truly need).',
                  },
                  want: {
                    type: 'string',
                    description:
                      'The outer goal the protagonist consciously pursues (what they think they want).',
                  },
                  dynamic: {
                    type: 'string',
                    enum: ['CONVERGENT', 'DIVERGENT', 'SUBSTITUTIVE', 'IRRECONCILABLE'],
                    description:
                      'How need and want relate: CONVERGENT (achieving want fulfills need), DIVERGENT (want leads away from need), SUBSTITUTIVE (need replaces want), IRRECONCILABLE (cannot satisfy both).',
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
                    description:
                      'What opposes the protagonist. Not necessarily a villain — can be a system, environment, internal flaw, or social pressure.',
                  },
                  pressureMechanism: {
                    type: 'string',
                    description:
                      'How the antagonistic force creates difficult choices that widen the gap between need and want.',
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
                description: 'The primary narrative pattern.',
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
                description: 'The primary source of opposition.',
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
                description:
                  'The type of character arc: POSITIVE_CHANGE (grows), FLAT (tests existing belief), DISILLUSIONMENT (learns hard truth), FALL (loses way), CORRUPTION (becomes what they opposed).',
              },
              toneFeel: {
                type: 'array',
                description:
                  '3-5 atmospheric adjectives describing HOW the story FEELS, not WHAT genre it IS. Derive sensory, emotional, and rhythmic qualities. FORBIDDEN: Do not repeat or paraphrase genre/tone labels. If tone is "grim political fantasy", BAD: ["grim", "political", "fantasy"]. GOOD: ["claustrophobic", "treacherous", "morally-grey", "ash-scented", "hushed"].',
                items: { type: 'string' },
              },
              toneAvoid: {
                type: 'array',
                description:
                  '3-5 tonal anti-patterns the story must never drift toward. These define the negative space. Example for "grim political fantasy": ["whimsical", "slapstick", "heartwarming", "campy"].',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    },
  },
};
