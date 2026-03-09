import type { JsonSchema } from '../llm-client-types.js';

export const CHARACTER_WEB_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'character_web_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['assignments', 'relationshipArchetypes', 'castDynamicsSummary'],
      properties: {
        assignments: {
          type: 'array',
          description: 'Cast role assignments for each character in the web.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'characterName',
              'isProtagonist',
              'storyFunction',
              'characterDepth',
              'narrativeRole',
              'conflictRelationship',
            ],
            properties: {
              characterName: {
                type: 'string',
                description: 'The character\'s name.',
              },
              isProtagonist: {
                type: 'boolean',
                description: 'True for exactly one character — the protagonist.',
              },
              storyFunction: {
                anyOf: [
                  {
                    type: 'string',
                    enum: [
                      'ANTAGONIST',
                      'RIVAL',
                      'ALLY',
                      'MENTOR',
                      'CATALYST',
                      'OBSTACLE',
                      'FOIL',
                      'TRICKSTER',
                      'INNOCENT',
                    ],
                  },
                ],
                description: 'The character\'s dramatic function in the story.',
              },
              characterDepth: {
                anyOf: [
                  {
                    type: 'string',
                    enum: ['FLAT', 'ROUND'],
                  },
                ],
                description: 'ROUND for major characters, FLAT for minor ones.',
              },
              narrativeRole: {
                type: 'string',
                description: 'One sentence — what this character DOES in the story.',
              },
              conflictRelationship: {
                type: 'string',
                description:
                  'One sentence — how this character creates or resolves conflict for the protagonist.',
              },
            },
          },
        },
        relationshipArchetypes: {
          type: 'array',
          description: 'Lightweight relationship archetypes between character pairs.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'fromCharacter',
              'toCharacter',
              'relationshipType',
              'valence',
              'essentialTension',
            ],
            properties: {
              fromCharacter: {
                type: 'string',
                description: 'Name of the first character.',
              },
              toCharacter: {
                type: 'string',
                description: 'Name of the second character.',
              },
              relationshipType: {
                anyOf: [
                  {
                    type: 'string',
                    enum: [
                      'KIN',
                      'ALLY',
                      'RIVAL',
                      'PATRON',
                      'CLIENT',
                      'MENTOR',
                      'SUBORDINATE',
                      'ROMANTIC',
                      'EX_ROMANTIC',
                      'INFORMANT',
                    ],
                  },
                ],
                description: 'The type of relationship between the characters.',
              },
              valence: {
                anyOf: [
                  {
                    type: 'string',
                    enum: ['POSITIVE', 'NEGATIVE', 'AMBIVALENT'],
                  },
                ],
                description: 'The emotional valence of the relationship.',
              },
              essentialTension: {
                type: 'string',
                description:
                  'One sentence capturing the core dramatic friction in this relationship.',
              },
            },
          },
        },
        castDynamicsSummary: {
          type: 'string',
          description:
            'A paragraph describing overall cast dynamics, alliances, oppositions, and dramatic fault lines.',
        },
      },
    },
  },
};
