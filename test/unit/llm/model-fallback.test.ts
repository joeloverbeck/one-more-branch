import { withModelFallback } from '../../../src/llm/model-fallback';
import { LLMError } from '../../../src/llm/llm-client-types';
import { getConfig } from '../../../src/config/index';
import { logger } from '../../../src/logging/index';

jest.mock('../../../src/config/index');
jest.mock('../../../src/logging/index', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;

function mockConfig(defaultModel: string): void {
  mockedGetConfig.mockReturnValue({
    llm: { defaultModel },
  } as ReturnType<typeof getConfig>);
}

describe('withModelFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig('anthropic/claude-sonnet-4.6');
  });

  it('returns result from primary model on success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    const result = await withModelFallback(fn, 'z-ai/glm-5', 'analyst');

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('z-ai/glm-5');
  });

  it('falls back to default model on HTTP 429 when primary differs from default', async () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limited', 'HTTP_429', true))
      .mockResolvedValueOnce('fallback-result');

    const result = await withModelFallback(fn, 'z-ai/glm-5', 'analyst');

    expect(result).toBe('fallback-result');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 'z-ai/glm-5');
    expect(fn).toHaveBeenNthCalledWith(2, 'anthropic/claude-sonnet-4.6');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('rate-limited (429)')
    );
  });

  it('re-throws HTTP 429 when primary model is the default model', async () => {
    const error = new LLMError('Rate limited', 'HTTP_429', true);
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      withModelFallback(fn, 'anthropic/claude-sonnet-4.6', 'writer')
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-throws non-429 LLMError without fallback', async () => {
    const error = new LLMError('Server error', 'HTTP_500', true);
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      withModelFallback(fn, 'z-ai/glm-5', 'lorekeeper')
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('re-throws non-LLMError without fallback', async () => {
    const error = new Error('network down');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      withModelFallback(fn, 'z-ai/glm-5', 'planner')
    ).rejects.toThrow(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from the fallback call', async () => {
    const fallbackError = new LLMError('Fallback also failed', 'HTTP_500', true);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limited', 'HTTP_429', true))
      .mockRejectedValueOnce(fallbackError);

    await expect(
      withModelFallback(fn, 'z-ai/glm-5', 'accountant')
    ).rejects.toThrow(fallbackError);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('logs the stage name and both models in the warning', async () => {
    const warnSpy = jest.spyOn(logger, 'warn');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limited', 'HTTP_429', true))
      .mockResolvedValueOnce('ok');

    await withModelFallback(fn, 'z-ai/glm-5', 'entityDecomposer');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/entityDecomposer.*z-ai\/glm-5.*anthropic\/claude-sonnet-4\.6/)
    );
  });
});
