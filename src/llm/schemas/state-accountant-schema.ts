import type { JsonSchema } from '../llm-client-types.js';

export const STATE_ACCOUNTANT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'state_accountant',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        stateIntents: {
          type: 'object',
          properties: {
            currentLocation: { type: 'string' },
            threats: {
              type: 'object',
              properties: {
                add: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      threatType: {
                        type: 'string',
                        enum: ['HOSTILE_AGENT', 'ENVIRONMENTAL', 'CREATURE'],
                      },
                    },
                    required: ['text', 'threatType'],
                    additionalProperties: false,
                  },
                },
                removeIds: { type: 'array', items: { type: 'string' } },
              },
              required: ['add', 'removeIds'],
              additionalProperties: false,
            },
            constraints: {
              type: 'object',
              properties: {
                add: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      constraintType: {
                        type: 'string',
                        enum: ['PHYSICAL', 'ENVIRONMENTAL', 'TEMPORAL'],
                      },
                    },
                    required: ['text', 'constraintType'],
                    additionalProperties: false,
                  },
                },
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
                worldAdd: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      factType: {
                        type: 'string',
                        enum: ['LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY'],
                      },
                    },
                    required: ['text', 'factType'],
                    additionalProperties: false,
                  },
                },
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
      },
      required: ['stateIntents'],
      additionalProperties: false,
    },
  },
};
