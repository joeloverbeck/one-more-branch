import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  DISTANCE_BAND_VALUES,
  type ChatRelationshipSnapshot,
  type ChatStateUpdate,
  isChatRelationshipSnapshot,
  isChatStateUpdate,
} from '../../models/chat/index.js';

export interface ChatStateUpdaterResponse {
  readonly stateUpdate: ChatStateUpdate;
  readonly relationshipSnapshot: ChatRelationshipSnapshot;
}

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
      required: ['stateUpdate', 'relationshipSnapshot'],
      properties: {
        stateUpdate: {
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
        relationshipSnapshot: {
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
              description: 'Canonical post-turn relationship dynamic after the character turn completes.',
            },
            valence: {
              type: 'number',
              description:
                'Canonical post-turn relationship valence on the -5 to +5 scale. -5 = deeply hostile, +5 = unconditionally loyal.',
            },
            tension: {
              type: 'number',
              description:
                'Canonical post-turn relationship tension on the 0 to 10 scale. 0 = no tension, 10 = unbearable pressure.',
            },
            leverage: {
              type: 'string',
              description: 'Canonical post-turn statement of who holds leverage and why.',
            },
            whatCharacterBelievesAboutInterlocutor: buildStringArraySchema(
              'Canonical post-turn beliefs the character currently holds about the interlocutor.'
            ),
          },
        },
      },
    },
  },
};

export function parseChatStateUpdaterResponse(raw: unknown): ChatStateUpdaterResponse {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    Array.isArray(raw) ||
    !isChatStateUpdate((raw as Record<string, unknown>)['stateUpdate']) ||
    !isChatRelationshipSnapshot((raw as Record<string, unknown>)['relationshipSnapshot'])
  ) {
    throw new LLMError(
      'Chat State Updater response does not match the expected ChatStateUpdate shape',
      'INVALID_CHAT_STATE_UPDATER_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  return raw as ChatStateUpdaterResponse;
}
