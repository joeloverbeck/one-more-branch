import {
  logPrompt,
  resetPromptSinkForTesting,
  setPromptSinkForTesting,
  type PromptType,
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

describe('logPrompt', () => {
  afterEach(() => {
    resetPromptSinkForTesting();
  });

  it('writes prompt payload to sink and bypasses logger info/debug output', async () => {
    const appendPrompt = jest.fn().mockResolvedValue(undefined);
    setPromptSinkForTesting({ appendPrompt });
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
    setPromptSinkForTesting({ appendPrompt });
    const logger = createMockLogger();
    const messages: ChatMessage[] = [{ role: 'user', content: 'Message' }];
    const promptTypes: PromptType[] = [
      'conceptIdeator',
      'opening',
      'writer',
      'analyst',
      'planner',
      'structure',
      'structure-rewrite',
    ];

    for (const promptType of promptTypes) {
      logPrompt(logger, promptType, messages);
    }
    await Promise.resolve();

    expect(appendPrompt).toHaveBeenCalledTimes(promptTypes.length);
    for (const promptType of promptTypes) {
      expect(appendPrompt).toHaveBeenCalledWith({ promptType, messages });
    }
  });

  it('handles sink failures without throwing and logs one safe warning', async () => {
    const appendPrompt = jest.fn().mockRejectedValue(new Error('disk full'));
    setPromptSinkForTesting({ appendPrompt });
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
    setPromptSinkForTesting({ appendPrompt });
    const logger = createMockLogger();

    logPrompt(logger, 'planner', []);
    await Promise.resolve();

    expect(appendPrompt).toHaveBeenCalledWith({ promptType: 'planner', messages: [] });
  });
});
