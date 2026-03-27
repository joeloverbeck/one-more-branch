import type { ChatBlock, TurnMeta } from '../../models/chat/index.js';
import { isChatBlock, isTurnMeta } from '../../models/chat/index.js';
import type { JsonSchema } from '../llm-client-types.js';
import { LLMError } from '../llm-client-types.js';
import { CHAT_BLOCK_TYPE_VALUES } from '../../models/chat/index.js';

export interface ChatWriterTurn {
  readonly blocks: readonly ChatBlock[];
  readonly turnMeta: TurnMeta;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildNullableStringSchema(description: string): Record<string, unknown> {
  return {
    description,
    anyOf: [{ type: 'string' }, { type: 'null' }],
  };
}

const CHAT_BLOCK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'text'],
  properties: {
    type: {
      type: 'string',
      enum: [...CHAT_BLOCK_TYPE_VALUES],
      description: 'Visible block type.',
    },
    delivery: {
      type: 'string',
      description: 'Optional delivery shading for speech blocks only.',
    },
    text: {
      type: 'string',
      description: 'Visible block content.',
    },
  },
} as const;

const TURN_META_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['expectsReply', 'endsWithQuestion', 'visibleEmotion', 'finalPressure'],
  properties: {
    expectsReply: {
      type: 'boolean',
      description: 'Whether the turn expects a response.',
    },
    endsWithQuestion: {
      type: 'boolean',
      description: 'Whether the turn ends with a visible question.',
    },
    visibleEmotion: {
      type: 'string',
      description: 'Primary visible emotion on the surface of the turn.',
    },
    finalPressure: buildNullableStringSchema(
      'Residual conversational pressure the turn ends on, if any.'
    ),
  },
} as const;

export const CHAT_WRITER_SCHEMA: JsonSchema = {
  type: 'json_schema',
  json_schema: {
    name: 'chat_writer',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['blocks', 'turnMeta'],
      properties: {
        blocks: {
          type: 'array',
          description: 'Ordered visible chat blocks for exactly one character turn.',
          items: CHAT_BLOCK_SCHEMA,
        },
        turnMeta: TURN_META_SCHEMA,
      },
    },
  },
};

export function parseChatWriterResponse(raw: unknown): ChatWriterTurn {
  if (!isObjectRecord(raw)) {
    throw new LLMError(
      'Chat Writer response must be an object',
      'INVALID_CHAT_WRITER_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  const blocks = raw['blocks'];
  const turnMeta = raw['turnMeta'];

  if (!Array.isArray(blocks) || !blocks.every(isChatBlock) || !isTurnMeta(turnMeta)) {
    throw new LLMError(
      'Chat Writer response does not match the expected ChatWriterTurn shape',
      'INVALID_CHAT_WRITER_RESPONSE',
      false,
      { rawPayload: raw }
    );
  }

  return {
    blocks,
    turnMeta,
  };
}
