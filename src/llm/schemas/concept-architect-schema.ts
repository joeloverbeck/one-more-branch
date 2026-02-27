import { SETTING_SCALES } from '../../models/concept-generator.js';
import type { JsonSchema } from '../llm-client-types.js';

export const CONCEPT_CHARACTER_WORLD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'protagonistRole',
    'coreCompetence',
    'coreFlaw',
    'actionVerbs',
    'coreConflictLoop',
    'settingAxioms',
    'constraintSet',
    'keyInstitutions',
    'settingScale',
  ],
  properties: {
    protagonistRole: { type: 'string' },
    coreCompetence: { type: 'string' },
    coreFlaw: { type: 'string' },
    actionVerbs: { type: 'array', items: { type: 'string' } },
    coreConflictLoop: { type: 'string' },
    settingAxioms: { type: 'array', items: { type: 'string' } },
    constraintSet: { type: 'array', items: { type: 'string' } },
    keyInstitutions: { type: 'array', items: { type: 'string' } },
    settingScale: { type: 'string', enum: [...SETTING_SCALES] },
  },
} as const;

export const CONCEPT_ARCHITECT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_architecting',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concepts'],
      properties: {
        concepts: {
          type: 'array',
          items: CONCEPT_CHARACTER_WORLD_SCHEMA,
        },
      },
    },
  },
};
