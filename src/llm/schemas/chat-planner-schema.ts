import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  ACTION_PLAN_KIND_VALUES,
  CHAT_BLOCK_TYPE_VALUES,
  HONESTY_MODE_VALUES,
  SPEECH_ACT_VALUES,
  TURN_TARGET_LENGTH_VALUES,
  type TurnPlannerOutput,
  isTurnPlannerOutput,
} from '../../models/chat/index.js';

function buildStringArraySchema(description: string): Record<string, unknown> {
  return {
    type: 'array',
    description,
    items: {
      type: 'string',
    },
  };
}

function buildNullableStringSchema(description: string): Record<string, unknown> {
  return {
    description,
    anyOf: [{ type: 'string' }, { type: 'null' }],
  };
}

export const CHAT_PLANNER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_planner',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'internalSelfCheck',
        'responseGoal',
        'speechAct',
        'honestyMode',
        'surfaceEmotion',
        'suppressedEmotion',
        'subtext',
        'mustAddress',
        'mustAvoid',
        'blockPlan',
        'actionPlan',
        'questionBack',
        'targetLength',
        'expectedImpact',
      ],
      properties: {
        internalSelfCheck: {
          type: 'object',
          additionalProperties: false,
          required: ['whatDoIWant', 'whatDoIKnow', 'whatAmIHiding', 'howHonestAmI'],
          properties: {
            whatDoIWant: {
              type: 'string',
              description: 'What the character wants from this turn.',
            },
            whatDoIKnow: {
              type: 'string',
              description: 'What the character knows that should shape the response.',
            },
            whatAmIHiding: {
              type: 'string',
              description: 'What the character is hiding, withholding, or protecting.',
            },
            howHonestAmI: {
              type: 'string',
              description: 'How the character internally frames their level of honesty.',
            },
          },
        },
        responseGoal: {
          type: 'string',
          description: 'The primary strategic goal of the next reply.',
        },
        speechAct: {
          type: 'string',
          enum: [...SPEECH_ACT_VALUES],
          description: 'Dominant speech act driving the turn.',
        },
        honestyMode: {
          type: 'string',
          enum: [...HONESTY_MODE_VALUES],
          description: 'How honest the character will be in this turn.',
        },
        surfaceEmotion: {
          type: 'string',
          description: 'Emotion visibly expressed on the surface.',
        },
        suppressedEmotion: buildNullableStringSchema(
          'Emotion present underneath the surface but actively suppressed.'
        ),
        subtext: {
          type: 'string',
          description: 'What the turn is really doing underneath the literal words.',
        },
        mustAddress: buildStringArraySchema(
          'Points the turn must explicitly respond to or account for.'
        ),
        mustAvoid: buildStringArraySchema(
          'Topics, admissions, or moves the turn must avoid.'
        ),
        blockPlan: {
          type: 'array',
          description: 'Ordered visible block sequence for the downstream writer.',
          items: {
            type: 'string',
            enum: [...CHAT_BLOCK_TYPE_VALUES],
          },
        },
        actionPlan: {
          type: 'array',
          description: 'Specific physical actions or cues to incorporate into the turn.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'text', 'changesPhysicalState'],
            properties: {
              kind: {
                type: 'string',
                enum: [...ACTION_PLAN_KIND_VALUES],
                description: 'Kind of action cue being planned.',
              },
              text: {
                type: 'string',
                description: 'Concrete physical action or cue.',
              },
              changesPhysicalState: {
                type: 'boolean',
                description: 'Whether the action changes the physical state materially.',
              },
            },
          },
        },
        questionBack: buildNullableStringSchema(
          'A question the character intends to throw back, if any.'
        ),
        targetLength: {
          type: 'string',
          enum: [...TURN_TARGET_LENGTH_VALUES],
          description: 'Desired reply length bucket.',
        },
        expectedImpact: {
          type: 'object',
          additionalProperties: false,
          required: ['relationshipDeltaHint', 'tensionDeltaHint', 'revealsSecret'],
          properties: {
            relationshipDeltaHint: {
              type: 'number',
              description: 'Expected near-term relationship delta hint.',
            },
            tensionDeltaHint: {
              type: 'number',
              description: 'Expected near-term tension delta hint.',
            },
            revealsSecret: {
              type: 'boolean',
              description: 'Whether the turn is expected to reveal a meaningful secret.',
            },
          },
        },
      },
    },
  },
};

export function parseChatPlannerResponse(raw: unknown): TurnPlannerOutput {
  if (!isTurnPlannerOutput(raw)) {
    throw new LLMError(
      'Chat Planner response does not match the expected TurnPlannerOutput shape',
      'INVALID_CHAT_PLANNER_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  return raw;
}
