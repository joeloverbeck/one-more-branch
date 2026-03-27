import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  DISTANCE_BAND_VALUES,
  PRIVACY_VALUES,
  TIME_OF_DAY_VALUES,
  type ChatSceneContext,
  isChatSceneContext,
} from '../../models/chat/index.js';
import {
  buildNullableStringSchema,
  buildStringArraySchema,
} from './chat-context-schema-helpers.js';

const CHAT_PHYSICAL_REALITY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'location',
    'microLocation',
    'timeOfDay',
    'privacy',
    'distanceBand',
    'characterActivity',
    'interactableObjects',
    'ambientConditions',
  ],
  properties: {
    location: {
      type: 'string',
      description: 'Primary physical location for the conversation.',
    },
    microLocation: {
      type: 'string',
      description: 'Immediate sub-location or position within the broader location.',
    },
    timeOfDay: {
      type: 'string',
      enum: [...TIME_OF_DAY_VALUES],
      description: 'Current time-of-day bucket.',
    },
    privacy: {
      type: 'string',
      enum: [...PRIVACY_VALUES],
      description: 'How private the current setting is.',
    },
    distanceBand: {
      type: 'string',
      enum: [...DISTANCE_BAND_VALUES],
      description: 'Current physical distance between the characters.',
    },
    characterActivity: {
      type: 'string',
      description: 'What the target character is physically doing in the moment.',
    },
    interactableObjects: buildStringArraySchema(
      'Objects in reach that could plausibly matter over the next few turns.'
    ),
    ambientConditions: buildStringArraySchema(
      'Environmental conditions shaping tone or possibility space.'
    ),
  },
} as const;

export const CHAT_SCENE_CONTEXT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_scene_context',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['sessionPremise', 'physicalReality', 'preChatMomentum', 'conversationNow'],
      properties: {
        sessionPremise: {
          type: 'string',
          description: 'One concise statement of what this conversation is fundamentally about.',
        },
        physicalReality: CHAT_PHYSICAL_REALITY_SCHEMA,
        preChatMomentum: {
          type: 'object',
          additionalProperties: false,
          required: [
            'leadInSummary',
            'recentEvents',
            'whyNow',
            'stakesNow',
            'unresolvedPressures',
          ],
          properties: {
            leadInSummary: {
              type: 'string',
              description: 'Lead-in summary for the conversation opening state.',
            },
            recentEvents: buildStringArraySchema(
              'Relevant events immediately preceding this chat.'
            ),
            whyNow: {
              type: 'string',
              description: 'Why this conversation is happening now instead of later.',
            },
            stakesNow: buildStringArraySchema('Immediate active stakes for this exchange.'),
            unresolvedPressures: buildStringArraySchema(
              'Open pressures shaping the next few turns.'
            ),
          },
        },
        conversationNow: {
          type: 'object',
          additionalProperties: false,
          required: [
            'rollingSummary',
            'activeThreads',
            'commitments',
            'sensitiveTopics',
            'lastTurnPressure',
          ],
          properties: {
            rollingSummary: buildNullableStringSchema(
              'Compressed older conversation history, if available.'
            ),
            activeThreads: buildStringArraySchema(
              'Active threads the next few turns should stay coherent with.'
            ),
            commitments: buildStringArraySchema(
              'Promises, threats, or obligations currently active.'
            ),
            sensitiveTopics: buildStringArraySchema(
              'Topics likely to trigger defensiveness, escalation, or avoidance.'
            ),
            lastTurnPressure: buildNullableStringSchema(
              'Residual pressure carried over from the latest turn.'
            ),
          },
        },
      },
    },
  },
};

export function parseChatSceneContextResponse(parsed: unknown): ChatSceneContext {
  if (!isChatSceneContext(parsed)) {
    throw new LLMError(
      'Chat scene context response does not match the expected ChatSceneContext shape',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return parsed;
}
