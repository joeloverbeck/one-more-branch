import type { JsonSchema } from '../llm-client-types.js';

const LOAD_BEARING_CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['passes', 'reasoning', 'genericCollapse'],
  properties: {
    passes: { type: 'boolean' },
    reasoning: { type: 'string' },
    genericCollapse: { type: 'string' },
  },
} as const;

const KERNEL_FIDELITY_CHECK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['passes', 'reasoning', 'kernelDrift'],
  properties: {
    passes: { type: 'boolean' },
    reasoning: { type: 'string' },
    kernelDrift: { type: 'string' },
  },
} as const;

export const CONCEPT_SINGLE_SPECIFICITY_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_single_specificity',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['specificityAnalysis'],
      properties: {
        specificityAnalysis: {
          type: 'object',
          additionalProperties: false,
          required: [
            'signatureScenario',
            'loglineCompressible',
            'logline',
            'premisePromises',
            'inevitabilityStatement',
            'loadBearingCheck',
            'kernelFidelityCheck',
          ],
          properties: {
            signatureScenario: { type: 'string' },
            loglineCompressible: { type: 'boolean' },
            logline: { type: 'string', minLength: 1 },
            premisePromises: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
            inevitabilityStatement: { type: 'string' },
            loadBearingCheck: LOAD_BEARING_CHECK_SCHEMA,
            kernelFidelityCheck: KERNEL_FIDELITY_CHECK_SCHEMA,
          },
        },
      },
    },
  },
};
