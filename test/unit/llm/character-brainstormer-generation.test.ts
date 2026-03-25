const mockRunLlmStage = jest.fn();
const mockBuildMessages = jest.fn().mockReturnValue([
  { role: 'system', content: 'You are a character brainstormer.' },
  { role: 'user', content: 'Generate characters.' },
]);

jest.mock('../../../src/llm/llm-stage-runner', () => ({
  get runLlmStage(): typeof mockRunLlmStage {
    return mockRunLlmStage;
  },
}));

jest.mock('../../../src/llm/prompts/character-brainstormer-prompt', () => ({
  get buildCharacterBrainstormerMessages(): typeof mockBuildMessages {
    return mockBuildMessages;
  },
}));

import { generateCharacterBrainstorm } from '../../../src/llm/character-brainstormer-generation';
import { CHARACTER_BRAINSTORMER_SCHEMA } from '../../../src/llm/schemas/character-brainstormer-schema';
import { LLMError } from '../../../src/llm/llm-client-types';
import type { CharacterBrainstormerContext } from '../../../src/llm/character-brainstormer-types';

function makeContext(): CharacterBrainstormerContext {
  return {
    conceptSpec: {} as CharacterBrainstormerContext['conceptSpec'],
    storyKernel: {} as CharacterBrainstormerContext['storyKernel'],
    decomposedWorld: null,
    rawWorldbuilding: null,
    existingCharacterNames: [],
    userNotes: '',
  };
}

const PARSED_RESULT = {
  characters: [
    {
      name: 'Test',
      highConceptPitch: 'pitch',
      coreWound: 'wound',
      centralContradiction: 'contradiction',
      archetypeAndSubversion: 'archetype',
      suggestedStoryFunction: 'ANTAGONIST',
      relationshipDynamicHint: 'hint',
      whatMakesThemMemorable: 'memorable',
      metaphorFamily: 'cooking',
    },
  ],
  diversityNote: 'note',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRunLlmStage.mockResolvedValue({
    parsed: PARSED_RESULT,
    rawResponse: '{"characters":[],"diversityNote":"note"}',
  });
});

describe('generateCharacterBrainstorm', () => {
  it('calls prompt builder with the provided context', async () => {
    const context = makeContext();
    await generateCharacterBrainstorm(context, 'test-key');

    expect(mockBuildMessages).toHaveBeenCalledWith(context);
  });

  it('calls runLlmStage with correct schema and stage model', async () => {
    await generateCharacterBrainstorm(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledTimes(1);
    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        stageModel: 'characterBrainstormer',
        promptType: 'characterBrainstormer',
        schema: CHARACTER_BRAINSTORMER_SCHEMA,
        apiKey: 'test-key',
      })
    );
  });

  it('passes model override via options', async () => {
    await generateCharacterBrainstorm(makeContext(), 'test-key', {
      model: 'custom/model',
    });

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { model: 'custom/model' },
      })
    );
  });

  it('returns the parsed result with rawResponse', async () => {
    const result = await generateCharacterBrainstorm(makeContext(), 'test-key');

    expect(result.characters).toEqual(PARSED_RESULT.characters);
    expect(result.diversityNote).toBe('note');
    expect(result.rawResponse).toBe('{"characters":[],"diversityNote":"note"}');
  });

  it('propagates LLM client errors', async () => {
    mockRunLlmStage.mockRejectedValue(
      new LLMError('API error', 'API_ERROR', true)
    );

    await expect(generateCharacterBrainstorm(makeContext(), 'test-key')).rejects.toThrow(
      'API error'
    );
  });

  it('passes parseResponse function to runLlmStage', async () => {
    await generateCharacterBrainstorm(makeContext(), 'test-key');

    expect(mockRunLlmStage).toHaveBeenCalledWith(
      expect.objectContaining({
        parseResponse: expect.any(Function) as unknown,
      })
    );
  });
});
