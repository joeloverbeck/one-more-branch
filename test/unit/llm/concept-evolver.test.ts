jest.mock('../../../src/llm/concept-evolver-seeder.js', () => ({
  generateEvolvedConceptSeeds: jest.fn(),
}));

jest.mock('../../../src/llm/concept-architect.js', () => ({
  generateConceptCharacterWorlds: jest.fn(),
}));

jest.mock('../../../src/llm/concept-engineer.js', () => ({
  generateConceptEngines: jest.fn(),
}));

import { evolveConceptIdeas } from '../../../src/llm/concept-evolver';
import { generateEvolvedConceptSeeds } from '../../../src/llm/concept-evolver-seeder';
import { generateConceptCharacterWorlds } from '../../../src/llm/concept-architect';
import { generateConceptEngines } from '../../../src/llm/concept-engineer';
import type { ConceptEvolverContext } from '../../../src/models';
import {
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
  createConceptEngineFixture,
  createEvaluatedConceptFixture,
} from '../../fixtures/concept-generator';

const mockGenerateEvolvedSeeds = generateEvolvedConceptSeeds as jest.MockedFunction<
  typeof generateEvolvedConceptSeeds
>;
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

function createContext(): ConceptEvolverContext {
  return {
    kernel: {
      dramaticThesis: 'Control corrodes trust',
      valueAtStake: 'Trust',
      opposingForce: 'Fear of uncertainty',
      directionOfChange: 'IRONIC',
      thematicQuestion: 'Can safety exist without control?',
      antithesis: 'Counter-argument challenges the thesis.',
    },
    parentConcepts: [createEvaluatedConceptFixture(1), createEvaluatedConceptFixture(2)],
  };
}

describe('concept-evolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evolveConceptIdeas', () => {
    it('calls evolver-seeder → architect → engineer in sequence and merges results', async () => {
      const callOrder: string[] = [];
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateEvolvedSeeds.mockImplementation(() => {
        callOrder.push('evolver-seeder');
        return Promise.resolve({ seeds, rawResponse: 'raw-evolved-seeds' });
      });
      mockGenerateCharacterWorlds.mockImplementation(() => {
        callOrder.push('architect');
        return Promise.resolve({ characterWorlds, rawResponse: 'raw-architect' });
      });
      mockGenerateEngines.mockImplementation(() => {
        callOrder.push('engineer');
        return Promise.resolve({ engines, rawResponse: 'raw-engineer' });
      });

      const result = await evolveConceptIdeas(createContext(), 'test-api-key');

      expect(callOrder).toEqual(['evolver-seeder', 'architect', 'engineer']);
      expect(result.concepts).toHaveLength(6);
      expect(result.rawResponse).toBe('raw-engineer');
    });

    it('passes context and apiKey to evolver seeder', async () => {
      const context = createContext();
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateEvolvedSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await evolveConceptIdeas(context, 'test-api-key');

      expect(mockGenerateEvolvedSeeds).toHaveBeenCalledWith(context, 'test-api-key', undefined);
    });

    it('passes seeds and kernel to architect', async () => {
      const context = createContext();
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateEvolvedSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await evolveConceptIdeas(context, 'test-api-key');

      expect(mockGenerateCharacterWorlds).toHaveBeenCalledWith(
        { seeds, kernel: context.kernel },
        'test-api-key',
        undefined,
      );
    });

    it('passes seeds, characterWorlds, and kernel to engineer', async () => {
      const context = createContext();
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      const engines = createEngines(6);

      mockGenerateEvolvedSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });
      mockGenerateEngines.mockResolvedValue({ engines, rawResponse: 'raw' });

      await evolveConceptIdeas(context, 'test-api-key');

      expect(mockGenerateEngines).toHaveBeenCalledWith(
        { seeds, characterWorlds, kernel: context.kernel },
        'test-api-key',
        undefined,
      );
    });

    it('propagates evolver-seeder errors without calling downstream stages', async () => {
      const error = new Error('Evolver seeder failed');
      mockGenerateEvolvedSeeds.mockRejectedValue(error);

      await expect(evolveConceptIdeas(createContext(), 'test-api-key')).rejects.toBe(error);
      expect(mockGenerateCharacterWorlds).not.toHaveBeenCalled();
      expect(mockGenerateEngines).not.toHaveBeenCalled();
    });

    it('propagates architect errors without calling engineer', async () => {
      const seeds = createSeeds(6);
      mockGenerateEvolvedSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });

      const error = new Error('Architect failed');
      mockGenerateCharacterWorlds.mockRejectedValue(error);

      await expect(evolveConceptIdeas(createContext(), 'test-api-key')).rejects.toBe(error);
      expect(mockGenerateEngines).not.toHaveBeenCalled();
    });

    it('propagates engineer errors', async () => {
      const seeds = createSeeds(6);
      const characterWorlds = createCharacterWorlds(6);
      mockGenerateEvolvedSeeds.mockResolvedValue({ seeds, rawResponse: 'raw' });
      mockGenerateCharacterWorlds.mockResolvedValue({ characterWorlds, rawResponse: 'raw' });

      const error = new Error('Engineer failed');
      mockGenerateEngines.mockRejectedValue(error);

      await expect(evolveConceptIdeas(createContext(), 'test-api-key')).rejects.toBe(error);
    });
  });
});
