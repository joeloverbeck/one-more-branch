import { evaluateConcepts } from '../../llm/concept-evaluator.js';
import { generateConceptIdeas } from '../../llm/concept-ideator.js';
import { stressTestConcept as runConceptStressTest } from '../../llm/concept-stress-tester.js';
import { verifyConcepts as runVerifyConcepts } from '../../llm/concept-verifier.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import type {
  ConceptDimensionScores,
  ConceptSpec,
  ConceptVerification,
  ScoredConcept,
  ConceptStressTestResult,
  EvaluatedConcept,
} from '../../models/index.js';
import type { StoryKernel } from '../../models/story-kernel.js';

export interface GenerateConceptsInput {
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface GenerateConceptsResult {
  readonly ideatedConcepts: readonly ConceptSpec[];
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly verifications: readonly ConceptVerification[];
}

export interface StressTestInput {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

interface ConceptServiceDeps {
  readonly generateConceptIdeas: typeof generateConceptIdeas;
  readonly evaluateConcepts: typeof evaluateConcepts;
  readonly stressTestConcept: typeof runConceptStressTest;
  readonly verifyConcepts: typeof runVerifyConcepts;
}

export interface ConceptService {
  generateConcepts(input: GenerateConceptsInput): Promise<GenerateConceptsResult>;
  stressTestConcept(input: StressTestInput): Promise<ConceptStressTestResult>;
}

export class ConceptEvaluationStageError extends Error {
  public readonly name = 'ConceptEvaluationStageError';

  constructor(
    public readonly ideatedConcepts: readonly ConceptSpec[],
    public readonly cause: unknown,
  ) {
    super('Concept evaluation stage failed');
  }
}

const defaultDeps: ConceptServiceDeps = {
  generateConceptIdeas,
  evaluateConcepts,
  stressTestConcept: runConceptStressTest,
  verifyConcepts: runVerifyConcepts,
};

function trimSeed(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }

  return trimmed;
}

function requireConceptSeeds(input: GenerateConceptsInput): {
  genreVibes?: string;
  moodKeywords?: string;
  contentPreferences?: string;
} {
  const seeds = {
    genreVibes: trimSeed(input.genreVibes),
    moodKeywords: trimSeed(input.moodKeywords),
    contentPreferences: trimSeed(input.contentPreferences),
  };

  if (!Object.values(seeds).some((value) => value !== undefined)) {
    throw new Error('At least one concept seed field is required');
  }

  return seeds;
}

function requireKernel(kernel: StoryKernel | undefined): StoryKernel {
  if (!kernel || typeof kernel !== 'object') {
    throw new Error('Story kernel is required');
  }

  return kernel;
}

function requireStressTestInput(input: StressTestInput): {
  concept: ConceptSpec;
  scores: ConceptDimensionScores;
  weaknesses: readonly string[];
  apiKey: string;
} {
  const apiKey = requireApiKey(input.apiKey);

  if (!input.concept || typeof input.concept !== 'object') {
    throw new Error('Concept is required');
  }

  if (!input.scores || typeof input.scores !== 'object') {
    throw new Error('Concept scores are required');
  }

  const weaknesses = input.weaknesses as unknown;
  if (!Array.isArray(weaknesses) || weaknesses.length === 0) {
    throw new Error('Concept weaknesses are required');
  }

  const normalizedWeaknesses = weaknesses
    .filter((weakness): weakness is string => typeof weakness === 'string')
    .map((weakness) => weakness.trim())
    .filter((weakness) => weakness.length > 0);

  return {
    concept: input.concept,
    scores: input.scores,
    weaknesses: normalizedWeaknesses,
    apiKey,
  };
}

export function createConceptService(deps: ConceptServiceDeps = defaultDeps): ConceptService {
  return {
    async generateConcepts(input: GenerateConceptsInput): Promise<GenerateConceptsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const seeds = requireConceptSeeds(input);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;

      onGenerationStage?.({
        stage: 'GENERATING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      const ideation = await deps.generateConceptIdeas({ ...seeds, kernel }, apiKey);
      onGenerationStage?.({
        stage: 'GENERATING_CONCEPTS',
        status: 'completed',
        attempt: 1,
      });

      onGenerationStage?.({
        stage: 'EVALUATING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      const evaluation = await deps.evaluateConcepts(
        {
          concepts: ideation.concepts,
          userSeeds: {
            ...seeds,
            apiKey,
          },
        },
        apiKey,
      ).catch((error: unknown) => {
        throw new ConceptEvaluationStageError(ideation.concepts, error);
      });
      onGenerationStage?.({
        stage: 'EVALUATING_CONCEPTS',
        status: 'completed',
        attempt: 1,
      });

      onGenerationStage?.({
        stage: 'VERIFYING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      const verification = await deps.verifyConcepts(
        { evaluatedConcepts: evaluation.evaluatedConcepts },
        apiKey,
      );
      onGenerationStage?.({
        stage: 'VERIFYING_CONCEPTS',
        status: 'completed',
        attempt: 1,
      });

      return {
        ideatedConcepts: ideation.concepts,
        scoredConcepts: evaluation.scoredConcepts,
        evaluatedConcepts: evaluation.evaluatedConcepts,
        verifications: verification.verifications,
      };
    },

    async stressTestConcept(input: StressTestInput): Promise<ConceptStressTestResult> {
      const normalized = requireStressTestInput(input);
      const onGenerationStage = input.onGenerationStage;

      onGenerationStage?.({
        stage: 'STRESS_TESTING_CONCEPT',
        status: 'started',
        attempt: 1,
      });
      const result = await deps.stressTestConcept(
        {
          concept: normalized.concept,
          scores: normalized.scores,
          weaknesses: normalized.weaknesses,
        },
        normalized.apiKey,
      );
      onGenerationStage?.({
        stage: 'STRESS_TESTING_CONCEPT',
        status: 'completed',
        attempt: 1,
      });

      return result;
    },
  };
}

export const conceptService = createConceptService();
