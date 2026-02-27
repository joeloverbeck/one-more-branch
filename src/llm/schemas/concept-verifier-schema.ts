import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_VERIFICATION_CONSTRAINTS } from '../../models/concept-generator.js';

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

const CONCEPT_VERIFICATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'conceptId',
    'signatureScenario',
    'loglineCompressible',
    'logline',
    'premisePromises',
    'escalatingSetpieces',
    'setpieceCausalChainBroken',
    'setpieceCausalLinks',
    'inevitabilityStatement',
    'loadBearingCheck',
    'kernelFidelityCheck',
    'conceptIntegrityScore',
  ],
  properties: {
    conceptId: { type: 'string', minLength: 1 },
    signatureScenario: { type: 'string' },
    loglineCompressible: { type: 'boolean' },
    logline: { type: 'string', minLength: 1 },
    premisePromises: {
      type: 'array',
      minItems: CONCEPT_VERIFICATION_CONSTRAINTS.premisePromisesMin,
      maxItems: CONCEPT_VERIFICATION_CONSTRAINTS.premisePromisesMax,
      items: { type: 'string', minLength: 1 },
    },
    escalatingSetpieces: {
      type: 'array',
      minItems: CONCEPT_VERIFICATION_CONSTRAINTS.escalatingSetpiecesCount,
      maxItems: CONCEPT_VERIFICATION_CONSTRAINTS.escalatingSetpiecesCount,
      items: { type: 'string' },
    },
    setpieceCausalChainBroken: { type: 'boolean' },
    setpieceCausalLinks: {
      type: 'array',
      minItems: CONCEPT_VERIFICATION_CONSTRAINTS.setpieceCausalLinksCount,
      maxItems: CONCEPT_VERIFICATION_CONSTRAINTS.setpieceCausalLinksCount,
      items: { type: 'string', minLength: 1 },
    },
    inevitabilityStatement: { type: 'string' },
    loadBearingCheck: LOAD_BEARING_CHECK_SCHEMA,
    kernelFidelityCheck: KERNEL_FIDELITY_CHECK_SCHEMA,
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
