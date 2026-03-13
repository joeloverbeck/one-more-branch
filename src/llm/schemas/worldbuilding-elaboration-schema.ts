import type { JsonSchema } from '../llm-client-types.js';

const WORLD_FACT_ELABORATED_SCHEMA = {
  type: 'object' as const,
  additionalProperties: false,
  required: ['id', 'domain', 'fact', 'scope', 'factType'],
  properties: {
    id: { type: 'string' as const, description: 'Stable unique ID, e.g. wf-1, wf-2.' },
    domain: {
      type: 'string' as const,
      enum: [
        'geography', 'ecology', 'history', 'society', 'culture', 'religion',
        'governance', 'economy', 'faction', 'technology', 'magic', 'language',
      ],
      description: 'World fact domain.',
    },
    fact: { type: 'string' as const, description: 'A single atomic worldbuilding proposition.' },
    scope: { type: 'string' as const, description: 'Where/when this fact applies.' },
    factType: {
      type: 'string' as const,
      enum: ['LAW', 'NORM', 'BELIEF', 'DISPUTED', 'RUMOR', 'MYSTERY', 'PRACTICE', 'TABOO'],
      description: 'Epistemic status of this fact.',
    },
    narrativeWeight: {
      type: 'string' as const,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      description: 'How important this fact is for story generation.',
    },
    thematicTag: { type: 'string' as const, description: 'Thematic keyword for this fact.' },
    sensoryHook: { type: 'string' as const, description: 'How this fact manifests sensorily.' },
    exampleEvidence: { type: 'string' as const, description: 'How this fact shows up in-scene.' },
    tensionWithIds: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'IDs of other facts this fact creates tension with.',
    },
    implicationOfIds: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'IDs of facts that imply or lead to this fact.',
    },
    storyFunctions: {
      type: 'array' as const,
      items: { type: 'string' as const, enum: ['EPIC', 'EPISTEMIC', 'DRAMATIC', 'ATMOSPHERIC', 'THEMATIC'] },
      description: 'What story functions this fact serves.',
    },
    sceneAffordances: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Actual choices/conflicts this fact enables in scenes.',
    },
  },
};

export const WORLDBUILDING_ELABORATION_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'worldbuilding_elaboration',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['worldLogline', 'rawWorldMarkdown', 'worldFacts', 'openQuestions'],
      properties: {
        worldLogline: {
          type: 'string',
          description: '1-2 sentence summary of the world logic and primary pressure.',
        },
        rawWorldMarkdown: {
          type: 'string',
          description: 'Author-facing markdown prose describing the world in structured sections.',
        },
        worldFacts: {
          type: 'array',
          description: 'Atomic worldbuilding facts with metadata.',
          items: WORLD_FACT_ELABORATED_SCHEMA,
        },
        openQuestions: {
          type: 'array',
          description: 'Intentionally uncanonized areas for future discovery.',
          items: { type: 'string' },
        },
      },
    },
  },
};
