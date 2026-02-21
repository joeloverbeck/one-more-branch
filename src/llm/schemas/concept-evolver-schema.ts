import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_SPEC_SCHEMA } from './concept-ideator-schema.js';

export const CONCEPT_EVOLUTION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_evolution',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concepts'],
      properties: {
        concepts: {
          type: 'array',
          minItems: 6,
          maxItems: 6,
          items: CONCEPT_SPEC_SCHEMA,
        },
      },
    },
  },
};
