import type { JsonSchema } from '../llm-client-types.js';

export const CONCEPT_ENGINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'pressureSource',
    'stakesPersonal',
    'stakesSystemic',
    'deadlineMechanism',
    'ironicTwist',
    'incitingDisruption',
    'escapeValve',
    'elevatorParagraph',
    'protagonistLie',
    'protagonistTruth',
    'protagonistGhost',
    'wantNeedCollisionSketch',
  ],
  properties: {
    pressureSource: { type: 'string' },
    stakesPersonal: { type: 'string' },
    stakesSystemic: { type: 'string' },
    deadlineMechanism: { type: 'string' },
    ironicTwist: { type: 'string' },
    incitingDisruption: { type: 'string' },
    escapeValve: { type: 'string' },
    elevatorParagraph: { type: 'string' },
    protagonistLie: { type: 'string' },
    protagonistTruth: { type: 'string' },
    protagonistGhost: { type: 'string' },
    wantNeedCollisionSketch: { type: 'string' },
  },
} as const;

export const CONCEPT_ENGINEER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_engineering',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concepts'],
      properties: {
        concepts: {
          type: 'array',
          items: CONCEPT_ENGINE_SCHEMA,
        },
      },
    },
  },
};
