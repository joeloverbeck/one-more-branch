const mockRunLlmStage = jest.fn();
const mockBuildSpineRewritePrompt = jest.fn().mockReturnValue([
  { role: 'system', content: 'You are a spine rewriter.' },
  { role: 'user', content: 'Rewrite the spine.' },
]);

jest.mock('../../../src/llm/llm-stage-runner', () => ({
  get runLlmStage(): typeof mockRunLlmStage {
    return mockRunLlmStage;
  },
}));

jest.mock('../../../src/llm/prompts/spine-rewrite-prompt', () => ({
  get buildSpineRewritePrompt(): typeof mockBuildSpineRewritePrompt {
    return mockBuildSpineRewritePrompt;
  },
}));

import { rewriteSpine } from '../../../src/llm/spine-rewriter';
import { SPINE_REWRITE_SCHEMA } from '../../../src/llm/schemas/spine-rewrite-schema';
import { LLMError } from '../../../src/llm/llm-client-types';
import type { SpineRewriteContext } from '../../../src/llm/prompts/spine-rewrite-prompt';
import type { LlmStageRunnerParams } from '../../../src/llm/llm-stage-runner';
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
    sceneSummary: 'The hero joined forces with the dark lord.',
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
    wantNeedCollisionPoint: 'The hero must surrender control to heal.',
    protagonistDeepestFear: 'Becoming powerless and unloved.',
  };
}

function getRunnerParams(): LlmStageRunnerParams<unknown> {
  const call = mockRunLlmStage.mock.calls[0] as [LlmStageRunnerParams<unknown>];
  return call[0];
}

describe('spine-rewriter', () => {
  beforeEach(() => {
    mockRunLlmStage.mockReset();
    mockBuildSpineRewritePrompt.mockClear();
  });

  describe('rewriteSpine', () => {
    it('delegates execution to runLlmStage with spine rewrite stage metadata', async () => {
      const parsedSpine = createValidSpineResponse();
      mockRunLlmStage.mockResolvedValue({
        parsed: parsedSpine,
        rawResponse: JSON.stringify(parsedSpine),
      });

      const context = createSpineRewriteContext();
      await rewriteSpine(context, 'test-api-key');

      expect(mockBuildSpineRewritePrompt).toHaveBeenCalledWith(context);
      const params = getRunnerParams();
      expect(params.stageModel).toBe('spineRewrite');
      expect(params.promptType).toBe('spineRewrite');
      expect(params.apiKey).toBe('test-api-key');
      expect(params.schema).toBe(SPINE_REWRITE_SCHEMA);
      expect(params.messages).toEqual([
        { role: 'system', content: 'You are a spine rewriter.' },
        { role: 'user', content: 'Rewrite the spine.' },
      ]);
      expect(typeof params.parseResponse).toBe('function');
    });

    it('returns the shared runner result using the spine-specific contract', async () => {
      const parsedSpine = createValidSpineResponse();
      mockRunLlmStage.mockResolvedValue({
        parsed: parsedSpine,
        rawResponse: '{"ok":true}',
      });

      const result = await rewriteSpine(createSpineRewriteContext(), 'test-api-key');

      expect(result).toEqual({
        spine: parsedSpine,
        rawResponse: '{"ok":true}',
      });
    });

    it('passes a parser that validates and normalizes the spine response locally', async () => {
      mockRunLlmStage.mockResolvedValue({
        parsed: createValidSpineResponse(),
        rawResponse: '{"ok":true}',
      });

      await rewriteSpine(createSpineRewriteContext(), 'test-api-key');

      const params = getRunnerParams();
      const parsed = params.parseResponse({
        ...createValidSpineResponse(),
        toneFeel: [' dark ', '', 'introspective'],
        toneAvoid: [' lighthearted ', ''],
        wantNeedCollisionPoint: '  The hero must betray the crown to heal.  ',
        protagonistDeepestFear: '  Being forgotten.  ',
      });

      expect(parsed).toEqual(
        expect.objectContaining({
          toneFeel: ['dark', 'introspective'],
          toneAvoid: ['lighthearted'],
          wantNeedCollisionPoint: 'The hero must betray the crown to heal.',
          protagonistDeepestFear: 'Being forgotten.',
        })
      );
    });

    it('rejects invalid spine enums through the local parser', async () => {
      mockRunLlmStage.mockResolvedValue({
        parsed: createValidSpineResponse(),
        rawResponse: '{"ok":true}',
      });

      await rewriteSpine(createSpineRewriteContext(), 'test-api-key');

      const params = getRunnerParams();

      expect(() =>
        params.parseResponse({
          ...createValidSpineResponse(),
          storySpineType: 'NOT_A_REAL_TYPE',
        })
      ).toThrow(LLMError);
      expect(() =>
        params.parseResponse({
          ...createValidSpineResponse(),
          storySpineType: 'NOT_A_REAL_TYPE',
        })
      ).toThrow('Spine rewrite invalid storySpineType: NOT_A_REAL_TYPE');
    });
  });
});
