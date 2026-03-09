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
  logResponse: jest.fn(),
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

    const outcome = await resolveNpcAgendas(context);

    expect(outcome.result).toBeNull();
    expect(outcome.durationMs).toBeNull();
    expect(mockedGenerateAgendaResolver).not.toHaveBeenCalled();
  });

  it('returns null when NPCs array is empty', async () => {
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist')] });

    const outcome = await resolveNpcAgendas(context);

    expect(outcome.result).toBeNull();
    expect(outcome.durationMs).toBeNull();
    expect(mockedGenerateAgendaResolver).not.toHaveBeenCalled();
  });

  it('returns agenda result on success', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    const outcome = await resolveNpcAgendas(context);

    expect(outcome.result).toEqual(mockAgendaResult);
    expect(outcome.durationMs).toEqual(expect.any(Number));
    expect(outcome.degradation).toBeUndefined();
    expect(mockedGenerateAgendaResolver).toHaveBeenCalledTimes(1);
    expect(mockedGenerateAgendaResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        narrative: 'The hero entered the tavern.',
        sceneSummary: 'Hero enters tavern.',
      }),
      expect.arrayContaining(testDecomposedCharacters),
      expect.objectContaining({ apiKey: 'test-key' })
    );
  });

  it('returns null result with degradation on failure', async () => {
    mockedGenerateAgendaResolver.mockRejectedValue(new Error('LLM timeout'));
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    const outcome = await resolveNpcAgendas(context);

    expect(outcome.result).toBeNull();
    expect(outcome.durationMs).toEqual(expect.any(Number));
    expect(outcome.degradation).toEqual(
      expect.objectContaining({
        stage: 'agendaResolver',
        errorCode: 'LLM_FAILURE',
        message: 'LLM timeout',
      })
    );
    expect(outcome.degradation?.durationMs).toEqual(expect.any(Number));
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
    expect(stageCallback).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        stage: 'RESOLVING_AGENDAS',
        status: 'completed',
        attempt: 1,
      })
    );
    const completedCalls = (stageCallback as jest.Mock).mock.calls as unknown[][];
    const completedEvent = completedCalls[1]?.[0] as { durationMs?: number } | undefined;
    expect(completedEvent?.durationMs).toEqual(expect.any(Number));
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
      expect.objectContaining({ apiKey: 'test-key' })
    );
  });

  it('does not forward deviationContext when undefined', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const context = createBaseContext({ decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters] });

    await resolveNpcAgendas(context);

    const promptContext = mockedGenerateAgendaResolver.mock.calls[0]?.[0];
    expect(promptContext?.deviationContext).toBeUndefined();
  });

  it('forwards analystSignals envelope to generateAgendaResolver', async () => {
    mockedGenerateAgendaResolver.mockResolvedValue(mockAgendaResult);
    const analystSignals = {
      npcCoherenceIssues: 'Bartender suddenly trusted the hero without trigger.',
      relationshipShiftsDetected: [
        {
          npcName: 'Bartender',
          shiftDescription: 'Now views the hero as a useful ally.',
          suggestedValenceChange: 2,
          suggestedNewDynamic: 'ally',
        },
      ],
      knowledgeAsymmetryDetected: [
        {
          characterName: 'Bartender',
          knownFacts: ['The hero carries forged papers'],
          falseBeliefs: [],
          secrets: ['Knows who alerted the guard captain'],
        },
      ],
    };
    const context = createBaseContext({
      decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist'), ...testDecomposedCharacters],
      analystSignals,
    });

    await resolveNpcAgendas(context);

    expect(mockedGenerateAgendaResolver).toHaveBeenCalledWith(
      expect.objectContaining({
        analystSignals,
      }),
      expect.any(Array),
      expect.objectContaining({ apiKey: 'test-key' })
    );
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
