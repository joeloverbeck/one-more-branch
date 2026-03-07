import { RISK_APPETITE_VALUES } from '../../models/content-packet.js';
import type { JsonSchema } from '../llm-client-types.js';

export function buildContentTasteDistillerSchema(): JsonSchema {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'content_taste_distiller',
      strict: true,
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['tasteProfile'],
        properties: {
          tasteProfile: {
            type: 'object',
            additionalProperties: false,
            required: [
              'collisionPatterns',
              'favoredMechanisms',
              'humanAnchors',
              'socialEngines',
              'toneBlend',
              'sceneAppetites',
              'antiPatterns',
              'surfaceDoNotRepeat',
              'riskAppetite',
            ],
            properties: {
              collisionPatterns: { type: 'array', items: { type: 'string' } },
              favoredMechanisms: { type: 'array', items: { type: 'string' } },
              humanAnchors: { type: 'array', items: { type: 'string' } },
              socialEngines: { type: 'array', items: { type: 'string' } },
              toneBlend: { type: 'array', items: { type: 'string' } },
              sceneAppetites: { type: 'array', items: { type: 'string' } },
              antiPatterns: { type: 'array', items: { type: 'string' } },
              surfaceDoNotRepeat: { type: 'array', items: { type: 'string' } },
              riskAppetite: { type: 'string', enum: [...RISK_APPETITE_VALUES] },
            },
          },
        },
      },
    },
  };
}
