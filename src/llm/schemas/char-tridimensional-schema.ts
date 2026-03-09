import type { JsonSchema } from '../llm-client-types.js';

export const CHAR_TRIDIMENSIONAL_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'char_tridimensional_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'characterName',
        'physiology',
        'sociology',
        'psychology',
        'derivationChain',
        'coreTraits',
      ],
      properties: {
        characterName: {
          type: 'string',
          description:
            "The character's name, matching the name from the character web assignment.",
        },
        physiology: {
          type: 'string',
          description:
            "The character's physical dimension — body, appearance, health, heredity, defects. Each trait should create dramatic friction with their objectives or role.",
        },
        sociology: {
          type: 'string',
          description:
            "The character's environmental dimension — class, occupation, education, home life, religion, community standing. These shape how the character pursues their super-objective.",
        },
        psychology: {
          type: 'string',
          description:
            "The character's mental dimension — moral standards, temperament, complexes, abilities, attitude toward life. Must logically follow from physiology and sociology interacting.",
        },
        derivationChain: {
          type: 'string',
          description:
            'Explicit reasoning chain showing how each dimension was derived from the character kernel and cast role. Demonstrates the logical connections between dramatic needs and character details.',
        },
        coreTraits: {
          type: 'array',
          description:
            '5-8 defining behavioral traits that emerge from the three dimensions. These are the tendencies a writer needs to portray this character consistently.',
          items: { type: 'string' },
        },
      },
    },
  },
};
