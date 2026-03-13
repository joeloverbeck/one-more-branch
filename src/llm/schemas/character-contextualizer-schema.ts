import type { JsonSchema } from '../llm-client-types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaProperty = Record<string, any>;

const PROTAGONIST_RELATIONSHIP_SCHEMA: SchemaProperty = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['valence', 'dynamic', 'history', 'currentTension', 'leverage'],
      properties: {
        valence: {
          type: 'number',
          description:
            'Relationship valence from -5 (hostile/antagonistic) to +5 (devoted/unconditional ally). ' +
            '0 = neutral/indifferent.',
        },
        dynamic: {
          type: 'string',
          description:
            'Relationship dynamic label. E.g. "mentor", "rival", "ally", "target", ' +
            '"dependency", "protector", "adversary", "unrequited", "co-conspirator".',
        },
        history: {
          type: 'string',
          description: 'Brief history of the relationship. 1-2 sentences.',
        },
        currentTension: {
          type: 'string',
          description:
            'Active tension or unresolved issue in the relationship right now. 1-2 sentences.',
        },
        leverage: {
          type: 'string',
          description:
            'What this NPC holds over the protagonist or vice versa. 1 sentence.',
        },
      },
    },
    { type: 'null' },
  ],
  description:
    'This character\'s relationship with the protagonist. MUST be null for the protagonist. ' +
    'For NPCs, describe the structured relationship with valence, dynamic, history, tension, and leverage.',
};

export const CHARACTER_CONTEXTUALIZATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'character_contextualization',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['characters'],
      properties: {
        characters: {
          type: 'array',
          description:
            'Contextualized character entries in the same order as input. ' +
            'First entry is the protagonist.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'thematicStance', 'protagonistRelationship'],
            properties: {
              name: {
                type: 'string',
                description: 'Character name — must match the input character name exactly.',
              },
              thematicStance: {
                type: 'string',
                description:
                  'How this character positions relative to the story thematic argument/value at stake. ' +
                  '1 sentence expressing support, tension, contradiction, or transformation potential.',
              },
              protagonistRelationship: PROTAGONIST_RELATIONSHIP_SCHEMA,
            },
          },
        },
      },
    },
  },
};
