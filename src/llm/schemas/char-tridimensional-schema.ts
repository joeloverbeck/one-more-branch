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
        'formativeWound',
        'protectiveMask',
        'misbelief',
        'credibleSurprises',
        'implausibleMoves',
        'stressTells',
        'attachmentStyle',
        'traitToSceneAffordances',
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
        credibleSurprises: {
          type: 'array',
          description:
            '2-3 actions that initially seem out of pattern but become inevitable in light of wound + need + pressure.',
          items: { type: 'string' },
        },
        implausibleMoves: {
          type: 'array',
          description:
            '2-3 actions that would break character integrity — the outer boundary of what this character could never do.',
          items: { type: 'string' },
        },
        stressTells: {
          type: 'array',
          description:
            '2-4 physical/behavioral tells when under pressure. Bridges physiology to drama.',
          items: { type: 'string' },
        },
        attachmentStyle: {
          type: 'string',
          description:
            'How this character forms and maintains bonds. 1 sentence.',
        },
        traitToSceneAffordances: {
          type: 'array',
          description:
            "2-4 entries linking a core trait to what it enables or blocks in scenes. E.g. \"Her stubbornness means she'll hold a position past the point of reason, creating escalation opportunities.\"",
          items: { type: 'string' },
        },
      },
    },
  },
};
