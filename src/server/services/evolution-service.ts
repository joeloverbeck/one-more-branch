import { evolveConceptIdeas as runEvolveConceptIdeas } from '../../llm/concept-evolver.js';
import { evaluateConcepts as runEvaluateConcepts } from '../../llm/concept-evaluator.js';
import { verifyConcepts as runVerifyConcepts } from '../../llm/concept-verifier.js';
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
}

export interface EvolveConceptsResult {
  readonly evolvedConcepts: readonly ConceptSpec[];
  readonly scoredConcepts: readonly ScoredConcept[];
  readonly evaluatedConcepts: readonly EvaluatedConcept[];
  readonly verifications: readonly ConceptVerification[];
}

interface EvolutionServiceDeps {
  readonly evolveConceptIdeas: typeof runEvolveConceptIdeas;
  readonly evaluateConcepts: typeof runEvaluateConcepts;
  readonly verifyConcepts: typeof runVerifyConcepts;
}

export interface EvolutionService {
  evolveConcepts(input: EvolveConceptsInput): Promise<EvolveConceptsResult>;
}

const defaultDeps: EvolutionServiceDeps = {
  evolveConceptIdeas: runEvolveConceptIdeas,
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

      onGenerationStage?.({
        stage: 'EVOLVING_CONCEPTS',
        status: 'started',
        attempt: 1,
      });
      const evolution = await deps.evolveConceptIdeas({ parentConcepts, kernel }, apiKey);
      onGenerationStage?.({
        stage: 'EVOLVING_CONCEPTS',
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
          concepts: evolution.concepts,
          userSeeds: { apiKey },
        },
        apiKey,
      );
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
        evolvedConcepts: evolution.concepts,
        scoredConcepts: evaluation.scoredConcepts,
        evaluatedConcepts: evaluation.evaluatedConcepts,
        verifications: verification.verifications,
      };
    },
  };
}

export const evolutionService = createEvolutionService();
