import { LLMError } from '@/llm/llm-client-types';
import type {
  ConceptDimensionScores,
  ConceptSpec,
  ConceptStressTestResult,
  EvaluatedConcept,
  ScoredConcept,
} from '@/models';
import {
  createConceptService,
  type GenerateConceptsInput,
  type StressTestInput,
} from '@/server/services/concept-service';
import { createConceptSpecFixture } from '../../../fixtures/concept-generator';

function createConceptSpec(index = 1): ConceptSpec {
  return createConceptSpecFixture(index);
}

function createScores(): ConceptDimensionScores {
  return {
    hookStrength: 4,
    conflictEngine: 4,
    agencyBreadth: 3,
    noveltyLeverage: 3,
    branchingFitness: 4,
    llmFeasibility: 4,
  };
}

function createEvaluatedConcept(index = 1): EvaluatedConcept {
  return {
    concept: createConceptSpec(index),
    scores: createScores(),
    overallScore: 80,
    strengths: ['Strong hook'],
    weaknesses: ['Lower novelty'],
    tradeoffSummary: 'Strong conflict, lower novelty.',
  };
}

function createScoredConcept(index = 1): ScoredConcept {
  return {
    concept: createConceptSpec(index),
    scores: createScores(),
    scoreEvidence: {
      hookStrength: [`Hook evidence ${index}`],
      conflictEngine: [`Conflict evidence ${index}`],
      agencyBreadth: [`Agency evidence ${index}`],
      noveltyLeverage: [`Novelty evidence ${index}`],
      branchingFitness: [`Branching evidence ${index}`],
      llmFeasibility: [`Feasibility evidence ${index}`],
    },
    overallScore: 80,
  };
}

describe('concept-service', () => {
  describe('generateConcepts', () => {
    it('calls ideator then evaluator with normalized inputs', async () => {
      const callOrder: string[] = [];
      const ideationConcepts = [createConceptSpec(1), createConceptSpec(2)];
      const evaluated = [createEvaluatedConcept(1)];
      const scored = [createScoredConcept(1), createScoredConcept(2)];
      const generateConceptIdeas = jest.fn(() => {
        callOrder.push('ideator');
        return Promise.resolve({
          concepts: ideationConcepts,
          rawResponse: 'raw-ideas',
        });
      });
      const evaluateConcepts = jest.fn(() => {
        callOrder.push('evaluator');
        return Promise.resolve({
          scoredConcepts: scored,
          evaluatedConcepts: evaluated,
          rawResponse: 'raw-eval',
        });
      });
      const stressTestConcept = jest.fn();
      const service = createConceptService({
        generateConceptIdeas,
        evaluateConcepts,
        stressTestConcept,
      });

      const input: GenerateConceptsInput = {
        genreVibes: ' noir ',
        moodKeywords: ' tense ',
        contentPreferences: ' no romance ',
        thematicInterests: ' identity ',
        sparkLine: ' what if memory had a market? ',
        apiKey: '  valid-key-12345  ',
      };

      const result = await service.generateConcepts(input);

      expect(callOrder).toEqual(['ideator', 'evaluator']);
      expect(generateConceptIdeas).toHaveBeenCalledWith(
        {
          genreVibes: 'noir',
          moodKeywords: 'tense',
          contentPreferences: 'no romance',
          thematicInterests: 'identity',
          sparkLine: 'what if memory had a market?',
        },
        'valid-key-12345',
      );
      expect(evaluateConcepts).toHaveBeenCalledWith(
        {
          concepts: ideationConcepts,
          userSeeds: {
            genreVibes: 'noir',
            moodKeywords: 'tense',
            contentPreferences: 'no romance',
            thematicInterests: 'identity',
            sparkLine: 'what if memory had a market?',
            apiKey: 'valid-key-12345',
          },
        },
        'valid-key-12345',
      );
      expect(result).toEqual({
        ideatedConcepts: ideationConcepts,
        scoredConcepts: scored,
        evaluatedConcepts: evaluated,
      });
      expect(stressTestConcept).not.toHaveBeenCalled();
    });

    it('rejects all-empty seeds', async () => {
      const service = createConceptService({
        generateConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          genreVibes: '   ',
          moodKeywords: undefined,
          contentPreferences: '',
          thematicInterests: '  ',
          sparkLine: undefined,
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('At least one concept seed field is required');
    });

    it('rejects missing apiKey', async () => {
      const service = createConceptService({
        generateConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          genreVibes: 'noir',
          apiKey: '  short ',
        }),
      ).rejects.toThrow('OpenRouter API key is required');
    });

    it('propagates LLMError from stage calls', async () => {
      const llmError = new LLMError('Rate limited', 'HTTP_429', true);
      const service = createConceptService({
        generateConceptIdeas: jest.fn().mockRejectedValue(llmError),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          genreVibes: 'dark fantasy',
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toBe(llmError);
    });

    it('emits stage callbacks for ideation and evaluation in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number }> = [];
      const service = createConceptService({
        generateConceptIdeas: jest.fn().mockResolvedValue({
          concepts: [createConceptSpec(1)],
          rawResponse: 'raw-ideas',
        }),
        evaluateConcepts: jest.fn().mockResolvedValue({
          scoredConcepts: [createScoredConcept(1)],
          evaluatedConcepts: [createEvaluatedConcept(1)],
          rawResponse: 'raw-eval',
        }),
        stressTestConcept: jest.fn(),
      });

      await service.generateConcepts({
        genreVibes: 'noir',
        apiKey: 'valid-key-12345',
        onGenerationStage: (event) => {
          events.push({
            stage: event.stage,
            status: event.status,
            attempt: event.attempt,
          });
        },
      });

      expect(events).toEqual([
        { stage: 'GENERATING_CONCEPTS', status: 'started', attempt: 1 },
        { stage: 'GENERATING_CONCEPTS', status: 'completed', attempt: 1 },
        { stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 },
        { stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 },
      ]);
    });
  });

  describe('stressTestConcept', () => {
    it('calls stress tester with normalized weaknesses and apiKey', async () => {
      const output: ConceptStressTestResult = {
        hardenedConcept: createConceptSpec(9),
        driftRisks: [
          {
            risk: 'Memory economy drifts into omnipotence',
            mitigation: 'Cap memory transfer per chapter',
            mitigationType: 'STATE_CONSTRAINT',
          },
        ],
        playerBreaks: [
          {
            scenario: 'Player hoards black-market memories',
            handling: 'Institution freezes transactions above quota',
            constraintUsed: 'Constraint 1',
          },
        ],
        rawResponse: 'raw-stress',
      };
      const stressTester = jest.fn().mockResolvedValue(output);
      const service = createConceptService({
        generateConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: stressTester,
      });

      const input: StressTestInput = {
        concept: createConceptSpec(1),
        scores: createScores(),
        weaknesses: ['  weak novelty  ', '  ', '  thin urgency  '],
        apiKey: '  valid-key-12345  ',
      };

      const result = await service.stressTestConcept(input);

      expect(stressTester).toHaveBeenCalledWith(
        {
          concept: input.concept,
          scores: input.scores,
          weaknesses: ['weak novelty', 'thin urgency'],
        },
        'valid-key-12345',
      );
      expect(result).toBe(output);
    });

    it('rejects invalid stress-test input payloads', async () => {
      const service = createConceptService({
        generateConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
      });

      await expect(
        service.stressTestConcept({
          concept: undefined as unknown as ConceptSpec,
          scores: createScores(),
          weaknesses: ['x'],
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('Concept is required');

      await expect(
        service.stressTestConcept({
          concept: createConceptSpec(1),
          scores: undefined as unknown as ConceptDimensionScores,
          weaknesses: ['x'],
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('Concept scores are required');

      await expect(
        service.stressTestConcept({
          concept: createConceptSpec(1),
          scores: createScores(),
          weaknesses: undefined as unknown as string[],
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('Concept weaknesses are required');
    });

    it('emits stress-test stage callbacks in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number }> = [];
      const output: ConceptStressTestResult = {
        hardenedConcept: createConceptSpec(9),
        driftRisks: [],
        playerBreaks: [],
        rawResponse: 'raw-stress',
      };
      const service = createConceptService({
        generateConceptIdeas: jest.fn(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn().mockResolvedValue(output),
      });

      await service.stressTestConcept({
        concept: createConceptSpec(1),
        scores: createScores(),
        weaknesses: ['Weak urgency'],
        apiKey: 'valid-key-12345',
        onGenerationStage: (event) => {
          events.push({
            stage: event.stage,
            status: event.status,
            attempt: event.attempt,
          });
        },
      });

      expect(events).toEqual([
        { stage: 'STRESS_TESTING_CONCEPT', status: 'started', attempt: 1 },
        { stage: 'STRESS_TESTING_CONCEPT', status: 'completed', attempt: 1 },
      ]);
    });
  });
});
