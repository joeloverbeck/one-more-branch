import type { JsonSchema } from '../llm-client-types.js';

export const CHAR_RELATIONSHIPS_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'char_relationships_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['relationships', 'secrets', 'personalDilemmas'],
      properties: {
        relationships: {
          type: 'array',
          description:
            'Full dramatic relationships for the focal character, including history, current tension, and leverage.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'fromCharacter',
              'toCharacter',
              'relationshipType',
              'valence',
              'numericValence',
              'history',
              'currentTension',
              'leverage',
            ],
            properties: {
              fromCharacter: {
                type: 'string',
                description: 'The originating character name.',
              },
              toCharacter: {
                type: 'string',
                description: 'The counterpart character name.',
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
                description: 'The relationship taxonomy label.',
              },
              valence: {
                anyOf: [
                  {
                    type: 'string',
                    enum: ['POSITIVE', 'NEGATIVE', 'AMBIVALENT'],
                  },
                ],
                description: 'The high-level emotional charge of the relationship.',
              },
              numericValence: {
                type: 'number',
                minimum: -5,
                maximum: 5,
                description: 'A numeric relationship score from -5 to 5 inclusive.',
              },
              history: {
                type: 'string',
                description: 'How the relationship became what it is now.',
              },
              currentTension: {
                type: 'string',
                description: 'The unstable pressure shaping the relationship in the present.',
              },
              leverage: {
                type: 'string',
                description: 'What one side can currently use against the other.',
              },
            },
          },
        },
        secrets: {
          type: 'array',
          description: 'Secrets currently kept by the focal character.',
          items: { type: 'string' },
        },
        personalDilemmas: {
          type: 'array',
          description: 'Personal dilemmas currently pressuring the focal character.',
          items: { type: 'string' },
        },
      },
    },
  },
};
