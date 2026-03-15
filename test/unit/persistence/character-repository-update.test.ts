import { updateCharacter } from '../../../src/persistence/character-repository.js';
import * as fileUtils from '../../../src/persistence/file-utils.js';
import type { StandaloneDecomposedCharacter } from '../../../src/models/standalone-decomposed-character.js';

jest.mock('../../../src/persistence/file-utils.js');

const mockedFileUtils = fileUtils as jest.Mocked<typeof fileUtils>;

function makeCharacter(
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: 'char-1',
    name: 'Test Character',
    rawDescription: 'A test character description',
    speechFingerprint: {
      catchphrases: [],
      vocabularyProfile: 'standard',
      sentencePatterns: 'short',
      verbalTics: [],
      dialogueSamples: [],
      metaphorFrames: 'nature',
      antiExamples: [],
      discourseMarkers: [],
      registerShifts: 'none',
    },
    coreTraits: ['brave'],
    knowledgeBoundaries: 'limited',
    decisionPattern: 'impulsive',
    coreBeliefs: ['justice'],
    conflictPriority: 'survival',
    appearance: 'tall',
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('updateCharacter', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockedFileUtils.ensureCharactersDir.mockReturnValue(undefined);
    mockedFileUtils.getCharacterFilePath.mockImplementation((id: string) => `/chars/${id}.json`);
  });

  it('loads, applies updater, and saves', async () => {
    const existing = makeCharacter();
    mockedFileUtils.readJsonFile.mockResolvedValue(existing);
    mockedFileUtils.writeJsonFile.mockResolvedValue(undefined);

    const result = await updateCharacter('char-1', (c) => ({
      ...c,
      name: 'Updated Name',
    }));

    expect(result.name).toBe('Updated Name');
    expect(mockedFileUtils.writeJsonFile).toHaveBeenCalledWith(
      '/chars/char-1.json',
      expect.objectContaining({ name: 'Updated Name' })
    );
  });

  it('throws on missing character', async () => {
    mockedFileUtils.readJsonFile.mockResolvedValue(null);

    await expect(
      updateCharacter('nonexistent', (c) => c)
    ).rejects.toThrow('Character not found: nonexistent');
  });

  it('throws when updater produces invalid data', async () => {
    const existing = makeCharacter();
    mockedFileUtils.readJsonFile.mockResolvedValue(existing);

    await expect(
      updateCharacter('char-1', () => ({ broken: true }) as unknown as StandaloneDecomposedCharacter)
    ).rejects.toThrow('Invalid character data after update');
  });
});
