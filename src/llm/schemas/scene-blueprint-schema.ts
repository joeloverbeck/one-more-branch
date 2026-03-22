import type { JsonSchema } from '../llm-client-types.js';
import {
  SCENE_BLUEPRINT_REQUIRED_FIELDS,
  NARRATIVE_UNIT_REQUIRED_FIELDS,
  SCENE_FUNCTION_VALUES,
  MRU_TYPE_VALUES,
} from '../scene-blueprint-contract.js';

export const SCENE_BLUEPRINT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'scene_blueprint',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        units: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              emotionalRegister: { type: 'string' },
              sceneFunction: {
                type: 'string',
                enum: [...SCENE_FUNCTION_VALUES],
              },
              mruType: {
                type: 'string',
                enum: [...MRU_TYPE_VALUES],
              },
              sensoryAnchor: { type: 'string' },
              paragraphWeight: { type: 'integer' },
              speakingCharacters: {
                anyOf: [
                  { type: 'array', items: { type: 'string' } },
                  { type: 'null' },
                ],
              },
            },
            required: [...NARRATIVE_UNIT_REQUIRED_FIELDS, 'speakingCharacters'],
            additionalProperties: false,
          },
        },
        emotionalArc: { type: 'string' },
        mandateMapping: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mandate: { type: 'string' },
              unitIndex: { type: 'integer' },
            },
            required: ['mandate', 'unitIndex'],
            additionalProperties: false,
          },
        },
      },
      required: [...SCENE_BLUEPRINT_REQUIRED_FIELDS],
      additionalProperties: false,
    },
  },
};
