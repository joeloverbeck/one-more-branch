import type { JsonSchema } from '../llm-client-types.js';
import { WORLD_FACTS_ARRAY_SCHEMA } from './entity-decomposer-schema.js';

export const WORLD_DECOMPOSITION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'world_decomposition',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['worldFacts'],
      properties: {
        worldFacts: WORLD_FACTS_ARRAY_SCHEMA,
      },
    },
  },
};
