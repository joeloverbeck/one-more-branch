import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  DISTANCE_BAND_VALUES,
  type ChatStateUpdate,
  isChatStateUpdate,
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

function buildNullableDistanceBandSchema(description: string): Record<string, unknown> {
  return {
    description,
    anyOf: [
      {
        type: 'string',
        enum: [...DISTANCE_BAND_VALUES],
      },
      { type: 'null' },
    ],
  };
}

export const CHAT_STATE_UPDATER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_state_updater',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'summaryDelta',
        'relationshipShifts',
        'knowledgeChanges',
        'conversationUpdate',
        'physicalStateUpdate',
        'shouldRefreshChatBible',
        'shouldTriggerSummary',
      ],
      properties: {
        summaryDelta: {
          type: 'string',
          description: 'Compact factual summary of the meaningful state delta caused by this turn.',
        },
        relationshipShifts: {
          type: 'array',
          description: 'Meaningful relationship changes caused by the turn, if any.',
          items: {
            type: 'object',
            additionalProperties: false,
            required: [
              'shiftDescription',
              'suggestedValenceChange',
              'suggestedTensionChange',
              'suggestedNewDynamic',
            ],
            properties: {
              shiftDescription: {
                type: 'string',
                description: 'What changed in the relationship and why it matters.',
              },
              suggestedValenceChange: {
                type: 'number',
                description:
                  'Suggested relationship valence delta, integer from -2 (large cooling) to +2 (large warming). 0 = no change.',
              },
              suggestedTensionChange: {
                type: 'number',
                description:
                  'Suggested tension delta, integer from -2 (major de-escalation) to +2 (major escalation). 0 = no change.',
              },
              suggestedNewDynamic: buildNullableStringSchema(
                'Replacement relationship dynamic label, if the dynamic materially changed.'
              ),
            },
          },
        },
        knowledgeChanges: {
          type: 'object',
          additionalProperties: false,
          required: [
            'newKnownFacts',
            'newSuspicions',
            'falseBeliefsCorrected',
            'secretsRevealed',
          ],
          properties: {
            newKnownFacts: buildStringArraySchema('New facts now known after this turn.'),
            newSuspicions: buildStringArraySchema('New suspicions introduced or strengthened.'),
            falseBeliefsCorrected: buildStringArraySchema(
              'False beliefs that were actually corrected by this turn.'
            ),
            secretsRevealed: buildStringArraySchema(
              'Secrets meaningfully revealed by this turn.'
            ),
          },
        },
        conversationUpdate: {
          type: 'object',
          additionalProperties: false,
          required: [
            'commitmentsMade',
            'threatsMade',
            'questionsOpened',
            'questionsResolved',
          ],
          properties: {
            commitmentsMade: buildStringArraySchema(
              'Commitments, promises, or obligations created in the turn.'
            ),
            threatsMade: buildStringArraySchema('Threats or coercive warnings made in the turn.'),
            questionsOpened: buildStringArraySchema('Questions newly opened by the turn.'),
            questionsResolved: buildStringArraySchema('Questions clearly resolved by the turn.'),
          },
        },
        physicalStateUpdate: {
          type: 'object',
          additionalProperties: false,
          required: [
            'locationChanged',
            'newLocation',
            'newMicroLocation',
            'newDistanceBand',
            'objectStateChanges',
          ],
          properties: {
            locationChanged: {
              type: 'boolean',
              description: 'Whether the visible turn materially changed location or distance.',
            },
            newLocation: buildNullableStringSchema('New broad location, if changed.'),
            newMicroLocation: buildNullableStringSchema('New micro-location, if changed.'),
            newDistanceBand: buildNullableDistanceBandSchema(
              'New distance band, if changed.'
            ),
            objectStateChanges: buildStringArraySchema(
              'Visible object state changes caused by the turn.'
            ),
          },
        },
        shouldRefreshChatBible: {
          type: 'boolean',
          description: 'Whether downstream orchestration should refresh the chat bible.',
        },
        shouldTriggerSummary: {
          type: 'boolean',
          description: 'Whether downstream orchestration should trigger rolling summarization.',
        },
      },
    },
  },
};

export function parseChatStateUpdaterResponse(raw: unknown): ChatStateUpdate {
  if (!isChatStateUpdate(raw)) {
    throw new LLMError(
      'Chat State Updater response does not match the expected ChatStateUpdate shape',
      'INVALID_CHAT_STATE_UPDATER_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  return raw;
}
