import type { AccumulatedStructureState, BeatDeviation, StoryStructure } from '../models/story-arc';
import type {
  CompletedBeat,
  PlannedBeat,
  StructureRewriteContext,
} from '../llm/structure-rewrite-types';
import type { Story } from '../models/story';
import type { VersionedStoryStructure } from '../models/structure-version';
import { parseBeatIndices } from './beat-utils';

/**
 * Extracts completed beats with resolutions from structure state.
 */
export function extractCompletedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): readonly CompletedBeat[] {
  const completedBeats: CompletedBeat[] = [];

  const concludedProgressions = structureState.beatProgressions.filter(
    (beatProgression) => beatProgression.status === 'concluded'
  );

  for (const progression of concludedProgressions) {
    const indices = parseBeatIndices(progression.beatId);
    if (!indices) {
      console.warn(`Invalid beat ID format in concluded progression: ${progression.beatId}`);
      continue;
    }

    const act = structure.acts[indices.actIndex];
    const beat = act?.beats[indices.beatIndex];

    if (!act || !beat) {
      console.warn(`Beat ${progression.beatId} not found in structure`);
      continue;
    }

    completedBeats.push({
      actIndex: indices.actIndex,
      beatIndex: indices.beatIndex,
      beatId: progression.beatId,
      name: beat.name,
      description: beat.description,
      objective: beat.objective,
      role: beat.role,
      escalationType: beat.escalationType,
      uniqueScenarioHook: beat.uniqueScenarioHook,
      resolution: progression.resolution ?? '',
    });
  }

  completedBeats.sort((a, b) => {
    if (a.actIndex !== b.actIndex) {
      return a.actIndex - b.actIndex;
    }

    return a.beatIndex - b.beatIndex;
  });

  return completedBeats;
}

/**
 * Extracts planned (not yet concluded) beats that come after the current deviation point.
 * These are beats from the original structure that the LLM has not yet reached,
 * provided as soft context during structure rewrites.
 */
export function extractPlannedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): readonly PlannedBeat[] {
  const concludedBeatIds = new Set(
    structureState.beatProgressions
      .filter((p) => p.status === 'concluded')
      .map((p) => p.beatId)
  );

  const currentBeatId = `${structureState.currentActIndex + 1}.${structureState.currentBeatIndex + 1}`;

  const plannedBeats: PlannedBeat[] = [];

  for (let actIdx = 0; actIdx < structure.acts.length; actIdx++) {
    const act = structure.acts[actIdx]!;
    for (let beatIdx = 0; beatIdx < act.beats.length; beatIdx++) {
      const beatId = `${actIdx + 1}.${beatIdx + 1}`;

      // Skip concluded beats
      if (concludedBeatIds.has(beatId)) {
        continue;
      }

      // Skip the currently active beat (where deviation occurred)
      if (beatId === currentBeatId) {
        continue;
      }

      // Only include beats that come after the current position
      if (actIdx < structureState.currentActIndex) {
        continue;
      }
      if (actIdx === structureState.currentActIndex && beatIdx <= structureState.currentBeatIndex) {
        continue;
      }

      const beat = act.beats[beatIdx]!;
      plannedBeats.push({
        actIndex: actIdx,
        beatIndex: beatIdx,
        beatId,
        name: beat.name,
        description: beat.description,
        objective: beat.objective,
        role: beat.role,
        escalationType: beat.escalationType,
        uniqueScenarioHook: beat.uniqueScenarioHook,
      });
    }
  }

  return plannedBeats;
}

/**
 * Builds context needed for structure regeneration.
 */
export function buildRewriteContext(
  story: Story,
  structureVersion: VersionedStoryStructure,
  structureState: AccumulatedStructureState,
  deviation: BeatDeviation
): StructureRewriteContext {
  const structure = structureVersion.structure;
  const completedBeats = extractCompletedBeats(structure, structureState);
  const plannedBeats = extractPlannedBeats(structure, structureState);

  return {
    tone: story.tone,
    toneFeel: story.toneFeel,
    toneAvoid: story.toneAvoid,
    spine: story.spine,
    conceptSpec: story.conceptSpec,
    decomposedCharacters: story.decomposedCharacters!,
    decomposedWorld: story.decomposedWorld!,
    completedBeats,
    plannedBeats,
    narrativeSummary: deviation.narrativeSummary,
    currentActIndex: structureState.currentActIndex,
    currentBeatIndex: structureState.currentBeatIndex,
    deviationReason: deviation.reason,
    originalTheme: structure.overallTheme,
    totalActCount: structure.acts.length,
  };
}

/**
 * Gets beat IDs that should be preserved (concluded beats).
 */
export function getPreservedBeatIds(structureState: AccumulatedStructureState): readonly string[] {
  return structureState.beatProgressions
    .filter((beatProgression) => beatProgression.status === 'concluded')
    .map((beatProgression) => beatProgression.beatId);
}

/**
 * Validates that a new structure preserves all completed beats.
 * Returns true if all completed beats exist unchanged in new structure.
 */
export function validatePreservedBeats(
  originalStructure: StoryStructure,
  newStructure: StoryStructure,
  structureState: AccumulatedStructureState
): boolean {
  const concludedProgressions = structureState.beatProgressions.filter(
    (beatProgression) => beatProgression.status === 'concluded'
  );

  for (const progression of concludedProgressions) {
    const indices = parseBeatIndices(progression.beatId);
    if (!indices) {
      return false;
    }

    const originalBeat = originalStructure.acts[indices.actIndex]?.beats[indices.beatIndex];
    const newBeat = newStructure.acts[indices.actIndex]?.beats[indices.beatIndex];

    if (!originalBeat || !newBeat) {
      return false;
    }

    if (
      newBeat.name !== originalBeat.name ||
      newBeat.description !== originalBeat.description ||
      newBeat.objective !== originalBeat.objective ||
      newBeat.role !== originalBeat.role
    ) {
      return false;
    }
  }

  return true;
}
