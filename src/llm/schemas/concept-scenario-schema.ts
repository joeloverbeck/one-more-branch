import type { JsonSchema } from '../llm-client-types.js';

const CONCEPT_SCENARIO_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conceptId',
    'escalatingSetpieces',
    'setpieceCausalChainBroken',
    'setpieceCausalLinks',
    'conceptIntegrityScore',
  ],
  properties: {
    conceptId: { type: 'string', minLength: 1 },
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
} as const;

export const CONCEPT_SCENARIO_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_scenario_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['scenarioAnalyses'],
      properties: {
        scenarioAnalyses: {
          type: 'array',
          items: CONCEPT_SCENARIO_ANALYSIS_SCHEMA,
        },
      },
    },
  },
};
