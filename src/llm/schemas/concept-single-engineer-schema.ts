import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_ENGINE_SCHEMA } from './concept-engineer-schema.js';

export const CONCEPT_SINGLE_ENGINEER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_single_engineering',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concept'],
      properties: {
        concept: CONCEPT_ENGINE_SCHEMA,
      },
    },
  },
};
