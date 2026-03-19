import { CONTENT_KIND_VALUES } from '../../models/content-taxonomy.js';
import type { JsonSchema } from '../llm-client-types.js';

const CONTENT_ONE_SHOT_PACKET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'contentId',
    'contentKind',
    'sourceExemplarIds',
    'premiseSummary',
    'situationFrame',
    'worldState',
    'coreAnomaly',
    'humanAnchor',
    'socialEngine',
    'choicePressure',
    'signatureImage',
    'escalationPath',
    'wildnessInvariant',
    'dullCollapse',
    'interactionVerbs',
  ],
  properties: {
    contentId: { type: 'string' },
    contentKind: { type: 'string', enum: [...CONTENT_KIND_VALUES] },
    sourceExemplarIds: { type: 'array', items: { type: 'string' } },
    premiseSummary: { type: 'string' },
    situationFrame: { type: 'string' },
    worldState: { type: 'string' },
    viewpointPressure: { type: 'string' },
    coreAnomaly: { type: 'string' },
    humanAnchor: { type: 'string' },
    socialEngine: { type: 'string' },
    choicePressure: { type: 'string' },
    signatureImage: { type: 'string' },
    escalationPath: { type: 'string' },
    wildnessInvariant: { type: 'string' },
    dullCollapse: { type: 'string' },
    interactionVerbs: { type: 'array', items: { type: 'string' } },
  },
} as const;

export function buildContentOneShotSchema(): JsonSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'content_one_shot',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['packets'],
        properties: {
          packets: {
            type: 'array',
            items: CONTENT_ONE_SHOT_PACKET_SCHEMA,
          },
        },
      },
    },
  };
}
