import type { JsonSchema } from '../llm-client-types.js';

export const CHAR_AGENCY_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'char_agency_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'characterName',
        'replanningPolicy',
        'emotionSalience',
        'coreBeliefs',
        'desires',
        'currentIntentions',
        'falseBeliefs',
        'decisionPattern',
        'focalizationFilter',
        'escalationLadder',
      ],
      properties: {
        characterName: {
          type: 'string',
          description: "The character's name, matching the name from the character web assignment.",
        },
        replanningPolicy: {
          anyOf: [
            {
              type: 'string',
              enum: ['NEVER', 'ON_FAILURE', 'ON_NEW_INFORMATION', 'PERIODIC'],
            },
          ],
          description: 'When this character changes course in response to pressure or new developments.',
        },
        emotionSalience: {
          anyOf: [
            {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH'],
            },
          ],
          description: 'How strongly the character\'s emotional state steers moment-to-moment decisions.',
        },
        coreBeliefs: {
          type: 'array',
          description: 'The convictions and assumptions the character uses to justify action.',
          items: { type: 'string' },
        },
        desires: {
          type: 'array',
          description: 'The enduring wants that shape the character\'s behavior.',
          items: { type: 'string' },
        },
        currentIntentions: {
          type: 'array',
          description: 'The near-term actions or pursuits the character is actively trying to carry out.',
          items: { type: 'string' },
        },
        falseBeliefs: {
          type: 'array',
          description: 'Incorrect assumptions, blind spots, or misreadings that create dramatic friction.',
          items: { type: 'string' },
        },
        decisionPattern: {
          type: 'string',
          description: 'A concise explanation of how the character typically makes decisions under pressure.',
        },
        focalizationFilter: {
          type: 'object',
          additionalProperties: false,
          required: ['noticesFirst', 'systematicallyMisses', 'misreadsAs'],
          properties: {
            noticesFirst: {
              type: 'string',
              description:
                'What this character attends to before anything else in a room or situation.',
            },
            systematicallyMisses: {
              type: 'string',
              description: 'What this character consistently overlooks or underweights.',
            },
            misreadsAs: {
              type: 'string',
              description: 'How this character systematically misinterprets certain cues.',
            },
          },
        },
        escalationLadder: {
          type: 'array',
          description:
            '3-5 ordered steps showing how this character escalates when blocked. From mild to extreme.',
          items: { type: 'string' },
        },
      },
    },
  },
};
