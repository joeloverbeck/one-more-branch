import { CONFLICT_AXES, GENRE_FRAMES } from '../../models/concept-generator.js';
import { CONFLICT_TYPE_VALUES } from '../../models/story-spine.js';
import type { JsonSchema } from '../llm-client-types.js';

export const CONCEPT_SEED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'oneLineHook',
    'genreFrame',
    'genreSubversion',
    'conflictAxis',
    'conflictType',
    'whatIfQuestion',
    'playerFantasy',
  ],
  properties: {
    oneLineHook: { type: 'string' },
    genreFrame: { type: 'string', enum: [...GENRE_FRAMES] },
    genreSubversion: { type: 'string' },
    conflictAxis: { type: 'string', enum: [...CONFLICT_AXES] },
    conflictType: { type: 'string', enum: [...CONFLICT_TYPE_VALUES] },
    whatIfQuestion: { type: 'string' },
    playerFantasy: { type: 'string' },
  },
} as const;

export const CONCEPT_SEEDER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'concept_seeding',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['concepts'],
      properties: {
        concepts: {
          type: 'array',
          items: CONCEPT_SEED_SCHEMA,
        },
      },
    },
  },
};
