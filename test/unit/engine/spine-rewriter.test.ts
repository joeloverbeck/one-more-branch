const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
}));

jest.mock('../../../src/config/stage-model', () => ({
  getStageModel: jest.fn().mockReturnValue('test-model/spine-rewrite-v1'),
  getStageMaxTokens: jest.fn().mockReturnValue(24576),
}));

jest.mock('../../../src/config/index', () => ({
  getConfig: jest.fn().mockReturnValue({
    llm: {
      temperature: 0.8,
    },
  }),
}));

jest.mock('../../../src/llm/prompts/spine-rewrite-prompt', () => ({
  buildSpineRewritePrompt: jest.fn().mockReturnValue([
    { role: 'system', content: 'You are a spine rewriter.' },
    { role: 'user', content: 'Rewrite the spine.' },
  ]),
}));

jest.mock('../../../src/llm/retry', () => ({
  withRetry: jest.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
}));

import { rewriteSpine } from '../../../src/engine/spine-rewriter';
import { getStageModel, getStageMaxTokens } from '../../../src/config/stage-model';
import type { SpineRewriteContext } from '../../../src/llm/prompts/spine-rewrite-prompt';
import {
  buildMinimalDecomposedCharacter,
  MINIMAL_DECOMPOSED_WORLD,
} from '../../fixtures/decomposed';

function createSpineRewriteContext(
  overrides?: Partial<SpineRewriteContext>
): SpineRewriteContext {
  return {
    tone: 'dark fantasy',
    currentSpine: {
      centralDramaticQuestion: 'Will the hero survive?',
      protagonistNeedVsWant: {
        need: 'acceptance',
        want: 'power',
        dynamic: 'CONVERGENT',
      },
      primaryAntagonisticForce: {
        description: 'The dark lord',
        pressureMechanism: 'Corruption of allies',
      },
      storySpineType: 'QUEST',
      conflictAxis: 'DUTY_VS_DESIRE',
      conflictType: 'PERSON_VS_SELF',
      characterArcType: 'POSITIVE_CHANGE',
      toneFeel: ['gritty', 'tense'],
      toneAvoid: ['comedic'],
    },
    invalidatedElement: 'dramatic_question',
    deviationReason: 'Player allied with the antagonist, invalidating the dramatic question.',
    narrativeSummary: 'The hero joined forces with the dark lord.',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A fallen knight')],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    ...overrides,
  };
}

function createValidSpineResponse(): Record<string, unknown> {
  return {
    centralDramaticQuestion: 'Can the hero redeem what was lost?',
    protagonistNeedVsWant: {
      need: 'redemption',
      want: 'control',
      dynamic: 'CONVERGENT',
    },
    primaryAntagonisticForce: {
      description: 'Inner corruption',
      pressureMechanism: 'Loss of trust from allies',
    },
    storySpineType: 'QUEST',
    conflictAxis: 'DUTY_VS_DESIRE',
    conflictType: 'PERSON_VS_SELF',
    characterArcType: 'POSITIVE_CHANGE',
    toneFeel: ['dark', 'introspective'],
    toneAvoid: ['lighthearted'],
  };
}

describe('spine-rewriter', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogPrompt.mockReset();
    mockLogger.info.mockReset();
    (getStageModel as jest.Mock).mockReturnValue('test-model/spine-rewrite-v1');
    (getStageMaxTokens as jest.Mock).mockReturnValue(24576);

    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(createValidSpineResponse()),
            },
          },
        ],
      }),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('rewriteSpine', () => {
    it('uses getStageModel("spineRewrite") for model selection', async () => {
      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      expect(getStageModel).toHaveBeenCalledWith('spineRewrite');
    });

    it('uses getStageMaxTokens("spineRewrite") for max tokens', async () => {
      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      expect(getStageMaxTokens).toHaveBeenCalledWith('spineRewrite');
    });

    it('passes stage model and max tokens in the fetch request body', async () => {
      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const fetchCall = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
      expect(body['model']).toBe('test-model/spine-rewrite-v1');
      expect(body['max_tokens']).toBe(24576);
    });

    it('returns a valid SpineRewriteResult on success', async () => {
      const context = createSpineRewriteContext();
      const result = await rewriteSpine(context, 'test-api-key');

      expect(result.spine.centralDramaticQuestion).toBe('Can the hero redeem what was lost?');
      expect(result.spine.storySpineType).toBe('QUEST');
      expect(result.rawResponse).toBeDefined();
    });

    it('logs the prompt before making the API call', async () => {
      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'spine-rewrite', expect.any(Array));
    });

    it('uses a custom stage model when configured differently', async () => {
      (getStageModel as jest.Mock).mockReturnValue('custom/spine-model');
      (getStageMaxTokens as jest.Mock).mockReturnValue(8192);

      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      const fetchCall = fetchSpy.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
      expect(body['model']).toBe('custom/spine-model');
      expect(body['max_tokens']).toBe(8192);
    });
  });
});
