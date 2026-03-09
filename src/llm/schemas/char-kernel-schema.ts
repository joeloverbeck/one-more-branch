import type { JsonSchema } from '../llm-client-types.js';

export const CHAR_KERNEL_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'char_kernel_generation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'characterName',
        'superObjective',
        'immediateObjectives',
        'primaryOpposition',
        'stakes',
        'constraints',
        'pressurePoint',
      ],
      properties: {
        characterName: {
          type: 'string',
          description: "The character's name, matching the name from the character web assignment.",
        },
        superObjective: {
          type: 'string',
          description:
            "The character's overarching dramatic goal — the deepest want that drives all their actions across the story.",
        },
        immediateObjectives: {
          type: 'array',
          description:
            'Concrete, near-term goals the character is actively pursuing at the start of the story.',
          items: { type: 'string' },
        },
        primaryOpposition: {
          type: 'string',
          description:
            'The main force, person, or circumstance standing between the character and their super-objective.',
        },
        stakes: {
          type: 'array',
          description:
            'What the character stands to lose or gain — the consequences that make the conflict matter.',
          items: { type: 'string' },
        },
        constraints: {
          type: 'array',
          description:
            'Internal or external limitations that restrict the character — moral codes, physical limits, social obligations, secrets.',
          items: { type: 'string' },
        },
        pressurePoint: {
          type: 'string',
          description:
            'The specific vulnerability or weak spot that, when pressed, forces the character to act against their own interests or reveal their true nature.',
        },
      },
    },
  },
};
