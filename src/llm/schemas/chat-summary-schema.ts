import type { RollingSummaryOutput } from '../../models/chat/index.js';
import { isRollingSummaryOutput } from '../../models/chat/index.js';
import { LLMError, type JsonSchema } from '../llm-client-types.js';

function buildStringArraySchema(description: string): Record<string, unknown> {
  return {
    type: 'array',
    description,
    items: {
      type: 'string',
    },
  };
}

export const CHAT_SUMMARY_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_summary',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'compressedSummary',
        'keyCommitments',
        'keyRevelations',
        'unresolvedQuestions',
        'leverageShifts',
        'emotionalTrajectory',
      ],
      properties: {
        compressedSummary: {
          type: 'string',
          description: 'Compressed factual continuity summary of the older conversation span.',
        },
        keyCommitments: buildStringArraySchema(
          'Commitments, promises, obligations, or threats that still matter going forward.'
        ),
        keyRevelations: buildStringArraySchema(
          'Meaningful factual disclosures, confessions, lies exposed, or secrets revealed.'
        ),
        unresolvedQuestions: buildStringArraySchema(
          'Open questions, ambiguities, or pressures that remain unresolved.'
        ),
        leverageShifts: buildStringArraySchema(
          'Meaningful shifts in leverage, power, or vulnerability caused by the compressed turns.'
        ),
        emotionalTrajectory: {
          type: 'string',
          description:
            'Short factual description of the visible emotional trajectory across the compressed turns.',
        },
      },
    },
  },
};

export function parseChatSummaryResponse(raw: unknown): RollingSummaryOutput {
  if (!isRollingSummaryOutput(raw)) {
    throw new LLMError(
      'Chat Summary response does not match the expected RollingSummaryOutput shape',
      'INVALID_CHAT_SUMMARY_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  return raw;
}
