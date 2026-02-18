import {
  BRANCHING_POSTURES,
  CONFLICT_AXES,
  GENRE_FRAMES,
  SETTING_SCALES,
  STATE_COMPLEXITIES,
} from '../../models/concept-generator.js';
import type { JsonSchema } from '../llm-client-types.js';

export const CONCEPT_SPEC_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'oneLineHook',
    'elevatorParagraph',
    'genreFrame',
    'genreSubversion',
    'protagonistRole',
    'coreCompetence',
    'coreFlaw',
    'actionVerbs',
    'coreConflictLoop',
    'conflictAxis',
    'pressureSource',
    'stakesPersonal',
    'stakesSystemic',
    'deadlineMechanism',
    'settingAxioms',
    'constraintSet',
    'keyInstitutions',
    'settingScale',
    'branchingPosture',
    'stateComplexity',
  ],
  properties: {
    oneLineHook: { type: 'string' },
    elevatorParagraph: { type: 'string' },
    genreFrame: { type: 'string', enum: [...GENRE_FRAMES] },
    genreSubversion: { type: 'string' },
    protagonistRole: { type: 'string' },
    coreCompetence: { type: 'string' },
    coreFlaw: { type: 'string' },
    actionVerbs: { type: 'array', items: { type: 'string' } },
    coreConflictLoop: { type: 'string' },
    conflictAxis: { type: 'string', enum: [...CONFLICT_AXES] },
    pressureSource: { type: 'string' },
    stakesPersonal: { type: 'string' },
    stakesSystemic: { type: 'string' },
    deadlineMechanism: { type: 'string' },
    settingAxioms: { type: 'array', items: { type: 'string' } },
    constraintSet: { type: 'array', items: { type: 'string' } },
    keyInstitutions: { type: 'array', items: { type: 'string' } },
    settingScale: { type: 'string', enum: [...SETTING_SCALES] },
    branchingPosture: { type: 'string', enum: [...BRANCHING_POSTURES] },
    stateComplexity: { type: 'string', enum: [...STATE_COMPLEXITIES] },
  },
} as const;

export const CONCEPT_IDEATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_ideation',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concepts'],
      properties: {
        concepts: {
          type: 'array',
          items: CONCEPT_SPEC_SCHEMA,
        },
      },
    },
  },
};
