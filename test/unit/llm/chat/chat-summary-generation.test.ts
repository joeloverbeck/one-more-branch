const mockRunLlmStage = jest.fn();
const mockBuildMessages = jest.fn().mockReturnValue([
  { role: 'system', content: 'System prompt' },
  { role: 'user', content: 'User prompt' },
]);

jest.mock('../../../../src/llm/llm-stage-runner', () => ({
  get runLlmStage(): typeof mockRunLlmStage {
    return mockRunLlmStage;
  },
}));

jest.mock('../../../../src/llm/prompts/chat/chat-summary-prompt', () => ({
  get buildChatSummaryMessages(): typeof mockBuildMessages {
    return mockBuildMessages;
  },
}));

import {
  generateChatSummary,
  type ChatSummaryContext,
} from '../../../../src/llm/chat/chat-summary-generation';
import { LLMError } from '../../../../src/llm/llm-client-types';
import { CHAT_SUMMARY_SCHEMA } from '../../../../src/llm/schemas/chat-summary-schema';

function makeContext(): ChatSummaryContext {
  return {
    existingSummary: 'They ended the prior exchange under threat.',
    turnsToCompress: [
      {
        turnNumber: 7,
        speaker: 'USER',
        rawText: 'Did you hide the ledger?',
        blocks: [{ type: 'SPEECH', text: 'Did you hide the ledger?' }],
        timestamp: '2026-03-27T08:58:00.000Z',
      },
    ],
  };
}

const PARSED_SUMMARY = {
  compressedSummary: 'The confrontation tightened around the missing ledger.',
  keyCommitments: ['Meet again at dawn.'],
  keyRevelations: ['She already suspected he moved the ledger.'],
  unresolvedQuestions: ['Who else knows about the ledger?'],
  leverageShifts: ['She gained pressure by asking first and refusing to back off.'],
  emotionalTrajectory: 'Guarded suspicion intensifying into direct confrontation.',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunLlmStage.mockResolvedValue({
    parsed: PARSED_SUMMARY,
    rawResponse: '{"compressedSummary":"The confrontation tightened around the missing ledger."}',
  });
});

describe('generateChatSummary', () => {
  it('calls the prompt builder with the provided context', async () => {
    const context = makeContext();
    await generateChatSummary(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('calls runLlmStage with the correct stage metadata and schema', async () => {
    await generateChatSummary(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stageModel: 'chatSummarizer',
        promptType: 'chatSummarizer',
        schema: CHAT_SUMMARY_SCHEMA,
        apiKey: 'test-key',
        parseResponse: expect.any(Function) as unknown,
      })
    );
  });

  it('passes options through to the stage runner', async () => {
    await generateChatSummary(makeContext(), 'test-key', {
      model: 'custom/model',
      temperature: 0.15,
    });

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { model: 'custom/model', temperature: 0.15 },
      })
    );
  });

  it('returns the parsed summary together with rawResponse', async () => {
    const result = await generateChatSummary(makeContext(), 'test-key');

    expect(result.summary).toEqual(PARSED_SUMMARY);
    expect(result.rawResponse).toContain('compressedSummary');
  });

  it('propagates LLM client errors', async () => {
    mockRunLlmStage.mockRejectedValue(new LLMError('API error', 'API_ERROR', true));

    await expect(generateChatSummary(makeContext(), 'test-key')).rejects.toThrow('API error');
  });
});
