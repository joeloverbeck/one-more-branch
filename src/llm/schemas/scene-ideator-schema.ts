import type { JsonSchema } from '../llm-client-types.js';

export const SCENE_IDEATOR_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'scene_direction_ideation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['options'],
      properties: {
        options: {
          type: 'array',
          description:
            'Exactly 3 scene direction options. No two may share the same (scenePurpose, valuePolarityShift) combination.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'scenePurpose',
              'valuePolarityShift',
              'pacingMode',
              'sceneDirection',
              'dramaticJustification',
            ],
            properties: {
              scenePurpose: {
                type: 'string',
                enum: [
                  'EXPOSITION',
                  'INCITING_INCIDENT',
                  'RISING_COMPLICATION',
                  'REVERSAL',
                  'REVELATION',
                  'CONFRONTATION',
                  'NEGOTIATION',
                  'INVESTIGATION',
                  'PREPARATION',
                  'ESCAPE',
                  'PURSUIT',
                  'SACRIFICE',
                  'BETRAYAL',
                  'REUNION',
                  'TRANSFORMATION',
                  'CLIMACTIC_CHOICE',
                  'AFTERMATH',
                ],
                description:
                  'The dramatic function this scene serves in the narrative arc.',
              },
              valuePolarityShift: {
                type: 'string',
                enum: [
                  'POSITIVE_TO_NEGATIVE',
                  'NEGATIVE_TO_POSITIVE',
                  'POSITIVE_TO_DOUBLE_NEGATIVE',
                  'NEGATIVE_TO_DOUBLE_POSITIVE',
                  'IRONIC_SHIFT',
                ],
                description:
                  'How values change within the scene (McKee polarity shift).',
              },
              pacingMode: {
                type: 'string',
                enum: [
                  'ACCELERATING',
                  'DECELERATING',
                  'SUSTAINED_HIGH',
                  'OSCILLATING',
                  'BUILDING_SLOW',
                ],
                description:
                  'The rhythmic energy of the scene (Swain/Weiland pacing).',
              },
              sceneDirection: {
                type: 'string',
                description:
                  'A 2-3 sentence description of what happens in this scene direction. Concrete and specific to the current story state.',
              },
              dramaticJustification: {
                type: 'string',
                description:
                  'A 1-2 sentence explanation of WHY this scene direction serves the story right now — referencing structure, character arc, or thematic needs.',
              },
            },
          },
        },
      },
    },
  },
};
