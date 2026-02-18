import { DRIFT_RISK_MITIGATION_TYPES } from '../../models/concept-generator.js';
import type { JsonSchema } from '../llm-client-types.js';
import { CONCEPT_SPEC_SCHEMA } from './concept-ideator-schema.js';

const DRIFT_RISK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['risk', 'mitigation', 'mitigationType'],
  properties: {
    risk: { type: 'string' },
    mitigation: { type: 'string' },
    mitigationType: { type: 'string', enum: [...DRIFT_RISK_MITIGATION_TYPES] },
  },
} as const;

const PLAYER_BREAK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scenario', 'handling', 'constraintUsed'],
  properties: {
    scenario: { type: 'string' },
    handling: { type: 'string' },
    constraintUsed: { type: 'string' },
  },
} as const;

export const CONCEPT_STRESS_TEST_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_stress_test',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['hardenedConcept', 'driftRisks', 'playerBreaks'],
      properties: {
        hardenedConcept: CONCEPT_SPEC_SCHEMA,
        driftRisks: {
          type: 'array',
          items: DRIFT_RISK_SCHEMA,
        },
        playerBreaks: {
          type: 'array',
          items: PLAYER_BREAK_SCHEMA,
        },
      },
    },
  },
};
