import { evaluateConcepts } from '../../llm/concept-evaluator.js';
import {
  generateConceptIdeas,
  generateConceptIdeation,
  generateConceptDevelopment,
} from '../../llm/concept-ideator.js';
import type { ConceptIdeationPhaseResult } from '../../llm/concept-ideator.js';
import { stressTestConcept as runConceptStressTest } from '../../llm/concept-stress-tester.js';
import { verifyConcepts as runVerifyConcepts } from '../../llm/concept-verifier.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import type {
  ConceptCharacterWorldFields,
  ConceptDimensionScores,
  ConceptSeedFields,
  ConceptSpec,
  ConceptVerification,
  ScoredConcept,
  ConceptStressTestResult,
  EvaluatedConcept,
} from '../../models/index.js';
import type { GenreFrame } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';

export interface GenerateConceptsInput {
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly excludedGenres?: readonly GenreFrame[];
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

export interface IdeateConceptsInput {
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
  readonly excludedGenres?: readonly GenreFrame[];
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface IdeateConceptsResult {
  readonly seeds: readonly ConceptSeedFields[];
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
}

export interface DevelopConceptsInput {
  readonly seeds: readonly ConceptSeedFields[];
  readonly characterWorlds: readonly ConceptCharacterWorldFields[];
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export type DevelopConceptsResult = GenerateConceptsResult;

export interface StressTestInput {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
  readonly verification?: ConceptVerification;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

interface ConceptServiceDeps {
  readonly generateConceptIdeas: typeof generateConceptIdeas;
  readonly generateConceptIdeation: typeof generateConceptIdeation;
  readonly generateConceptDevelopment: typeof generateConceptDevelopment;
  readonly evaluateConcepts: typeof evaluateConcepts;
  readonly stressTestConcept: typeof runConceptStressTest;
  readonly verifyConcepts: typeof runVerifyConcepts;
}

export interface ConceptService {
  generateConcepts(input: GenerateConceptsInput): Promise<GenerateConceptsResult>;
  ideateConcepts(input: IdeateConceptsInput): Promise<IdeateConceptsResult>;
  developConcepts(input: DevelopConceptsInput): Promise<DevelopConceptsResult>;
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
  generateConceptIdeation,
  generateConceptDevelopment,
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

function requireProtagonistDetails(input: { protagonistDetails?: string }): string {
  const trimmed = input.protagonistDetails?.trim();
  if (!trimmed || trimmed.length === 0) {
    throw new Error('Protagonist details are required');
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
  verification?: ConceptVerification;
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
    verification: input.verification,
    apiKey,
  };
}

export function createConceptService(deps: ConceptServiceDeps = defaultDeps): ConceptService {
  return {
    async generateConcepts(input: GenerateConceptsInput): Promise<GenerateConceptsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const protagonistDetails = requireProtagonistDetails(input);
      const seeds = requireConceptSeeds(input);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;

      onGenerationStage?.({
        stage: 'SEEDING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      onGenerationStage?.({
        stage: 'ARCHITECTING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      onGenerationStage?.({
        stage: 'ENGINEERING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      const ideation = await deps.generateConceptIdeas(
        { ...seeds, protagonistDetails, excludedGenres: input.excludedGenres, kernel },
        apiKey,
      );
      onGenerationStage?.({
        stage: 'ENGINEERING_CONCEPTS',
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
        stage: 'ANALYZING_SPECIFICITY',
        status: 'started',
        attempt: 1,
      });
      const verification = await deps.verifyConcepts(
        { evaluatedConcepts: evaluation.evaluatedConcepts, kernel },
        apiKey,
      );
      onGenerationStage?.({
        stage: 'GENERATING_SCENARIOS',
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

    async ideateConcepts(input: IdeateConceptsInput): Promise<IdeateConceptsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const protagonistDetails = requireProtagonistDetails(input);
      const seeds = requireConceptSeeds(input);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;

      onGenerationStage?.({ stage: 'SEEDING_CONCEPTS', status: 'started', attempt: 1 });
      onGenerationStage?.({ stage: 'ARCHITECTING_CONCEPTS', status: 'started', attempt: 1 });
      const ideation: ConceptIdeationPhaseResult = await deps.generateConceptIdeation(
        { ...seeds, protagonistDetails, excludedGenres: input.excludedGenres, kernel },
        apiKey,
      );
      onGenerationStage?.({ stage: 'ARCHITECTING_CONCEPTS', status: 'completed', attempt: 1 });

      return { seeds: ideation.seeds, characterWorlds: ideation.characterWorlds };
    },

    async developConcepts(input: DevelopConceptsInput): Promise<DevelopConceptsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;

      if (!Array.isArray(input.seeds) || input.seeds.length === 0) {
        throw new Error('At least one concept seed is required');
      }
      if (!Array.isArray(input.characterWorlds) || input.characterWorlds.length !== input.seeds.length) {
        throw new Error('characterWorlds must match seeds length');
      }

      onGenerationStage?.({ stage: 'ENGINEERING_CONCEPTS', status: 'started', attempt: 1 });
      const development = await deps.generateConceptDevelopment(
        { seeds: input.seeds, characterWorlds: input.characterWorlds, kernel },
        apiKey,
      );
      onGenerationStage?.({ stage: 'ENGINEERING_CONCEPTS', status: 'completed', attempt: 1 });

      onGenerationStage?.({ stage: 'EVALUATING_CONCEPTS', status: 'started', attempt: 1 });
      const evaluation = await deps.evaluateConcepts(
        {
          concepts: development.concepts,
          userSeeds: { apiKey },
        },
        apiKey,
      ).catch((error: unknown) => {
        throw new ConceptEvaluationStageError(development.concepts, error);
      });
      onGenerationStage?.({ stage: 'EVALUATING_CONCEPTS', status: 'completed', attempt: 1 });

      onGenerationStage?.({ stage: 'ANALYZING_SPECIFICITY', status: 'started', attempt: 1 });
      const verification = await deps.verifyConcepts(
        { evaluatedConcepts: evaluation.evaluatedConcepts, kernel },
        apiKey,
      );
      onGenerationStage?.({ stage: 'GENERATING_SCENARIOS', status: 'completed', attempt: 1 });

      return {
        ideatedConcepts: development.concepts,
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
          verification: normalized.verification,
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
