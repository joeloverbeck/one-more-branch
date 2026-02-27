import type { AnalystResult } from '../llm/analyst-types';
import type { StageDegradation } from '../llm/generation-pipeline-types';
import { logger } from '../logging/index.js';
import type {
  AccumulatedStructureState,
  Story,
  StoryStructure,
} from '../models';
import { rewriteSpine } from './spine-rewriter';

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
  readonly durationMs: number | null;
  readonly degradation?: StageDegradation;
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
    return {
      updatedStory: story,
      spineRewritten: false,
      spineInvalidatedElement: undefined,
      durationMs: null,
    };
  }

  logger.warn('Spine deviation detected — rewriting spine', {
    ...context.logContext,
    invalidatedElement: analystResult.spineInvalidatedElement,
    reason: analystResult.spineDeviationReason,
  });

  const spineStart = Date.now();
  try {
    const spineResult = await rewriteSpine(
      {
        tone: story.tone,
        genreFrame: story.conceptSpec?.genreFrame,
        currentSpine: story.spine,
        invalidatedElement: analystResult.spineInvalidatedElement,
        deviationReason: analystResult.spineDeviationReason,
        narrativeSummary: analystResult.narrativeSummary,
        decomposedCharacters: story.decomposedCharacters!,
        decomposedWorld: story.decomposedWorld!,
      },
      context.apiKey
    );
    const durationMs = Date.now() - spineStart;

    const updatedStory: Story = { ...story, spine: spineResult.spine };

    logger.info('Spine rewritten successfully', {
      ...context.logContext,
      durationMs,
      newSpineType: spineResult.spine.storySpineType,
      newConflictType: spineResult.spine.conflictType,
    });

    return {
      updatedStory,
      spineRewritten: true,
      spineInvalidatedElement: analystResult.spineInvalidatedElement,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - spineStart;
    logger.error('Spine rewrite failed, continuing with original spine', {
      ...context.logContext,
      durationMs,
      error,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      updatedStory: story,
      spineRewritten: false,
      spineInvalidatedElement: undefined,
      durationMs,
      degradation: {
        stage: 'spineRewrite',
        errorCode: 'LLM_FAILURE',
        message: errorMessage,
        durationMs,
      },
    };
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
