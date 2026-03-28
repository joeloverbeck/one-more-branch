import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import {
  type ChatCharacterContext,
  WILLINGNESS_TO_ENGAGE_VALUES,
  isChatCharacterContext,
} from '../../models/chat/index.js';
import { buildStringArraySchema } from './chat-context-schema-helpers.js';

export const CHAT_CHARACTER_CONTEXT_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_character_context',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'characterNow',
        'relationshipNow',
        'knowledgeNow',
        'continuityGuardrails',
        'responseConstraints',
      ],
      properties: {
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
              description:
                'Numeric relationship valence, integer from -5 (deeply hostile) to +5 (unconditionally loyal). 0 = neutral.',
            },
            tension: {
              type: 'number',
              description:
                'Numeric current relationship tension, integer from 0 (no tension) to 10 (unbearable pressure).',
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

export function parseChatCharacterContextResponse(parsed: unknown): ChatCharacterContext {
  if (!isChatCharacterContext(parsed)) {
    throw new LLMError(
      'Chat character context response does not match the expected ChatCharacterContext shape',
      'STRUCTURE_PARSE_ERROR',
      true
    );
  }

  return parsed;
}
