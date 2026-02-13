import type { JsonSchema } from '../llm-client-types.js';

export const ENTITY_DECOMPOSITION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'entity_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['characters', 'worldFacts'],
      properties: {
        characters: {
          type: 'array',
          description:
            'Decomposed character profiles for the protagonist and each NPC. ' +
            'The first entry MUST be the protagonist.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'name',
              'speechFingerprint',
              'coreTraits',
              'motivations',
              'relationships',
              'knowledgeBoundaries',
              'appearance',
            ],
            properties: {
              name: {
                type: 'string',
                description:
                  'Character name. For the protagonist, use the name from the character concept.',
              },
              speechFingerprint: {
                type: 'object',
                additionalProperties: false,
                required: [
                  'catchphrases',
                  'vocabularyProfile',
                  'sentencePatterns',
                  'verbalTics',
                  'dialogueSamples',
                ],
                properties: {
                  catchphrases: {
                    type: 'array',
                    description:
                      'Signature phrases this character would repeat. ' +
                      'Infer from personality, background, and speech style. 1-4 phrases.',
                    items: { type: 'string' },
                  },
                  vocabularyProfile: {
                    type: 'string',
                    description:
                      'Formality level, word preferences, jargon. ' +
                      'E.g. "Formal and archaic, favors multi-syllable words, avoids contractions."',
                  },
                  sentencePatterns: {
                    type: 'string',
                    description:
                      'Typical sentence structure. ' +
                      'E.g. "Short, clipped sentences. Rarely uses questions. Favors imperative mood."',
                  },
                  verbalTics: {
                    type: 'array',
                    description:
                      'Filler words, interjections, habitual speech markers. ' +
                      'E.g. ["well,", "y\'see", "hmm"]. 0-4 items.',
                    items: { type: 'string' },
                  },
                  dialogueSamples: {
                    type: 'array',
                    description:
                      'Write 2-3 example lines this character would say, ' +
                      'showing their unique voice in action. These are invented examples, not quotes.',
                    items: { type: 'string' },
                  },
                },
              },
              coreTraits: {
                type: 'array',
                description: '3-5 defining personality traits. E.g. ["stubborn", "loyal", "sarcastic"].',
                items: { type: 'string' },
              },
              motivations: {
                type: 'string',
                description: 'What drives this character. 1-2 sentences.',
              },
              relationships: {
                type: 'array',
                description:
                  'Key relationships with context. ' +
                  'E.g. ["Mistrusts Kael after the betrayal at Thornwall", "Protective of younger sister Elise"]. ' +
                  'Empty array if no relationships mentioned.',
                items: { type: 'string' },
              },
              knowledgeBoundaries: {
                type: 'string',
                description:
                  'What this character knows and does NOT know. Important for preventing ' +
                  'information leaks between characters. 1-2 sentences.',
              },
              appearance: {
                type: 'string',
                description: 'Brief physical description. 1-2 sentences.',
              },
            },
          },
        },
        worldFacts: {
          type: 'array',
          description:
            'Atomic worldbuilding facts decomposed from the raw worldbuilding text. ' +
            'Each fact should be a single proposition. Empty array if no worldbuilding provided.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['domain', 'fact', 'scope'],
            properties: {
              domain: {
                type: 'string',
                enum: ['geography', 'magic', 'society', 'faction', 'history', 'technology', 'custom'],
                description: 'Category of this worldbuilding fact.',
              },
              fact: {
                type: 'string',
                description: 'A single atomic worldbuilding proposition.',
              },
              scope: {
                type: 'string',
                description:
                  'Where/when this fact applies. ' +
                  'E.g. "Entire realm", "Northern provinces only", "During the Blood Moon".',
              },
            },
          },
        },
      },
    },
  },
};
