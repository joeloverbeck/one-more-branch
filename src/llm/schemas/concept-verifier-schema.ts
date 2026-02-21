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

const CONCEPT_VERIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'signatureScenario',
    'escalatingSetpieces',
    'inevitabilityStatement',
    'loadBearingCheck',
    'conceptIntegrityScore',
  ],
  properties: {
    signatureScenario: { type: 'string' },
    escalatingSetpieces: {
      type: 'array',
      items: { type: 'string' },
    },
    inevitabilityStatement: { type: 'string' },
    loadBearingCheck: LOAD_BEARING_CHECK_SCHEMA,
    conceptIntegrityScore: { type: 'number' },
  },
} as const;

export const CONCEPT_VERIFIER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_verification',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['verifications'],
      properties: {
        verifications: {
          type: 'array',
          items: CONCEPT_VERIFICATION_SCHEMA,
        },
      },
    },
  },
};
