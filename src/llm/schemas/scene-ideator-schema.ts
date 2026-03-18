import type { JsonSchema } from '../llm-client-types.js';
import { DEFAULT_SCENE_IDEA_COUNT, SCENE_IDEA_LANES } from '../scene-ideation-contract.js';
import {
  PACING_MODE_VALUES,
  SCENE_PURPOSE_VALUES,
  VALUE_POLARITY_SHIFT_VALUES,
} from '../../models/scene-direction-taxonomy.js';

export function buildSceneIdeatorSchema(
  targetOptionCount: number = DEFAULT_SCENE_IDEA_COUNT
): JsonSchema {
  return {
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
            description: `Exactly ${targetOptionCount} scene direction options. Each option must use a unique diversityLane. No two options may share the same (scenePurpose, valuePolarityShift) or (diversityLane, scenePurpose) combination.`,
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'diversityLane',
                'scenePurpose',
                'valuePolarityShift',
                'pacingMode',
                'sceneDirection',
                'dramaticJustification',
              ],
              properties: {
                diversityLane: {
                  type: 'string',
                  enum: [...SCENE_IDEA_LANES],
                  description:
                    'The assigned slate lane this option must fulfill. Each option in the slate must use a distinct lane.',
                },
                scenePurpose: {
                  type: 'string',
                  enum: [...SCENE_PURPOSE_VALUES],
                  description: 'The dramatic function this scene serves in the narrative arc.',
                },
                valuePolarityShift: {
                  type: 'string',
                  enum: [...VALUE_POLARITY_SHIFT_VALUES],
                  description: 'How values change within the scene (McKee polarity shift).',
                },
                pacingMode: {
                  type: 'string',
                  enum: [...PACING_MODE_VALUES],
                  description: 'The rhythmic energy of the scene (Swain/Weiland pacing).',
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
}

export const SCENE_IDEATOR_SCHEMA: JsonSchema = buildSceneIdeatorSchema();
