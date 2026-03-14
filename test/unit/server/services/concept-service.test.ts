import { LLMError } from '@/llm/llm-client-types';
import type {
  ConceptDimensionScores,
  ConceptSpec,
  ConceptStressTestResult,
  ConceptVerification,
  EvaluatedConcept,
  ScoredConcept,
} from '@/models';
import {
  ConceptEvaluationStageError,
  createConceptService,
  type GenerateConceptsInput,
  type StressTestInput,
} from '@/server/services/concept-service';
import type { StoryKernel } from '@/models/story-kernel';
import {
  createConceptSpecFixture,
  createConceptSeedFixture,
  createConceptCharacterWorldFixture,
  createConceptEngineFixture,
  createConceptVerificationFixture,
} from '../../../fixtures/concept-generator';

function createConceptSpec(index = 1): ConceptSpec {
  return createConceptSpecFixture(index);
}

function createScores(): ConceptDimensionScores {
  return {
    hookStrength: 4,
    conflictEngine: 4,
    agencyBreadth: 3,
    noveltyLeverage: 3,
    ironicPremise: 3,
    sceneGenerativePower: 3,
    contentCharge: 3,
  };
}

function createEvaluatedConcept(index = 1): EvaluatedConcept {
  return {
    concept: createConceptSpec(index),
    scores: createScores(),
    overallScore: 80,
    passes: true,
    strengths: ['Strong hook'],
    weaknesses: ['Lower novelty'],
    tradeoffSummary: 'Strong conflict, lower novelty.',
  };
}

function createStoryKernel(): StoryKernel {
  return {
    dramaticThesis: 'Control destroys trust',
    valueAtStake: 'Trust',
    opposingForce: 'Fear of uncertainty',
    directionOfChange: 'IRONIC',
    conflictAxis: 'DUTY_VS_DESIRE',
    dramaticStance: 'TRAGIC',
    thematicQuestion: 'Can safety exist without control?',
    antithesis: 'Counter-argument challenges the thesis.',
    moralArgument: 'Test moral argument',
    valueSpectrum: {
      positive: 'Love',
      contrary: 'Indifference',
      contradictory: 'Hate',
      negationOfNegation: 'Self-destruction through love',
    },
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
      ironicPremise: [`Irony evidence ${index}`],
      sceneGenerativePower: [`Scene evidence ${index}`],
      contentCharge: [`Content charge evidence ${index}`],
    },
    overallScore: 80,
    passes: true,
  };
}

function expectCompletedStage(
  event: { stage: string; status: string; attempt: number; durationMs?: number },
  stage: string,
): void {
  expect(event).toMatchObject({ stage, status: 'completed', attempt: 1 });
  expect(typeof event.durationMs).toBe('number');
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createConceptStageDeps() {
  const generatedSeeds = [createConceptSeedFixture(1), createConceptSeedFixture(2)];
  const generatedCharacterWorlds = [
    createConceptCharacterWorldFixture(1),
    createConceptCharacterWorldFixture(2),
  ];
  const generatedEngines = [createConceptEngineFixture(1), createConceptEngineFixture(2)];

  return {
    generatedSeeds,
    generatedCharacterWorlds,
    generatedEngines,
    generateConceptSeeds: jest.fn().mockResolvedValue({
      seeds: generatedSeeds,
      rawResponse: 'raw-seeds',
    }),
    generateConceptCharacterWorlds: jest.fn().mockResolvedValue({
      characterWorlds: generatedCharacterWorlds,
      rawResponse: 'raw-character-worlds',
    }),
    generateConceptEngines: jest.fn().mockResolvedValue({
      engines: generatedEngines,
      rawResponse: 'raw-engines',
    }),
  };
}

describe('concept-service', () => {
  describe('generateConcepts', () => {
    it('calls ideator then evaluator then verifier with normalized inputs', async () => {
      const callOrder: string[] = [];
      const evaluated = [createEvaluatedConcept(1)];
      const scored = [createScoredConcept(1), createScoredConcept(2)];
      const verifications: ConceptVerification[] = [createConceptVerificationFixture(1)];
      const deps = createConceptStageDeps();
      deps.generateConceptSeeds.mockImplementation(() => {
        callOrder.push('seeder');
        return Promise.resolve({
          seeds: deps.generatedSeeds,
          rawResponse: 'raw-seeds',
        });
      });
      deps.generateConceptCharacterWorlds.mockImplementation(() => {
        callOrder.push('architect');
        return Promise.resolve({
          characterWorlds: deps.generatedCharacterWorlds,
          rawResponse: 'raw-character-worlds',
        });
      });
      deps.generateConceptEngines.mockImplementation(() => {
        callOrder.push('engineer');
        return Promise.resolve({
          engines: deps.generatedEngines,
          rawResponse: 'raw-engines',
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
      const verifyConcepts = jest.fn(() => {
        callOrder.push('verifier');
        return Promise.resolve({
          verifications,
          rawResponse: 'raw-verify',
        });
      });
      const stressTestConcept = jest.fn();
      const service = createConceptService({
        ...deps,
        evaluateConcepts,
        stressTestConcept,
        verifyConcepts,
      });

      const input: GenerateConceptsInput = {
        protagonistDetails: ' a disgraced surgeon ',
        genreVibes: ' noir ',
        moodKeywords: ' tense ',
        contentPreferences: ' no romance ',
        kernel: createStoryKernel(),
        apiKey: '  valid-key-12345  ',
      };

      const result = await service.generateConcepts(input);

      expect(callOrder).toEqual(['seeder', 'architect', 'engineer', 'evaluator', 'verifier']);
      expect(deps.generateConceptSeeds).toHaveBeenCalledWith(
        {
          protagonistDetails: 'a disgraced surgeon',
          genreVibes: 'noir',
          moodKeywords: 'tense',
          contentPreferences: 'no romance',
          kernel: createStoryKernel(),
        },
        'valid-key-12345',
      );
      expect(deps.generateConceptCharacterWorlds).toHaveBeenCalledWith(
        {
          seeds: deps.generatedSeeds,
          protagonistDetails: 'a disgraced surgeon',
          genreVibes: 'noir',
          moodKeywords: 'tense',
          contentPreferences: 'no romance',
          kernel: createStoryKernel(),
        },
        'valid-key-12345',
      );
      expect(deps.generateConceptEngines).toHaveBeenCalledWith(
        {
          seeds: deps.generatedSeeds,
          characterWorlds: deps.generatedCharacterWorlds,
          protagonistDetails: 'a disgraced surgeon',
          genreVibes: 'noir',
          moodKeywords: 'tense',
          contentPreferences: 'no romance',
          kernel: createStoryKernel(),
        },
        'valid-key-12345',
      );
      expect(evaluateConcepts).toHaveBeenCalledWith(
        {
          concepts: [createConceptSpec(1), createConceptSpec(2)],
          userSeeds: {
            genreVibes: 'noir',
            moodKeywords: 'tense',
            contentPreferences: 'no romance',
            apiKey: 'valid-key-12345',
          },
        },
        'valid-key-12345',
      );
      expect(verifyConcepts).toHaveBeenCalledWith(
        { evaluatedConcepts: evaluated, kernel: createStoryKernel() },
        'valid-key-12345',
      );
      expect(result).toEqual({
        ideatedConcepts: [createConceptSpec(1), createConceptSpec(2)],
        scoredConcepts: scored,
        evaluatedConcepts: evaluated,
        verifications,
      });
      expect(stressTestConcept).not.toHaveBeenCalled();
    });

    it('rejects all-empty seeds', async () => {
      const service = createConceptService({
        ...createConceptStageDeps(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          protagonistDetails: 'a wandering knight',
          genreVibes: '   ',
          moodKeywords: undefined,
          contentPreferences: '',
          kernel: createStoryKernel(),
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('At least one concept seed field is required');
    });

    it('rejects missing apiKey', async () => {
      const service = createConceptService({
        ...createConceptStageDeps(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          protagonistDetails: 'a wandering knight',
          genreVibes: 'noir',
          kernel: createStoryKernel(),
          apiKey: '  short ',
        }),
      ).rejects.toThrow('OpenRouter API key is required');
    });

    it('propagates LLMError from stage calls', async () => {
      const llmError = new LLMError('Rate limited', 'HTTP_429', true);
      const service = createConceptService({
        ...createConceptStageDeps(),
        generateConceptSeeds: jest.fn().mockRejectedValue(llmError),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          protagonistDetails: 'a wandering knight',
          genreVibes: 'dark fantasy',
          kernel: createStoryKernel(),
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toBe(llmError);
    });

    it('wraps evaluation failures with ideated concepts for partial persistence', async () => {
      const llmError = new LLMError('Scored concept 4 has invalid scores', 'STRUCTURE_PARSE_ERROR', true);
      const deps = createConceptStageDeps();
      const ideationConcepts = [createConceptSpec(1), createConceptSpec(2)];
      const service = createConceptService({
        ...deps,
        evaluateConcepts: jest.fn().mockRejectedValue(llmError),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await service
        .generateConcepts({
          protagonistDetails: 'a wandering knight',
          genreVibes: 'dark fantasy',
          kernel: createStoryKernel(),
          apiKey: 'valid-key-12345',
        })
        .then(() => {
          throw new Error('Expected generateConcepts to reject');
        })
        .catch((error: unknown) => {
          expect(error).toBeInstanceOf(ConceptEvaluationStageError);
          const stageError = error as ConceptEvaluationStageError;
          expect(stageError.ideatedConcepts).toEqual(ideationConcepts);
          expect(stageError.cause).toBe(llmError);
        });
    });

    it('emits stage callbacks for ideation, evaluation, and verification in order', async () => {
      const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
      const deps = createConceptStageDeps();
      const service = createConceptService({
        ...deps,
        evaluateConcepts: jest.fn().mockResolvedValue({
          scoredConcepts: [createScoredConcept(1)],
          evaluatedConcepts: [createEvaluatedConcept(1)],
          rawResponse: 'raw-eval',
        }),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn().mockResolvedValue({
          verifications: [createConceptVerificationFixture(1)],
          rawResponse: 'raw-verify',
        }),
      });

      await service.generateConcepts({
        protagonistDetails: 'a wandering knight',
        genreVibes: 'noir',
        kernel: createStoryKernel(),
        apiKey: 'valid-key-12345',
        onGenerationStage: (event) => {
          events.push(event);
        },
      });

      expect(events).toHaveLength(10);
      expect(events[0]).toEqual({ stage: 'SEEDING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[1] as { stage: string; status: string; attempt: number; durationMs?: number }, 'SEEDING_CONCEPTS');
      expect(events[2]).toEqual({ stage: 'ARCHITECTING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[3] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ARCHITECTING_CONCEPTS');
      expect(events[4]).toEqual({ stage: 'ENGINEERING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[5] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ENGINEERING_CONCEPTS');
      expect(events[6]).toEqual({ stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 });
      expectCompletedStage(events[7] as { stage: string; status: string; attempt: number; durationMs?: number }, 'EVALUATING_CONCEPTS');
      expect(events[8]).toEqual({ stage: 'ANALYZING_SPECIFICITY', status: 'started', attempt: 1 });
      expectCompletedStage(events[9] as { stage: string; status: string; attempt: number; durationMs?: number }, 'ANALYZING_SPECIFICITY');
    });

    it('rejects missing kernel', async () => {
      const service = createConceptService({
        ...createConceptStageDeps(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
      });

      await expect(
        service.generateConcepts({
          protagonistDetails: 'a wandering knight',
          genreVibes: 'noir',
          kernel: undefined as unknown as StoryKernel,
          apiKey: 'valid-key-12345',
        }),
      ).rejects.toThrow('Story kernel is required');
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
        ...createConceptStageDeps(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: stressTester,
        verifyConcepts: jest.fn(),
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
        ...createConceptStageDeps(),
        evaluateConcepts: jest.fn(),
        stressTestConcept: jest.fn(),
        verifyConcepts: jest.fn(),
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
      const events: Array<{ stage: string; status: string; attempt: number; durationMs?: number }> = [];
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
        verifyConcepts: jest.fn(),
      });

      await service.stressTestConcept({
        concept: createConceptSpec(1),
        scores: createScores(),
        weaknesses: ['Weak urgency'],
        apiKey: 'valid-key-12345',
        onGenerationStage: (event) => {
          events.push(event);
        },
      });

      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ stage: 'STRESS_TESTING_CONCEPT', status: 'started', attempt: 1 });
      expectCompletedStage(events[1] as { stage: string; status: string; attempt: number; durationMs?: number }, 'STRESS_TESTING_CONCEPT');
    });
  });
});
