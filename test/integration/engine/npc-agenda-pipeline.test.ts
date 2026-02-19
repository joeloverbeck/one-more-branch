import { generateAgendaResolver } from '@/llm';
import { resolveNpcAgendas } from '@/engine/npc-agenda-pipeline';
import type { NpcAgendaContext } from '@/engine/npc-agenda-pipeline';
import type { AgendaResolverResult } from '@/llm/lorekeeper-types';
import type { ActiveState } from '@/models/state/active-state';
import { createEmptyAccumulatedNpcAgendas } from '@/models/state/npc-agenda';
import type { GenerationStageCallback } from '@/engine/types';
import { buildMinimalDecomposedCharacter } from '../../fixtures/decomposed';
import type { DecomposedCharacter } from '@/models/decomposed-character';

jest.mock('@/llm', () => ({
  generateAgendaResolver: jest.fn(),
}));

jest.mock('@/logging/index', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logPrompt: jest.fn(),
}));

const mockedGenerateAgendaResolver = generateAgendaResolver as jest.MockedFunction<
  typeof generateAgendaResolver
>;

function createBaseContext(overrides: Partial<NpcAgendaContext> = {}): NpcAgendaContext {
  const emptyActiveState: ActiveState = {
    currentLocation: 'tavern',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  return {
    decomposedCharacters: [],
    writerNarrative: 'The hero entered the tavern.',
    writerSceneSummary: 'Hero enters tavern.',
    parentAccumulatedNpcAgendas: createEmptyAccumulatedNpcAgendas(),
    currentStructureVersion: null,
    storyStructure: null,
    parentActiveState: emptyActiveState,
    apiKey: 'test-key',
    ...overrides,
  };
}

const testDecomposedCharacters: readonly DecomposedCharacter[] = [
  buildMinimalDecomposedCharacter('Bartender', { rawDescription: 'A gruff bartender' }),
];

const mockAgendaResult: AgendaResolverResult = {
  updatedAgendas: {
    Bartender: {
      npcName: 'Bartender',
      currentGoal: 'Serve drinks',
      attitudeTowardProtagonist: 'neutral',
      nextLikelyAction: 'Pour a drink',
      emotionalState: 'calm',
    },
  },
};

describe('resolveNpcAgendas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when story has no NPCs', async () => {
    const context = createBaseContext({ decomposedCharacters: [] });

    const result = await resolveNpcAgendas(context);

    expect(result).toBeNull();
    expect(mockedGenerateAgendaResolver).not.toHaveBeenCalled();
  });

  it('returns null when NPCs array is empty', async () => {
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist')] });

    const result = await resolveNpcAgendas(context);

    expect(result).toBeNull();
    expect(mockedGenerateAgendaResolver).not.toHaveBeenCalled();
  });

  it('returns agenda result on success', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    const result = await resolveNpcAgendas(context);

    expect(result).toEqual(mockAgendaResult);
    expect(mockedGenerateAgendaResolver).toHaveBeenCalledTimes(1);
    expect(mockedGenerateAgendaResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        narrative: 'The hero entered the tavern.',
        sceneSummary: 'Hero enters tavern.',
      }),
      expect.arrayContaining(testDecomposedCharacters),
      { apiKey: 'test-key' }
    );
  });

  it('returns null and logs warning on failure', async () => {
    mockedGenerateAgendaResolver.mockRejectedValue(new Error('LLM timeout'));
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    const result = await resolveNpcAgendas(context);

    expect(result).toBeNull();
  });

  it('emits RESOLVING_AGENDAS started and completed stages on success', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const stageCallback: GenerationStageCallback = jest.fn();
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters], onGenerationStage: stageCallback });

    await resolveNpcAgendas(context);

    expect(stageCallback).toHaveBeenCalledTimes(2);
    expect(stageCallback).toHaveBeenNthCalledWith(1, {
      stage: 'RESOLVING_AGENDAS',
      status: 'started',
      attempt: 1,
    });
    expect(stageCallback).toHaveBeenNthCalledWith(2, {
      stage: 'RESOLVING_AGENDAS',
      status: 'completed',
      attempt: 1,
    });
  });

  it('forwards deviationContext to generateAgendaResolver', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const deviationContext = {
      reason: 'Protagonist refused the quest',
      newBeats: [
        { name: 'Reluctant Return', objective: 'Deal with consequences', role: 'turning_point' },
      ],
    };
    const context = createBaseContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters],
      deviationContext,
    });

    await resolveNpcAgendas(context);

    expect(mockedGenerateAgendaResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        deviationContext,
      }),
      expect.any(Array),
      { apiKey: 'test-key' }
    );
  });

  it('does not forward deviationContext when undefined', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    await resolveNpcAgendas(context);

    const promptContext = mockedGenerateAgendaResolver.mock.calls[0]?.[0];
    expect(promptContext?.deviationContext).toBeUndefined();
  });

  it('does not emit completed stage on failure', async () => {
    mockedGenerateAgendaResolver.mockRejectedValue(new Error('LLM timeout'));
    const stageCallback: GenerationStageCallback = jest.fn();
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters], onGenerationStage: stageCallback });

    await resolveNpcAgendas(context);

    expect(stageCallback).toHaveBeenCalledTimes(1);
    expect(stageCallback).toHaveBeenCalledWith({
      stage: 'RESOLVING_AGENDAS',
      status: 'started',
      attempt: 1,
    });
  });
});
