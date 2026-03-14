import {
  decomposeRawWorldbuilding,
  runWorldElaborationGeneration,
  runWorldSeedGeneration,
} from '@/services/worldbuilding-service';

jest.mock('@/persistence/worldbuilding-repository', () => ({
  saveWorldbuilding: jest.fn(),
  loadWorldbuilding: jest.fn(),
  listWorldbuildings: jest.fn(),
  deleteWorldbuilding: jest.fn(),
  updateWorldbuilding: jest.fn(),
}));

jest.mock('@/llm/worldbuilding-seed-generation', () => ({
  generateWorldSeed: jest.fn(),
}));

jest.mock('@/llm/worldbuilding-elaboration-generation', () => ({
  generateWorldElaboration: jest.fn(),
}));

jest.mock('@/llm/worldbuilding-decomposer', () => ({
  decomposeWorldbuilding: jest.fn(),
}));

jest.mock('@/services/worldbuilding-canonicalizer', () => ({
  canonicalizeDecomposedWorld: jest.fn(),
}));

import {
  loadWorldbuilding,
  saveWorldbuilding,
  updateWorldbuilding,
} from '@/persistence/worldbuilding-repository';
import { generateWorldSeed } from '@/llm/worldbuilding-seed-generation';
import { generateWorldElaboration } from '@/llm/worldbuilding-elaboration-generation';
import { decomposeWorldbuilding } from '@/llm/worldbuilding-decomposer';
import { canonicalizeDecomposedWorld } from '@/services/worldbuilding-canonicalizer';

describe('worldbuilding-service', () => {
  const mockedLoadWorldbuilding = jest.mocked(loadWorldbuilding);
  const mockedSaveWorldbuilding = jest.mocked(saveWorldbuilding);
  const mockedUpdateWorldbuilding = jest.mocked(updateWorldbuilding);
  const mockedGenerateWorldSeed = jest.mocked(generateWorldSeed);
  const mockedGenerateWorldElaboration = jest.mocked(generateWorldElaboration);
  const mockedDecomposeWorldbuilding = jest.mocked(decomposeWorldbuilding);
  const mockedCanonicalizeDecomposedWorld = jest.mocked(canonicalizeDecomposedWorld);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-14T12:00:00.000Z'));
    jest.clearAllMocks();
    mockedCanonicalizeDecomposedWorld.mockImplementation((value: unknown) => value);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runWorldSeedGeneration completes the world-seed stage with duration and persists stage 1', async () => {
    const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
    mockedLoadWorldbuilding.mockResolvedValue({
      id: 'wb-1',
      inputs: {
        userNotes: 'Dense political factions',
        contentPreferences: 'No elves',
        startingSituation: 'A border city is about to riot',
        tone: 'grim',
      },
    });
    mockedGenerateWorldSeed.mockImplementation(() => {
      jest.advanceTimersByTime(12);
      return Promise.resolve({ worldSeed: 'A city built around stolen weather' });
    });
    mockedUpdateWorldbuilding.mockImplementation((_id, updater) =>
      Promise.resolve(
        updater({
          id: 'wb-1',
          completedStages: [],
        } as never),
      ),
    );

    await runWorldSeedGeneration('wb-1', 'valid-key-12345', (event) => events.push(event));

    expect(mockedGenerateWorldSeed).toHaveBeenCalledWith(
      {
        userNotes: 'Dense political factions',
        contentPreferences: 'No elves',
        startingSituation: 'A border city is about to riot',
        tone: 'grim',
      },
      'valid-key-12345',
    );
    expect(mockedUpdateWorldbuilding).toHaveBeenCalledWith('wb-1', expect.any(Function));
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ stage: 'GENERATING_WORLD_SEED', status: 'started', attempt: 1 });
    expect(events[1]).toMatchObject({ stage: 'GENERATING_WORLD_SEED', status: 'completed', attempt: 1 });
    expect(events[1]?.durationMs).toBe(12);
  });

  it('runWorldElaborationGeneration completes the elaboration stage with duration and canonicalizes the world', async () => {
    const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
    mockedLoadWorldbuilding.mockResolvedValue({
      id: 'wb-1',
      worldSeed: 'A city built around stolen weather',
      inputs: {
        userNotes: 'Dense political factions',
        tone: 'grim',
      },
    });
    mockedGenerateWorldElaboration.mockImplementation(() => {
      jest.advanceTimersByTime(8);
      return Promise.resolve({
        rawWorldMarkdown: '# World',
        decomposedWorld: { regions: ['Harbor'] },
      });
    });
    mockedCanonicalizeDecomposedWorld.mockReturnValue({ regions: ['Harbor'] });
    mockedUpdateWorldbuilding.mockImplementation((_id, updater) =>
      Promise.resolve(
        updater({
          id: 'wb-1',
          completedStages: [1],
        } as never),
      ),
    );

    await runWorldElaborationGeneration('wb-1', 'valid-key-12345', (event) => events.push(event));

    expect(mockedGenerateWorldElaboration).toHaveBeenCalledWith(
      {
        worldSeed: 'A city built around stolen weather',
        userNotes: 'Dense political factions',
        tone: 'grim',
      },
      'valid-key-12345',
    );
    expect(mockedCanonicalizeDecomposedWorld).toHaveBeenCalledWith({ regions: ['Harbor'] });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ stage: 'ELABORATING_WORLD', status: 'started', attempt: 1 });
    expect(events[1]).toMatchObject({ stage: 'ELABORATING_WORLD', status: 'completed', attempt: 1 });
    expect(events[1]?.durationMs).toBe(8);
  });

  it('decomposeRawWorldbuilding completes the decomposition stage with duration and saves the result', async () => {
    const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
    mockedDecomposeWorldbuilding.mockImplementation(() => {
      jest.advanceTimersByTime(5);
      return Promise.resolve({
        decomposedWorld: { factions: ['Guild'] },
      });
    });
    mockedCanonicalizeDecomposedWorld.mockReturnValue({ factions: ['Guild'] });

    await decomposeRawWorldbuilding(
      'Storm Market',
      'Raw world text',
      'valid-key-12345',
      'grim',
      (event) => events.push(event),
    );

    expect(mockedDecomposeWorldbuilding).toHaveBeenCalledWith(
      { worldbuilding: 'Raw world text', tone: 'grim' },
      'valid-key-12345',
    );
    expect(mockedSaveWorldbuilding).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Storm Market',
        sourceKind: 'RAW_DECOMPOSED',
        rawSourceText: 'Raw world text',
        decomposedWorld: { factions: ['Guild'] },
      }),
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ stage: 'DECOMPOSING_WORLD', status: 'started', attempt: 1 });
    expect(events[1]).toMatchObject({ stage: 'DECOMPOSING_WORLD', status: 'completed', attempt: 1 });
    expect(events[1]?.durationMs).toBe(5);
  });
});
