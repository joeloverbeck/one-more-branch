import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  DISTANCE_BAND_VALUES,
  PRIVACY_VALUES,
  TIME_OF_DAY_VALUES,
  type ChatBible,
  WILLINGNESS_TO_ENGAGE_VALUES,
  isChatBible,
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

const CHAT_PHYSICAL_CONTEXT_SCHEMA = {
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

export const CHAT_BIBLE_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_bible',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'sessionPremise',
        'physicalReality',
        'preChatMomentum',
        'characterNow',
        'relationshipNow',
        'knowledgeNow',
        'conversationNow',
        'continuityGuardrails',
        'responseConstraints',
      ],
      properties: {
        sessionPremise: {
          type: 'string',
          description: 'One concise statement of what this conversation is fundamentally about.',
        },
        physicalReality: CHAT_PHYSICAL_CONTEXT_SCHEMA,
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
        characterNow: {
          type: 'object',
          additionalProperties: false,
          required: [
            'currentObjective',
            'immediateNeedFromConversation',
            'emotionalState',
            'willingnessToEngage',
            'topicsToAdvance',
            'topicsToProtect',
          ],
          properties: {
            currentObjective: {
              type: 'string',
              description: 'What the target character currently wants overall.',
            },
            immediateNeedFromConversation: {
              type: 'string',
              description: 'What the target character needs from this interaction right now.',
            },
            emotionalState: {
              type: 'string',
              description: 'Dominant current emotional framing.',
            },
            willingnessToEngage: {
              type: 'string',
              enum: [...WILLINGNESS_TO_ENGAGE_VALUES],
              description: 'Current willingness to engage with the interlocutor.',
            },
            topicsToAdvance: buildStringArraySchema(
              'Topics the character is prepared or motivated to push forward.'
            ),
            topicsToProtect: buildStringArraySchema(
              'Topics the character is motivated to shield, deflect, or conceal.'
            ),
          },
        },
        relationshipNow: {
          type: 'object',
          additionalProperties: false,
          required: [
            'dynamic',
            'valence',
            'tension',
            'leverage',
            'whatCharacterBelievesAboutInterlocutor',
          ],
          properties: {
            dynamic: {
              type: 'string',
              description: 'Current relational dynamic label.',
            },
            valence: {
              type: 'number',
              description: 'Numeric relationship valence.',
            },
            tension: {
              type: 'number',
              description: 'Numeric current relationship tension.',
            },
            leverage: {
              type: 'string',
              description: 'Current leverage defining the relationship.',
            },
            whatCharacterBelievesAboutInterlocutor: buildStringArraySchema(
              'What the target character currently believes about the interlocutor.'
            ),
          },
        },
        knowledgeNow: {
          type: 'object',
          additionalProperties: false,
          required: [
            'knownFacts',
            'suspicions',
            'falseBeliefs',
            'secretsRevealed',
            'secretsKept',
            'knowledgeBoundaries',
          ],
          properties: {
            knownFacts: buildStringArraySchema('Facts the target character currently knows.'),
            suspicions: buildStringArraySchema('Active suspicions shaping interpretation.'),
            falseBeliefs: buildStringArraySchema(
              'Known false beliefs still influencing the target character.'
            ),
            secretsRevealed: buildStringArraySchema(
              'Secrets already revealed during prior interaction.'
            ),
            secretsKept: buildStringArraySchema('Secrets the target character is still keeping.'),
            knowledgeBoundaries: buildStringArraySchema(
              'Hard knowledge limits and forbidden assumptions.'
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
            commitments: buildStringArraySchema('Promises, threats, or obligations currently active.'),
            sensitiveTopics: buildStringArraySchema(
              'Topics likely to trigger defensiveness, escalation, or avoidance.'
            ),
            lastTurnPressure: buildNullableStringSchema(
              'Residual pressure carried over from the latest turn.'
            ),
          },
        },
        continuityGuardrails: buildStringArraySchema(
          'Continuity reminders the downstream stages must not violate.'
        ),
        responseConstraints: buildStringArraySchema(
          'Immediate constraints for the next 1-3 turns.'
        ),
      },
    },
  },
};

export function parseChatBibleResponse(parsed: unknown): ChatBible {
  if (!isChatBible(parsed)) {
    throw new LLMError(
      'Chat Bible response does not match the expected ChatBible shape',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return parsed;
}
