import type { GenreFrame } from '../../models/concept-generator.js';
import type { JsonSchema } from '../llm-client-types.js';
import { buildConceptSpecSchema, CONCEPT_SPEC_SCHEMA } from './concept-ideator-schema.js';

export function buildConceptEvolutionSchema(
  excludedGenres?: readonly GenreFrame[],
): JsonSchema {
  return {
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
            minItems: 1,
            items: buildConceptSpecSchema(excludedGenres),
          },
        },
      },
    },
  };
}

/** @deprecated Use buildConceptEvolutionSchema() for new code */
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
          minItems: 1,
          items: CONCEPT_SPEC_SCHEMA,
        },
      },
    },
  },
};
