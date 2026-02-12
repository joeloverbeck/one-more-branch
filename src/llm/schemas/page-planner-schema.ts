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
        dramaticQuestion: {
          type: 'string',
          description:
            'The single dramatic question this scene must raise and leave the choices to answer. Example: "Will you risk exposure to save the contact, or protect your cover?"',
        },
        choiceIntents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hook: {
                type: 'string',
                description:
                  'A 1-sentence description of what this choice offers the protagonist.',
              },
              choiceType: {
                type: 'string',
                enum: [
                  'TACTICAL_APPROACH',
                  'MORAL_DILEMMA',
                  'IDENTITY_EXPRESSION',
                  'RELATIONSHIP_SHIFT',
                  'RESOURCE_COMMITMENT',
                  'INVESTIGATION',
                  'PATH_DIVERGENCE',
                  'CONFRONTATION',
                  'AVOIDANCE_RETREAT',
                ],
                description: 'The intended ChoiceType for this choice.',
              },
              primaryDelta: {
                type: 'string',
                enum: [
                  'LOCATION_CHANGE',
                  'GOAL_SHIFT',
                  'RELATIONSHIP_CHANGE',
                  'URGENCY_CHANGE',
                  'ITEM_CONTROL',
                  'EXPOSURE_CHANGE',
                  'CONDITION_CHANGE',
                  'INFORMATION_REVEALED',
                  'THREAT_SHIFT',
                  'CONSTRAINT_CHANGE',
                ],
                description: 'The intended PrimaryDelta for this choice.',
              },
            },
            required: ['hook', 'choiceType', 'primaryDelta'],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 4,
          description:
            'Proposed choice intents for the writer. Each intent suggests a hook, choiceType, and primaryDelta. The writer may adjust these if the narrative takes an unexpected turn.',
        },
      },
      required: [
        'sceneIntent',
        'continuityAnchors',
        'stateIntents',
        'writerBrief',
        'dramaticQuestion',
        'choiceIntents',
      ],
      additionalProperties: false,
    },
  },
};
