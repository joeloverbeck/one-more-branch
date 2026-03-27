import {
  CHAT_SUMMARY_SCHEMA,
  parseChatSummaryResponse,
} from '../../../../src/llm/schemas/chat-summary-schema';

function makeValidSummary(): Record<string, unknown> {
  return {
    compressedSummary: 'Their archive confrontation hardened into mutual suspicion.',
    keyCommitments: ['Meet again at dawn.'],
    keyRevelations: ['She already knew about the duplicate key.'],
    unresolvedQuestions: ['Who moved the ledger before the meeting?'],
    leverageShifts: ['She seized initiative by naming the missing ledger first.'],
    emotionalTrajectory: 'Controlled distrust escalating toward open accusation.',
  };
}

describe('CHAT_SUMMARY_SCHEMA', () => {
  it('defines a strict OpenRouter json_schema response format', () => {
    expect(CHAT_SUMMARY_SCHEMA.type).toBe('json_schema');
    expect(CHAT_SUMMARY_SCHEMA.json_schema.name).toBe('chat_summary');
    expect(CHAT_SUMMARY_SCHEMA.json_schema.strict).toBe(true);
  });

  it('requires the full RollingSummaryOutput top-level shape', () => {
    const schema = CHAT_SUMMARY_SCHEMA.json_schema.schema as {
      required: string[];
      additionalProperties: boolean;
    };

    expect(schema.required).toEqual([
      'compressedSummary',
      'keyCommitments',
      'keyRevelations',
      'unresolvedQuestions',
      'leverageShifts',
      'emotionalTrajectory',
    ]);
    expect(schema.additionalProperties).toBe(false);
  });
});

describe('parseChatSummaryResponse', () => {
  it('parses a valid RollingSummaryOutput payload', () => {
    const result = parseChatSummaryResponse(makeValidSummary());

    expect(result.compressedSummary).toContain('archive confrontation');
    expect(result.keyCommitments).toEqual(['Meet again at dawn.']);
  });

  it('rejects payloads with non-string summary fields', () => {
    expect(() =>
      parseChatSummaryResponse({
        ...makeValidSummary(),
        emotionalTrajectory: ['not', 'a', 'string'],
      })
    ).toThrow('Chat Summary response does not match the expected RollingSummaryOutput shape');
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatSummaryResponse('not an object')).toThrow(
      'Chat Summary response does not match the expected RollingSummaryOutput shape'
    );
  });
});
