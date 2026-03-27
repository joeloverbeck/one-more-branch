import {
  CHAT_WRITER_SCHEMA,
  parseChatWriterResponse,
} from '../../../../src/llm/schemas/chat-writer-schema';
import { LLMError } from '../../../../src/llm/llm-client-types';

describe('chat-writer-schema', () => {
  it('defines a strict schema for writer payloads', () => {
    expect(CHAT_WRITER_SCHEMA.json_schema.name).toBe('chat_writer');
    expect(CHAT_WRITER_SCHEMA.json_schema.strict).toBe(true);
    expect(CHAT_WRITER_SCHEMA.json_schema.schema).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: ['blocks', 'turnMeta'],
    });
  });

  it('parses a valid writer response with action and speech blocks', () => {
    const parsed = parseChatWriterResponse({
      blocks: [
        { type: 'ACTION', text: 'She rests one hand on the lantern.' },
        { type: 'SPEECH', delivery: 'flat', text: 'You already know why I am here.' },
      ],
      turnMeta: {
        expectsReply: true,
        endsWithQuestion: false,
        visibleEmotion: 'contained suspicion',
        finalPressure: 'She refuses to yield the frame.',
      },
    });

    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.turnMeta.visibleEmotion).toBe('contained suspicion');
  });

  it('rejects invalid block types', () => {
    expect(() =>
      parseChatWriterResponse({
        blocks: [{ type: 'THOUGHT', text: 'Impossible.' }],
        turnMeta: {
          expectsReply: true,
          endsWithQuestion: false,
          visibleEmotion: 'cold focus',
          finalPressure: null,
        },
      })
    ).toThrow(LLMError);
  });

  it('rejects malformed turn meta payloads', () => {
    expect(() =>
      parseChatWriterResponse({
        blocks: [{ type: 'SPEECH', text: 'Answer me.' }],
        turnMeta: {
          expectsReply: 'yes',
          endsWithQuestion: true,
          visibleEmotion: 'cold focus',
          finalPressure: null,
        },
      })
    ).toThrow('Chat Writer response does not match the expected ChatWriterTurn shape');
  });
});
