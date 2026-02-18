import { LLMError } from '@/llm/llm-client-types';
import type { ConceptDimensionScores, ConceptSpec, ConceptStressTestResult, EvaluatedConcept } from '@/models';
import {
  createConceptService,
  type GenerateConceptsInput,
  type StressTestInput,
} from '@/server/services/concept-service';

function createConceptSpec(index = 1): ConceptSpec {
  return {
    oneLineHook: `Hook ${index}`,
    elevatorParagraph: `Elevator paragraph ${index}`,
    genreFrame: 'NOIR',
    genreSubversion: `Subversion ${index}`,
    protagonistRole: `Role ${index}`,
    coreCompetence: `Competence ${index}`,
    coreFlaw: `Flaw ${index}`,
    actionVerbs: ['negotiate', 'investigate', 'sabotage', 'deceive', 'protect', 'infiltrate'],
    coreConflictLoop: `Conflict loop ${index}`,
    conflictAxis: 'TRUTH_VS_STABILITY',
    pressureSource: `Pressure ${index}`,
    stakesPersonal: `Personal stakes ${index}`,
    stakesSystemic: `Systemic stakes ${index}`,
    deadlineMechanism: `Deadline ${index}`,
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2', 'Constraint 3'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL',
    branchingPosture: 'RECONVERGE',
    stateComplexity: 'MEDIUM',
  };
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

describe('concept-service', () => {
  describe('generateConcepts', () => {
    it('calls ideator then evaluator with normalized inputs', async () => {
      const callOrder: string[] = [];
      const ideationConcepts = [createConceptSpec(1), createConceptSpec(2)];
      const evaluated = [createEvaluatedConcept(1)];
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
      expect(result).toEqual({ evaluatedConcepts: evaluated });
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
  });
});
