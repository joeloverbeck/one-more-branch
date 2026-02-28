import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_VERIFICATION_CONSTRAINTS } from '../../models/concept-generator.js';

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
      minItems: CONCEPT_VERIFICATION_CONSTRAINTS.escalatingSetpiecesMin,
      maxItems: CONCEPT_VERIFICATION_CONSTRAINTS.escalatingSetpiecesMax,
      items: { type: 'string' },
    },
    setpieceCausalChainBroken: { type: 'boolean' },
    setpieceCausalLinks: {
      type: 'array',
      minItems: CONCEPT_VERIFICATION_CONSTRAINTS.setpieceCausalLinksMin,
      maxItems: CONCEPT_VERIFICATION_CONSTRAINTS.setpieceCausalLinksMax,
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
