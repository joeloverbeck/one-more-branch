import { CONTENT_KIND_VALUES } from '../../models/content-packet.js';
import type { JsonSchema } from '../llm-client-types.js';

export function buildContentSparkstormerSchema(): JsonSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'content_sparkstormer',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['sparks'],
        properties: {
          sparks: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['sparkId', 'contentKind', 'spark', 'imageSeed', 'collisionTags'],
              properties: {
                sparkId: { type: 'string' },
                contentKind: { type: 'string', enum: [...CONTENT_KIND_VALUES] },
                spark: { type: 'string' },
                imageSeed: { type: 'string' },
                collisionTags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  };
}
