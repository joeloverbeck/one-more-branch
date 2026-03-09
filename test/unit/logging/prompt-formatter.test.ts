import {
  logPrompt,
  logResponse,
  PROMPT_TYPE_VALUES,
  resetPromptSinkForTesting,
  setPromptSinkForTesting,
} from '../../../src/logging/prompt-formatter';
import type { ChatMessage } from '../../../src/llm/llm-client-types';
import type { Logger } from '../../../src/logging/types';

function createMockLogger(): jest.Mocked<Logger> {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    getEntries: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
  };
}

const noopAppendResponse = jest.fn().mockResolvedValue(undefined);

describe('logPrompt', () => {
  afterEach(() => {
    resetPromptSinkForTesting();
  });

  it('writes prompt payload to sink and bypasses logger info/debug output', async () => {
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse: noopAppendResponse });
    const logger = createMockLogger();
    const messages: ChatMessage[] = [
      { role: 'system', content: 'System instruction' },
      { role: 'user', content: 'User request' },
    ];

    logPrompt(logger, 'opening', messages);
    await Promise.resolve();

    expect(appendPrompt).toHaveBeenCalledTimes(1);
    expect(appendPrompt).toHaveBeenCalledWith({ promptType: 'opening', messages });
    expect(logger.info.mock.calls).toHaveLength(0);
    expect(logger.debug.mock.calls).toHaveLength(0);
  });

  it('handles all prompt types', async () => {
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse: noopAppendResponse });
    const logger = createMockLogger();
    const messages: ChatMessage[] = [{ role: 'user', content: 'Message' }];

    for (const promptType of PROMPT_TYPE_VALUES) {
      logPrompt(logger, promptType, messages);
    }
    await Promise.resolve();

    expect(appendPrompt).toHaveBeenCalledTimes(PROMPT_TYPE_VALUES.length);
    for (const promptType of PROMPT_TYPE_VALUES) {
      expect(appendPrompt).toHaveBeenCalledWith({ promptType, messages });
    }
  });

  it('handles sink failures without throwing and logs one safe warning', async () => {
    const appendPrompt = jest.fn().mockRejectedValue(new Error('disk full'));
    setPromptSinkForTesting({ appendPrompt, appendResponse: noopAppendResponse });
    const logger = createMockLogger();
    const messages: ChatMessage[] = [{ role: 'user', content: 'Secret message text' }];

    expect(() => logPrompt(logger, 'writer', messages)).not.toThrow();
    await Promise.resolve();

    expect(logger.warn.mock.calls).toHaveLength(1);
    expect(logger.warn.mock.calls[0]).toEqual([
      'Prompt logging failed',
      {
        promptType: 'writer',
        messageCount: 1,
        error: 'disk full',
      },
    ]);
    expect(JSON.stringify(logger.warn.mock.calls[0]?.[1])).not.toContain('Secret message text');
  });

  it('handles empty message arrays', async () => {
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse: noopAppendResponse });
    const logger = createMockLogger();

    logPrompt(logger, 'planner', []);
    await Promise.resolve();

    expect(appendPrompt).toHaveBeenCalledWith({ promptType: 'planner', messages: [] });
  });
});

describe('logResponse', () => {
  afterEach(() => {
    resetPromptSinkForTesting();
  });

  it('writes response payload to sink', async () => {
    const appendResponse = jest.fn().mockResolvedValue(undefined);
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse });
    const logger = createMockLogger();

    logResponse(logger, 'writer', '{"narrative":"Once upon a time..."}');
    await Promise.resolve();

    expect(appendResponse).toHaveBeenCalledTimes(1);
    expect(appendResponse).toHaveBeenCalledWith({
      promptType: 'writer',
      rawResponse: '{"narrative":"Once upon a time..."}',
    });
  });

  it('handles sink failures without throwing and logs warning', async () => {
    const appendResponse = jest.fn().mockRejectedValue(new Error('write failed'));
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse });
    const logger = createMockLogger();

    expect(() => logResponse(logger, 'writer', '{}')).not.toThrow();
    await Promise.resolve();

    expect(logger.warn.mock.calls).toHaveLength(1);
    expect(logger.warn.mock.calls[0]).toEqual([
      'Response logging failed',
      {
        promptType: 'writer',
        error: 'write failed',
      },
    ]);
  });

  it('does not emit response content to logger output', async () => {
    const appendResponse = jest.fn().mockResolvedValue(undefined);
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt, appendResponse });
    const logger = createMockLogger();

    logResponse(logger, 'writer', '{"secret":"data"}');
    await Promise.resolve();

    expect(logger.info.mock.calls).toHaveLength(0);
    expect(logger.debug.mock.calls).toHaveLength(0);
  });
});
