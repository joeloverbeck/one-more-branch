import type { JsonSchema } from '../types.js';

export const PAGE_PLANNER_GENERATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'page_planner_generation',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sceneIntent: { type: 'string' },
        continuityAnchors: {
          type: 'array',
          items: { type: 'string' },
        },
        stateIntents: {
          type: 'object',
          properties: {
            currentLocation: { type: 'string' },
            threats: {
              type: 'object',
              properties: {
                add: { type: 'array', items: { type: 'string' } },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            constraints: {
              type: 'object',
              properties: {
                add: { type: 'array', items: { type: 'string' } },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            threads: {
              type: 'object',
              properties: {
                add: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      threadType: {
                        type: 'string',
                        enum: [
                          'MYSTERY',
                          'QUEST',
                          'RELATIONSHIP',
                          'DANGER',
                          'INFORMATION',
                          'RESOURCE',
                          'MORAL',
                        ],
                      },
                      urgency: {
                        type: 'string',
                        enum: ['LOW', 'MEDIUM', 'HIGH'],
                      },
                    },
                    required: ['text', 'threadType', 'urgency'],
                    additionalProperties: false,
                  },
                },
                resolveIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'resolveIds'],
              additionalProperties: false,
            },
            inventory: {
              type: 'object',
              properties: {
                add: { type: 'array', items: { type: 'string' } },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            health: {
              type: 'object',
              properties: {
                add: { type: 'array', items: { type: 'string' } },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            characterState: {
              type: 'object',
              properties: {
                add: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      characterName: { type: 'string' },
                      states: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['characterName', 'states'],
                    additionalProperties: false,
                  },
                },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            canon: {
              type: 'object',
              properties: {
                worldAdd: { type: 'array', items: { type: 'string' } },
                characterAdd: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      characterName: { type: 'string' },
                      facts: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['characterName', 'facts'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['worldAdd', 'characterAdd'],
              additionalProperties: false,
            },
          },
          required: [
            'currentLocation',
            'threats',
            'constraints',
            'threads',
            'inventory',
            'health',
            'characterState',
            'canon',
          ],
          additionalProperties: false,
        },
        writerBrief: {
          type: 'object',
          properties: {
            openingLineDirective: { type: 'string' },
            mustIncludeBeats: { type: 'array', items: { type: 'string' } },
            forbiddenRecaps: { type: 'array', items: { type: 'string' } },
          },
          required: ['openingLineDirective', 'mustIncludeBeats', 'forbiddenRecaps'],
          additionalProperties: false,
        },
      },
      required: ['sceneIntent', 'continuityAnchors', 'stateIntents', 'writerBrief'],
      additionalProperties: false,
    },
  },
};
