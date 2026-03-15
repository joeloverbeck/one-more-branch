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
              'ruptureTriggers',
              'repairMoves',
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
              ruptureTriggers: {
                type: 'array',
                description: '1-3 specific events or revelations that would shatter this relationship.',
                items: { type: 'string' },
              },
              repairMoves: {
                type: 'array',
                description: '1-3 specific actions that could mend this relationship after damage.',
                items: { type: 'string' },
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
