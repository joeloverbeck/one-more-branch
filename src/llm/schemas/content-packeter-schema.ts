import { CONTENT_KIND_VALUES } from '../../models/content-packet.js';
import type { JsonSchema } from '../llm-client-types.js';

export function buildContentPacketerSchema(): JsonSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'content_packeter',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['packets'],
        properties: {
          packets: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'contentId',
                'sourceSparkIds',
                'contentKind',
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
                sourceSparkIds: { type: 'array', items: { type: 'string' } },
                contentKind: { type: 'string', enum: [...CONTENT_KIND_VALUES] },
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
            },
          },
        },
      },
    },
  };
}
