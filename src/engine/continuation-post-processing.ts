import { generateAnalystEvaluation } from '../llm';
import type { AnalystResult, PacingRecommendedAction } from '../llm/analyst-types';
import type { ContinuationGenerationResult } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type {
  AccumulatedStructureState,
  ActiveState,
  BeatDeviation,
  PageId,
  TrackedPromise,
  Story,
  StoryBeat,
  StoryStructure,
  VersionedStoryStructure,
} from '../models';
import type { StorySpine } from '../models/story-spine';
import type { AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import { getCurrentBeat, isDeviation } from '../models';
import { handleDeviation, isActualDeviation } from './deviation-handler';
import { emitGenerationStage } from './generation-pipeline-helpers';
import { rewriteSpine } from './spine-rewriter';
import { applyStructureProgression } from './structure-state';
import type { DeviationInfo, GenerationStageCallback } from './types';

// --- Analyst Evaluation ---

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
  readonly toneKeywords?: readonly string[];
  readonly toneAntiKeywords?: readonly string[];
  readonly spine?: StorySpine;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly onGenerationStage?: GenerationStageCallback;
}

export async function runAnalystEvaluation(
  context: AnalystEvaluationContext
): Promise<AnalystResult | null> {
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
        toneKeywords: context.toneKeywords,
        toneAntiKeywords: context.toneAntiKeywords,
        spine: context.spine,
      },
      { apiKey: context.apiKey }
    );
    const analystDurationMs = Date.now() - analystStart;
    emitGenerationStage(context.onGenerationStage, 'ANALYZING_SCENE', 'completed', analystAttempt);
    logger.info('Generation stage completed', {
      ...context.logContext,
      attempt: analystAttempt,
      stage: 'analyst',
      durationMs: analystDurationMs,
    });
    return analystResult;
  } catch (error) {
    const analystDurationMs = Date.now() - analystStart;
    logger.warn('Generation stage failed', {
      ...context.logContext,
      attempt: analystAttempt,
      stage: 'analyst',
      durationMs: analystDurationMs,
      error,
    });
    logger.warn('Analyst evaluation failed, continuing with defaults', { error });
    return null;
  }
}

// --- Deviation Handling ---

export interface DeviationProcessingContext {
  readonly result: ContinuationGenerationResult;
  readonly story: Story;
  readonly currentStructureVersion: VersionedStoryStructure | null;
  readonly parentStructureState: AccumulatedStructureState;
  readonly newPageId: PageId;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface DeviationProcessingResult {
  readonly storyForPage: Story;
  readonly activeStructureVersion: VersionedStoryStructure | null;
  readonly deviationInfo?: DeviationInfo;
}

export async function handleDeviationIfDetected(
  context: DeviationProcessingContext
): Promise<DeviationProcessingResult> {
  if (
    !isActualDeviation(context.result, context.story, context.currentStructureVersion) ||
    !isDeviation(context.result.deviation)
  ) {
    return {
      storyForPage: context.story,
      activeStructureVersion: context.currentStructureVersion,
    };
  }

  const deviation: BeatDeviation = context.result.deviation;
  const rewriteAttempt = 1;
  logger.info('Generation stage started', {
    ...context.logContext,
    attempt: rewriteAttempt,
    stage: 'structure-rewrite',
  });
  emitGenerationStage(context.onGenerationStage, 'RESTRUCTURING_STORY', 'started', rewriteAttempt);
  const rewriteStart = Date.now();
  let devResult: Awaited<ReturnType<typeof handleDeviation>>;
  try {
    devResult = await handleDeviation(
      {
        story: context.story,
        currentVersion: context.currentStructureVersion!,
        parentStructureState: context.parentStructureState,
        deviation,
        newPageId: context.newPageId,
      },
      context.apiKey
    );
  } catch (error) {
    const rewriteDurationMs = Date.now() - rewriteStart;
    logger.error('Generation stage failed', {
      ...context.logContext,
      attempt: rewriteAttempt,
      stage: 'structure-rewrite',
      durationMs: rewriteDurationMs,
      error,
    });
    throw error;
  }
  const rewriteDurationMs = Date.now() - rewriteStart;
  emitGenerationStage(
    context.onGenerationStage,
    'RESTRUCTURING_STORY',
    'completed',
    rewriteAttempt
  );
  logger.info('Generation stage completed', {
    ...context.logContext,
    attempt: rewriteAttempt,
    stage: 'structure-rewrite',
    durationMs: rewriteDurationMs,
  });

  return {
    storyForPage: devResult.updatedStory,
    activeStructureVersion: devResult.activeVersion,
    deviationInfo: devResult.deviationInfo,
  };
}

// --- Spine Deviation Handling ---

export interface SpineDeviationContext {
  readonly analystResult: AnalystResult | null;
  readonly story: Story;
  readonly apiKey: string;
  readonly logContext: Record<string, unknown>;
}

export interface SpineDeviationResult {
  readonly updatedStory: Story;
  readonly spineRewritten: boolean;
  readonly spineInvalidatedElement: string | undefined;
}

/**
 * Checks if the analyst detected a spine deviation. If so, rewrites the spine
 * and returns an updated story. The caller is responsible for forcing a
 * structure rewrite when the spine changes.
 */
export async function handleSpineDeviationIfDetected(
  context: SpineDeviationContext
): Promise<SpineDeviationResult> {
  const { analystResult, story } = context;

  if (
    !analystResult?.spineDeviationDetected ||
    !analystResult.spineInvalidatedElement ||
    !story.spine
  ) {
    return { updatedStory: story, spineRewritten: false, spineInvalidatedElement: undefined };
  }

  logger.warn('Spine deviation detected — rewriting spine', {
    ...context.logContext,
    invalidatedElement: analystResult.spineInvalidatedElement,
    reason: analystResult.spineDeviationReason,
  });

  try {
    const spineResult = await rewriteSpine(
      {
        characterConcept: story.characterConcept,
        worldbuilding: story.worldbuilding,
        tone: story.tone,
        currentSpine: story.spine,
        invalidatedElement: analystResult.spineInvalidatedElement,
        deviationReason: analystResult.spineDeviationReason,
        narrativeSummary: analystResult.narrativeSummary,
      },
      context.apiKey
    );

    const updatedStory: Story = { ...story, spine: spineResult.spine };

    logger.info('Spine rewritten successfully', {
      ...context.logContext,
      newSpineType: spineResult.spine.storySpineType,
      newConflictType: spineResult.spine.conflictType,
    });

    return {
      updatedStory,
      spineRewritten: true,
      spineInvalidatedElement: analystResult.spineInvalidatedElement,
    };
  } catch (error) {
    logger.error('Spine rewrite failed, continuing with original spine', {
      ...context.logContext,
      error,
    });
    return { updatedStory: story, spineRewritten: false, spineInvalidatedElement: undefined };
  }
}

/**
 * Collects all non-concluded beat IDs from the structure. Used to force
 * a full structure rewrite when the spine changes but the analyst didn't
 * detect a beat-level deviation.
 */
export function collectRemainingBeatIds(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): string[] {
  const concludedIds = new Set(
    structureState.beatProgressions
      .filter((p) => p.status === 'concluded')
      .map((p) => p.beatId)
  );

  const remainingIds: string[] = [];
  for (let actIdx = 0; actIdx < structure.acts.length; actIdx++) {
    const act = structure.acts[actIdx]!;
    for (let beatIdx = 0; beatIdx < act.beats.length; beatIdx++) {
      const beatId = `${actIdx + 1}.${beatIdx + 1}`;
      if (!concludedIds.has(beatId)) {
        remainingIds.push(beatId);
      }
    }
  }
  return remainingIds;
}

// --- Beat Conclusion ---

export interface BeatConclusionContext {
  readonly result: ContinuationGenerationResult;
  readonly activeBeat: StoryBeat | undefined;
  readonly analystResult: AnalystResult | null;
  readonly storyId: string;
  readonly parentPageId: PageId;
}

export interface BeatConclusionResult {
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
}

export function resolveBeatConclusion(context: BeatConclusionContext): BeatConclusionResult {
  let beatConcluded =
    'beatConcluded' in context.result && typeof context.result.beatConcluded === 'boolean'
      ? context.result.beatConcluded
      : false;
  const beatResolution =
    'beatResolution' in context.result && typeof context.result.beatResolution === 'string'
      ? context.result.beatResolution
      : '';

  if (
    context.activeBeat?.role === 'turning_point' &&
    context.analystResult?.beatConcluded === true &&
    context.analystResult.completionGateSatisfied === false &&
    beatConcluded
  ) {
    beatConcluded = false;
    logger.warn('Turning point completion gate mismatch; forcing beatConcluded=false', {
      storyId: context.storyId,
      parentPageId: context.parentPageId,
      beatId: context.activeBeat.id,
      beatRole: context.activeBeat.role,
      completionGateFailureReason:
        context.analystResult.completionGateFailureReason || 'Completion gate not satisfied',
    });
  }

  return { beatConcluded, beatResolution };
}

// --- Pacing Response ---

export interface PacingContext {
  readonly deviationInfo: DeviationInfo | undefined;
  readonly structureState: AccumulatedStructureState;
  readonly recommendedAction: PacingRecommendedAction;
  readonly pacingIssueReason: string;
}

export function applyPacingResponse(context: PacingContext): AccumulatedStructureState {
  if (context.deviationInfo) {
    return context.structureState;
  }

  if (context.recommendedAction === 'rewrite') {
    logger.warn('Pacing issue detected: rewrite recommended (deferred)', {
      pacingIssueReason: context.pacingIssueReason,
      pagesInCurrentBeat: context.structureState.pagesInCurrentBeat,
    });
    return { ...context.structureState, pacingNudge: null };
  }

  if (context.recommendedAction === 'nudge') {
    logger.info('Pacing nudge applied', {
      pacingIssueReason: context.pacingIssueReason,
      pagesInCurrentBeat: context.structureState.pagesInCurrentBeat,
    });
    return { ...context.structureState, pacingNudge: context.pacingIssueReason };
  }

  return { ...context.structureState, pacingNudge: null };
}

// --- Structure Progression ---

export interface StructureProgressionContext {
  readonly activeStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly parentStructureState: AccumulatedStructureState;
  readonly beatConcluded: boolean;
  readonly beatResolution: string;
}

export function resolveStructureProgression(
  context: StructureProgressionContext
): AccumulatedStructureState {
  const activeStructure = context.activeStructureVersion?.structure ?? context.storyStructure;
  if (!activeStructure) {
    return context.parentStructureState;
  }
  return applyStructureProgression(
    activeStructure,
    context.parentStructureState,
    context.beatConcluded,
    context.beatResolution
  );
}

export function resolveActiveBeat(
  activeStructureVersion: VersionedStoryStructure | null,
  storyStructure: StoryStructure | null,
  parentStructureState: AccumulatedStructureState
): StoryBeat | undefined {
  const activeStructure = activeStructureVersion?.structure ?? storyStructure;
  if (!activeStructure || !parentStructureState) {
    return undefined;
  }
  return getCurrentBeat(activeStructure, parentStructureState);
}
