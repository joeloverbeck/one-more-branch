import type { JsonSchema } from '../llm-client-types.js';

export const CHARACTER_WEB_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'character_web_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'assignments',
        'relationshipArchetypes',
        'conflictTriangles',
        'allianceFaultLines',
        'castDynamicsSummary',
      ],
      properties: {
        assignments: {
          type: 'array',
          description:
            'Cast role assignments. Each entry must be a being with agency (capable of intention and decision-making), never a location, object, or environmental feature.',
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
              'privateAgenda',
            ],
            properties: {
              characterName: {
                type: 'string',
                description:
                  'Name of a being with agency — capable of decisions and purposeful action. Never a location, environmental feature, or abstract force.',
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
              privateAgenda: {
                type: 'string',
                description:
                  'What this NPC wants independent of the protagonist. Required for non-protagonist ROUND characters. Empty string for the protagonist.',
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
        conflictTriangles: {
          type: 'array',
          description:
            'Sets of 3 characters with incompatible loyalties. At least 1 required if cast has 3+ ROUND characters.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['characters', 'incompatibility'],
            properties: {
              characters: {
                type: 'array',
                description: 'Exactly 3 character names forming the triangle.',
                items: { type: 'string' },
              },
              incompatibility: {
                type: 'string',
                description:
                  'The incompatible loyalty or goal that makes this triangle unstable.',
              },
            },
          },
        },
        allianceFaultLines: {
          type: 'array',
          description: 'Where current alliances could fracture. 0+ entries.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['allies', 'faultLine'],
            properties: {
              allies: {
                type: 'array',
                description: 'Exactly 2 allied character names.',
                items: { type: 'string' },
              },
              faultLine: {
                type: 'string',
                description:
                  'The specific issue or event that could shatter this alliance.',
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
