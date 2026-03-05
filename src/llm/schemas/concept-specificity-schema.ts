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

const CONCEPT_SPECIFICITY_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conceptId',
    'signatureScenario',
    'loglineCompressible',
    'logline',
    'premisePromises',
    'inevitabilityStatement',
    'loadBearingCheck',
    'kernelFidelityCheck',
  ],
  properties: {
    conceptId: { type: 'string', minLength: 1 },
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
} as const;

export const CONCEPT_SPECIFICITY_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_specificity_analysis',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['specificityAnalyses'],
      properties: {
        specificityAnalyses: {
          type: 'array',
          items: CONCEPT_SPECIFICITY_ANALYSIS_SCHEMA,
        },
      },
    },
  },
};
