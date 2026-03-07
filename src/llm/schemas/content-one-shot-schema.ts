import { CONTENT_KIND_VALUES } from '../../models/content-packet.js';
import type { JsonSchema } from '../llm-client-types.js';

const CONTENT_ONE_SHOT_PACKET_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'contentKind',
    'coreAnomaly',
    'humanAnchor',
    'socialEngine',
    'choicePressure',
    'signatureImage',
    'escalationHint',
    'wildnessInvariant',
    'dullCollapse',
  ],
  properties: {
    title: { type: 'string' },
    contentKind: { type: 'string', enum: [...CONTENT_KIND_VALUES] },
    coreAnomaly: { type: 'string' },
    humanAnchor: { type: 'string' },
    socialEngine: { type: 'string' },
    choicePressure: { type: 'string' },
    signatureImage: { type: 'string' },
    escalationHint: { type: 'string' },
    wildnessInvariant: { type: 'string' },
    dullCollapse: { type: 'string' },
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
