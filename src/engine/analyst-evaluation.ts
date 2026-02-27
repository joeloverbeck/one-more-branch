import { generateAnalystEvaluation } from '../llm';
import type { AnalystResult } from '../llm/analyst-types';
import type { StageDegradation } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type {
  AccumulatedStructureState,
  ActiveState,
  StoryStructure,
  TrackedPromise,
} from '../models';
import type { StorySpine } from '../models/story-spine';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { emitGenerationStage } from './generation-pipeline-helpers';
import type { GenerationStageCallback } from './types';

export interface AnalystEvaluationContext {
  readonly writerNarrative: string;
  readonly activeStructure: StoryStructure;
  readonly parentStructureState: AccumulatedStructureState;
  readonly parentActiveState: ActiveState;
  readonly threadsResolved: readonly string[];
  readonly threadAges: Readonly<Record<string, number>>;
  readonly activeTrackedPromises: readonly TrackedPromise[];
  readonly accumulatedNpcAgendas?: AccumulatedNpcAgendas;
  readonly accumulatedNpcRelationships?: AccumulatedNpcRelationships;
  readonly tone: string;
  readonly toneFeel?: readonly string[];
  readonly toneAvoid?: readonly string[];
  readonly spine?: StorySpine;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface AnalystEvaluationResult {
  readonly result: AnalystResult | null;
  readonly durationMs: number;
  readonly degradation?: StageDegradation;
}

export async function runAnalystEvaluation(
  context: AnalystEvaluationContext
): Promise<AnalystEvaluationResult> {
  const analystStructureState: AccumulatedStructureState = {
    ...context.parentStructureState,
    pagesInCurrentBeat: context.parentStructureState.pagesInCurrentBeat + 1,
  };
  const analystAttempt = 1;
  logger.info('Generation stage started', {
    ...context.logContext,
    attempt: analystAttempt,
    stage: 'analyst',
  });
  const analystStart = Date.now();
  try {
    emitGenerationStage(context.onGenerationStage, 'ANALYZING_SCENE', 'started', analystAttempt);
    const analystResult = await generateAnalystEvaluation(
      {
        narrative: context.writerNarrative,
        structure: context.activeStructure,
        accumulatedStructureState: analystStructureState,
        activeState: context.parentActiveState,
        threadsResolved: context.threadsResolved,
        threadAges: context.threadAges,
        activeTrackedPromises: context.activeTrackedPromises,
        accumulatedNpcAgendas: context.accumulatedNpcAgendas,
        accumulatedNpcRelationships: context.accumulatedNpcRelationships,
        tone: context.tone,
        toneFeel: context.toneFeel,
        toneAvoid: context.toneAvoid,
        spine: context.spine,
      },
      { apiKey: context.apiKey }
    );
    const durationMs = Date.now() - analystStart;
    emitGenerationStage(
      context.onGenerationStage,
      'ANALYZING_SCENE',
      'completed',
      analystAttempt,
      durationMs
    );
    logger.info('Generation stage completed', {
      ...context.logContext,
      attempt: analystAttempt,
      stage: 'analyst',
      durationMs,
    });
    return { result: analystResult, durationMs };
  } catch (error) {
    const durationMs = Date.now() - analystStart;
    logger.warn('Generation stage failed', {
      ...context.logContext,
      attempt: analystAttempt,
      stage: 'analyst',
      durationMs,
      error,
    });
    logger.warn('Analyst evaluation failed, continuing with defaults', { error });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      result: null,
      durationMs,
      degradation: {
        stage: 'analyst',
        errorCode: 'LLM_FAILURE',
        message: errorMessage,
        durationMs,
      },
    };
  }
}
