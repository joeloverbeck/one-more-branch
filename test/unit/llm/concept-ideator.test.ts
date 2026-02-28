jest.mock('../../../src/llm/concept-seeder.js', () => ({
  generateConceptSeeds: jest.fn(),
}));

jest.mock('../../../src/llm/concept-architect.js', () => ({
  generateConceptCharacterWorlds: jest.fn(),
}));

jest.mock('../../../src/llm/concept-engineer.js', () => ({
  generateConceptEngines: jest.fn(),
}));

import { generateConceptIdeas, mergeConceptStages } from '../../../src/llm/concept-ideator';
import { generateConceptSeeds } from '../../../src/llm/concept-seeder';
import { generateConceptCharacterWorlds } from '../../../src/llm/concept-architect';
import { generateConceptEngines } from '../../../src/llm/concept-engineer';
import type { ConceptIdeatorContext } from '../../../src/models';
import {
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
  createConceptEngineFixture,
} from '../../fixtures/concept-generator';

const mockGenerateSeeds = generateConceptSeeds as jest.MockedFunction<typeof generateConceptSeeds>;
const mockGenerateCharacterWorlds = generateConceptCharacterWorlds as jest.MockedFunction<
  typeof generateConceptCharacterWorlds
>;
const mockGenerateEngines = generateConceptEngines as jest.MockedFunction<
  typeof generateConceptEngines
>;

function createSeeds(count: number): Array<ReturnType<typeof createConceptSeedFixture>> {
  return Array.from({ length: count }, (_, i) => createConceptSeedFixture(i + 1));
}

function createCharacterWorlds(
  count: number,
): Array<ReturnType<typeof createConceptCharacterWorldFixture>> {
  return Array.from({ length: count }, (_, i) => createConceptCharacterWorldFixture(i + 1));
}

function createEngines(count: number): Array<ReturnType<typeof createConceptEngineFixture>> {
  return Array.from({ length: count }, (_, i) => createConceptEngineFixture(i + 1));
}

describe('concept-ideator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mergeConceptStages', () => {
    it('merges seed, characterWorld, and engine fields into ConceptSpec[]', () => {
      const seeds = createSeeds(2);
      const characterWorlds = createCharacterWorlds(2);
      const engines = createEngines(2);

      const result = mergeConceptStages(seeds, characterWorlds, engines);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ ...seeds[0], ...characterWorlds[0], ...engines[0] });
      expect(result[1]).toEqual({ ...seeds[1], ...characterWorlds[1], ...engines[1] });
    });

    it('preserves all 24 fields from the three stages', () => {
      const seeds = createSeeds(1);
      const characterWorlds = createCharacterWorlds(1);
      const engines = createEngines(1);

      const [concept] = mergeConceptStages(seeds, characterWorlds, engines);

      expect(concept).toHaveProperty('oneLineHook');
      expect(concept).toHaveProperty('genreFrame');
      expect(concept).toHaveProperty('protagonistRole');
      expect(concept).toHaveProperty('actionVerbs');
      expect(concept).toHaveProperty('pressureSource');
      expect(concept).toHaveProperty('elevatorParagraph');
    });
  });

  describe('generateConceptIdeas', () => {
    const context: ConceptIdeatorContext = {
      genreVibes: 'noir',
      kernel: {
        dramaticThesis: 'Control destroys trust',
        valueAtStake: 'Trust',
        opposingForce: 'Fear of uncertainty',
        directionOfChange: 'IRONIC',
        thematicQuestion: 'Can safety exist without control?',
        antithesis: 'Counter-argument challenges the thesis.',
      },
    };

    it('calls seeder → architect → engineer in sequence and merges results', async () => {
      const callOrder: string[] = [];
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateSeeds.mockImplementation(() => {
        callOrder.push('seeder');
        return Promise.resolve({ seeds, rawResponse: 'raw-seeds' });
      });
      mockGenerateCharacterWorlds.mockImplementation(() => {
        callOrder.push('architect');
        return Promise.resolve({ characterWorlds, rawResponse: 'raw-architect' });
      });
      mockGenerateEngines.mockImplementation(() => {
        callOrder.push('engineer');
        return Promise.resolve({ engines, rawResponse: 'raw-engineer' });
      });

      const result = await generateConceptIdeas(context, 'test-api-key');

      expect(callOrder).toEqual(['seeder', 'architect', 'engineer']);
      expect(result.concepts).toHaveLength(6);
      expect(result.rawResponse).toBe('raw-engineer');
    });

    it('passes context and apiKey to seeder', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await generateConceptIdeas(context, 'test-api-key');

      expect(mockGenerateSeeds).toHaveBeenCalledWith(context, 'test-api-key', undefined);
    });

    it('passes seeds and kernel to architect', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await generateConceptIdeas(context, 'test-api-key');

      expect(mockGenerateCharacterWorlds).toHaveBeenCalledWith(
        { seeds, kernel: context.kernel },
        'test-api-key',
        undefined,
      );
    });

    it('passes seeds, characterWorlds, and kernel to engineer', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await generateConceptIdeas(context, 'test-api-key');

      expect(mockGenerateEngines).toHaveBeenCalledWith(
        { seeds, characterWorlds, kernel: context.kernel },
        'test-api-key',
        undefined,
      );
    });

    it('propagates seeder errors without calling downstream stages', async () => {
      const error = new Error('Seeder failed');
      mockGenerateSeeds.mockRejectedValue(error);

      await expect(generateConceptIdeas(context, 'test-api-key')).rejects.toBe(error);
      expect(mockGenerateCharacterWorlds).not.toHaveBeenCalled();
      expect(mockGenerateEngines).not.toHaveBeenCalled();
    });

    it('propagates architect errors without calling engineer', async () => {
      const seeds = createSeeds(6);
      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });

      const error = new Error('Architect failed');
      mockGenerateCharacterWorlds.mockRejectedValue(error);

      await expect(generateConceptIdeas(context, 'test-api-key')).rejects.toBe(error);
      expect(mockGenerateEngines).not.toHaveBeenCalled();
    });

    it('propagates engineer errors', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });

      const error = new Error('Engineer failed');
      mockGenerateEngines.mockRejectedValue(error);

      await expect(generateConceptIdeas(context, 'test-api-key')).rejects.toBe(error);
    });

    it('forwards generation options to all stages', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);
      const options = { temperature: 0.8 };

      mockGenerateSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await generateConceptIdeas(context, 'test-api-key', options);

      expect(mockGenerateSeeds).toHaveBeenCalledWith(context, 'test-api-key', options);
      expect(mockGenerateCharacterWorlds).toHaveBeenCalledWith(
        expect.any(Object),
        'test-api-key',
        options,
      );
      expect(mockGenerateEngines).toHaveBeenCalledWith(
        expect.any(Object),
        'test-api-key',
        options,
      );
    });
  });
});
