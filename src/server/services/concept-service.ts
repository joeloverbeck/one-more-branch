import { evaluateConcepts } from '../../llm/concept-evaluator.js';
import { generateConceptSeeds } from '../../llm/concept-seeder.js';
import { generateConceptCharacterWorlds } from '../../llm/concept-architect.js';
import { generateConceptEngines } from '../../llm/concept-engineer.js';
import { generateSingleConceptEngine } from '../../llm/concept-single-engineer.js';
import { evaluateSingleConcept } from '../../llm/concept-single-evaluator.js';
import { verifySingleConcept } from '../../llm/concept-single-verifier.js';
import { mergeConceptStages } from '../../llm/concept-ideator.js';
import { stressTestConcept as runConceptStressTest } from '../../llm/concept-stress-tester.js';
import { verifyConcepts as runVerifyConcepts } from '../../llm/concept-verifier.js';
import { runGenerationStage } from '../../engine/generation-pipeline-helpers.js';
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
import type { ConceptSeed } from '../../models/concept-seed.js';
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

export interface DevelopSingleConceptInput {
  readonly seed: ConceptSeed;
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface DevelopSingleConceptResult {
  readonly concept: ConceptSpec;
  readonly evaluatedConcept: EvaluatedConcept;
  readonly verification: ConceptVerification;
}

export interface StressTestInput {
  readonly concept: ConceptSpec;
  readonly scores: ConceptDimensionScores;
  readonly weaknesses: readonly string[];
  readonly verification?: ConceptVerification;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
}

interface ConceptServiceDeps {
  readonly generateConceptSeeds: typeof generateConceptSeeds;
  readonly generateConceptCharacterWorlds: typeof generateConceptCharacterWorlds;
  readonly generateConceptEngines: typeof generateConceptEngines;
  readonly evaluateConcepts: typeof evaluateConcepts;
  readonly stressTestConcept: typeof runConceptStressTest;
  readonly verifyConcepts: typeof runVerifyConcepts;
}

export interface ConceptService {
  generateConcepts(input: GenerateConceptsInput): Promise<GenerateConceptsResult>;
  ideateConcepts(input: IdeateConceptsInput): Promise<IdeateConceptsResult>;
  developConcepts(input: DevelopConceptsInput): Promise<DevelopConceptsResult>;
  developSingleConcept(input: DevelopSingleConceptInput): Promise<DevelopSingleConceptResult>;
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
  generateConceptSeeds,
  generateConceptCharacterWorlds,
  generateConceptEngines,
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

      const seedResult = await runGenerationStage(onGenerationStage, 'SEEDING_CONCEPTS', () =>
        deps.generateConceptSeeds(
          { ...seeds, protagonistDetails, excludedGenres: input.excludedGenres, kernel },
          apiKey,
        ),
      );
      const architectResult = await runGenerationStage(onGenerationStage, 'ARCHITECTING_CONCEPTS', () =>
        deps.generateConceptCharacterWorlds(
            {
              seeds: seedResult.seeds,
              protagonistDetails,
              genreVibes: seeds.genreVibes,
              moodKeywords: seeds.moodKeywords,
              contentPreferences: seeds.contentPreferences,
            kernel,
          },
          apiKey,
        ),
      );
      const engineResult = await runGenerationStage(onGenerationStage, 'ENGINEERING_CONCEPTS', () =>
        deps.generateConceptEngines(
          {
            seeds: seedResult.seeds,
            characterWorlds: architectResult.characterWorlds,
            protagonistDetails,
            genreVibes: seeds.genreVibes,
            moodKeywords: seeds.moodKeywords,
            contentPreferences: seeds.contentPreferences,
            kernel,
          },
          apiKey,
        ),
      );
      const concepts = mergeConceptStages(
        seedResult.seeds,
        architectResult.characterWorlds,
        engineResult.engines,
      );
      const evaluation = await runGenerationStage(onGenerationStage, 'EVALUATING_CONCEPTS', () =>
        deps
          .evaluateConcepts(
            {
              concepts,
              userSeeds: {
                ...seeds,
                apiKey,
              },
            },
            apiKey,
          )
          .catch((error: unknown) => {
            throw new ConceptEvaluationStageError(concepts, error);
          }),
      );
      const verification = await runGenerationStage(onGenerationStage, 'ANALYZING_SPECIFICITY', () =>
        deps.verifyConcepts({ evaluatedConcepts: evaluation.evaluatedConcepts, kernel }, apiKey),
      );

      return {
        ideatedConcepts: concepts,
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

      const seedResult = await runGenerationStage(onGenerationStage, 'SEEDING_CONCEPTS', () =>
        deps.generateConceptSeeds(
          { ...seeds, protagonistDetails, excludedGenres: input.excludedGenres, kernel },
          apiKey,
        ),
      );
      const architectResult = await runGenerationStage(onGenerationStage, 'ARCHITECTING_CONCEPTS', () =>
        deps.generateConceptCharacterWorlds(
          {
            seeds: seedResult.seeds,
            protagonistDetails,
            genreVibes: seeds.genreVibes,
            moodKeywords: seeds.moodKeywords,
            contentPreferences: seeds.contentPreferences,
            kernel,
          },
          apiKey,
        ),
      );

      return { seeds: seedResult.seeds, characterWorlds: architectResult.characterWorlds };
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

      const engineResult = await runGenerationStage(onGenerationStage, 'ENGINEERING_CONCEPTS', () =>
        deps.generateConceptEngines(
          { seeds: input.seeds, characterWorlds: input.characterWorlds, kernel },
          apiKey,
        ),
      );
      const concepts = mergeConceptStages(input.seeds, input.characterWorlds, engineResult.engines);
      const evaluation = await runGenerationStage(onGenerationStage, 'EVALUATING_CONCEPTS', () =>
        deps
          .evaluateConcepts(
            {
              concepts,
              userSeeds: { apiKey },
            },
            apiKey,
          )
          .catch((error: unknown) => {
            throw new ConceptEvaluationStageError(concepts, error);
          }),
      );
      const verification = await runGenerationStage(onGenerationStage, 'ANALYZING_SPECIFICITY', () =>
        deps.verifyConcepts({ evaluatedConcepts: evaluation.evaluatedConcepts, kernel }, apiKey),
      );

      return {
        ideatedConcepts: concepts,
        scoredConcepts: evaluation.scoredConcepts,
        evaluatedConcepts: evaluation.evaluatedConcepts,
        verifications: verification.verifications,
      };
    },

    async developSingleConcept(
      input: DevelopSingleConceptInput,
    ): Promise<DevelopSingleConceptResult> {
      const apiKey = requireApiKey(input.apiKey);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;
      const seed = input.seed;

      const seedFields: ConceptSeedFields = {
        oneLineHook: seed.oneLineHook,
        genreFrame: seed.genreFrame,
        genreSubversion: seed.genreSubversion,
        conflictAxis: seed.conflictAxis,
        conflictType: seed.conflictType,
        whatIfQuestion: seed.whatIfQuestion,
        playerFantasy: seed.playerFantasy,
      };

      const characterWorld: ConceptCharacterWorldFields = {
        protagonistRole: seed.protagonistRole,
        coreCompetence: seed.coreCompetence,
        coreFlaw: seed.coreFlaw,
        actionVerbs: [...seed.actionVerbs],
        coreConflictLoop: seed.coreConflictLoop,
        settingAxioms: [...seed.settingAxioms],
        constraintSet: [...seed.constraintSet],
        keyInstitutions: [...seed.keyInstitutions],
        settingScale: seed.settingScale,
      };

      const engineResult = await runGenerationStage(onGenerationStage, 'ENGINEERING_CONCEPTS', () =>
        generateSingleConceptEngine(
          {
            seed: seedFields,
            characterWorld,
            kernel,
            protagonistDetails: seed.protagonistDetails,
            genreVibes: seed.genreVibes,
            moodKeywords: seed.moodKeywords,
            contentPreferences: seed.contentPreferences,
          },
          apiKey,
        ),
      );
      const concepts = mergeConceptStages([seedFields], [characterWorld], [engineResult.engine]);
      const concept = concepts[0] as ConceptSpec;

      const { evaluatedConcept } = await runGenerationStage(onGenerationStage, 'EVALUATING_CONCEPTS', () =>
        evaluateSingleConcept(
          concept,
          {
            genreVibes: seed.genreVibes,
            moodKeywords: seed.moodKeywords,
            contentPreferences: seed.contentPreferences,
            apiKey,
          },
          apiKey,
        ),
      );
      const verification = await runGenerationStage(onGenerationStage, 'ANALYZING_SPECIFICITY', () =>
        verifySingleConcept(evaluatedConcept, kernel, apiKey),
      );

      return { concept, evaluatedConcept, verification };
    },

    async stressTestConcept(input: StressTestInput): Promise<ConceptStressTestResult> {
      const normalized = requireStressTestInput(input);
      const onGenerationStage = input.onGenerationStage;

      return runGenerationStage(onGenerationStage, 'STRESS_TESTING_CONCEPT', () =>
        deps.stressTestConcept(
          {
            concept: normalized.concept,
            scores: normalized.scores,
            weaknesses: normalized.weaknesses,
            verification: normalized.verification,
          },
          normalized.apiKey,
        ),
      );
    },
  };
}

export const conceptService = createConceptService();
