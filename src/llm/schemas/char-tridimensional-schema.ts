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
        'coreTraits',
        'formativeWound',
        'protectiveMask',
        'misbelief',
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
        coreTraits: {
          type: 'array',
          description:
            '5-8 defining behavioral traits that emerge from the three dimensions. These are the tendencies a writer needs to portray this character consistently.',
          items: { type: 'string' },
        },
        formativeWound: {
          type: 'string',
          description:
            "The defining early experience that shaped this character's defenses. 1-2 sentences.",
        },
        protectiveMask: {
          type: 'string',
          description:
            'The persona this character projects to hide or compensate for their wound. 1 sentence.',
        },
        misbelief: {
          type: 'string',
          description:
            'The false conclusion the character drew from their wound that distorts their worldview. 1 sentence.',
        },
      },
    },
  },
};
