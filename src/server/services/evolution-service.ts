import { generateConceptCharacterWorlds } from '../../llm/concept-architect.js';
import { generateConceptEngines } from '../../llm/concept-engineer.js';
import { generateEvolvedConceptSeeds } from '../../llm/concept-evolver-seeder.js';
import { evaluateConcepts as runEvaluateConcepts } from '../../llm/concept-evaluator.js';
import { mergeConceptStages } from '../../llm/concept-ideator.js';
import { verifyConcepts as runVerifyConcepts } from '../../llm/concept-verifier.js';
import { runGenerationStage } from '../../engine/generation-pipeline-helpers.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import type {
  ConceptSpec,
  ConceptVerification,
  EvaluatedConcept,
  ScoredConcept,
} from '../../models/index.js';
import { isStoryKernel, type StoryKernel } from '../../models/story-kernel.js';

export interface EvolveConceptsInput {
  readonly parentConcepts: readonly EvaluatedConcept[];
  readonly kernel: StoryKernel;
  readonly apiKey: string;
  readonly onGenerationStage?: GenerationStageCallback;
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
}

export interface EvolveConceptsResult {
  readonly evolvedConcepts: readonly ConceptSpec[];
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly verifications: readonly ConceptVerification[];
}

interface EvolutionServiceDeps {
  readonly generateEvolvedConceptSeeds: typeof generateEvolvedConceptSeeds;
  readonly generateConceptCharacterWorlds: typeof generateConceptCharacterWorlds;
  readonly generateConceptEngines: typeof generateConceptEngines;
  readonly evaluateConcepts: typeof runEvaluateConcepts;
  readonly verifyConcepts: typeof runVerifyConcepts;
}

export interface EvolutionService {
  evolveConcepts(input: EvolveConceptsInput): Promise<EvolveConceptsResult>;
}

const defaultDeps: EvolutionServiceDeps = {
  generateEvolvedConceptSeeds,
  generateConceptCharacterWorlds,
  generateConceptEngines,
  evaluateConcepts: runEvaluateConcepts,
  verifyConcepts: runVerifyConcepts,
};

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }

  return trimmed;
}

function requireParentConcepts(parentConcepts: unknown): readonly EvaluatedConcept[] {
  if (!Array.isArray(parentConcepts)) {
    throw new Error('Select 2-3 parent concepts');
  }

  if (parentConcepts.length < 2 || parentConcepts.length > 3) {
    throw new Error('Select 2-3 parent concepts');
  }

  return parentConcepts as readonly EvaluatedConcept[];
}

function requireKernel(kernel: StoryKernel): StoryKernel {
  if (!isStoryKernel(kernel)) {
    throw new Error('Story kernel is required');
  }

  return kernel;
}

export function createEvolutionService(deps: EvolutionServiceDeps = defaultDeps): EvolutionService {
  return {
    async evolveConcepts(input: EvolveConceptsInput): Promise<EvolveConceptsResult> {
      const apiKey = requireApiKey(input.apiKey);
      const parentConcepts = requireParentConcepts(input.parentConcepts);
      const kernel = requireKernel(input.kernel);
      const onGenerationStage = input.onGenerationStage;

      const seedResult = await runGenerationStage(onGenerationStage, 'SEEDING_EVOLVED_CONCEPTS', () =>
        deps.generateEvolvedConceptSeeds(
          {
            parentConcepts,
            kernel,
            protagonistDetails: input.protagonistDetails,
            genreVibes: input.genreVibes,
            moodKeywords: input.moodKeywords,
            contentPreferences: input.contentPreferences,
          },
          apiKey,
        ),
      );
      const architectResult = await runGenerationStage(onGenerationStage, 'ARCHITECTING_CONCEPTS', () =>
        deps.generateConceptCharacterWorlds(
          {
            seeds: seedResult.seeds,
            kernel,
            protagonistDetails: input.protagonistDetails,
            genreVibes: input.genreVibes,
            moodKeywords: input.moodKeywords,
            contentPreferences: input.contentPreferences,
          },
          apiKey,
        ),
      );
      const engineResult = await runGenerationStage(onGenerationStage, 'ENGINEERING_CONCEPTS', () =>
        deps.generateConceptEngines(
          {
            seeds: seedResult.seeds,
            characterWorlds: architectResult.characterWorlds,
            kernel,
            protagonistDetails: input.protagonistDetails,
            genreVibes: input.genreVibes,
            moodKeywords: input.moodKeywords,
            contentPreferences: input.contentPreferences,
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
        deps.evaluateConcepts(
          {
            concepts,
            userSeeds: {
              genreVibes: input.genreVibes,
              moodKeywords: input.moodKeywords,
              contentPreferences: input.contentPreferences,
              apiKey,
            },
          },
          apiKey,
        ),
      );
      const verification = await runGenerationStage(onGenerationStage, 'ANALYZING_SPECIFICITY', () =>
        deps.verifyConcepts({ evaluatedConcepts: evaluation.evaluatedConcepts, kernel }, apiKey),
      );

      return {
        evolvedConcepts: concepts,
        scoredConcepts: evaluation.scoredConcepts,
        evaluatedConcepts: evaluation.evaluatedConcepts,
        verifications: verification.verifications,
      };
    },
  };
}

export const evolutionService = createEvolutionService();
