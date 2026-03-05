import type { JsonSchema } from '../llm-client-types.js';

export const CONCEPT_SINGLE_SCENARIO_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_single_scenario',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['scenarioAnalysis'],
      properties: {
        scenarioAnalysis: {
          type: 'object',
          additionalProperties: false,
          required: [
            'escalatingSetpieces',
            'setpieceCausalChainBroken',
            'setpieceCausalLinks',
            'conceptIntegrityScore',
          ],
          properties: {
            escalatingSetpieces: {
              type: 'array',
              items: { type: 'string' },
            },
            setpieceCausalChainBroken: { type: 'boolean' },
            setpieceCausalLinks: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
            conceptIntegrityScore: { type: 'number' },
          },
        },
      },
    },
  },
};
