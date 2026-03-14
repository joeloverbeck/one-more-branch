import type { AccumulatedStructureState, MilestoneDeviation, StoryStructure } from '../models/story-arc';
import type {
  CompletedBeat,
  PlannedBeat,
  StructureRewriteContext,
} from '../llm/structure-rewrite-types';
import type { Story } from '../models/story';
import type { VersionedStoryStructure } from '../models/structure-version';
import { parseMilestoneIndices } from './milestone-utils';

/**
 * Extracts completed milestones with resolutions from structure state.
 */
export function extractCompletedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState
): readonly CompletedBeat[] {
  const completedBeats: CompletedBeat[] = [];

  const concludedProgressions = structureState.milestoneProgressions.filter(
    (milestoneProgression) => milestoneProgression.status === 'concluded'
  );

  for (const progression of concludedProgressions) {
    const indices = parseMilestoneIndices(progression.milestoneId);
    if (!indices) {
      console.warn(`Invalid milestone ID format in concluded progression: ${progression.milestoneId}`);
      continue;
    }

    const act = structure.acts[indices.actIndex];
    const milestone = act?.milestones[indices.milestoneIndex];

    if (!act || !milestone) {
      console.warn(`Milestone ${progression.milestoneId} not found in structure`);
      continue;
    }

    completedBeats.push({
      actIndex: indices.actIndex,
      milestoneIndex: indices.milestoneIndex,
      milestoneId: progression.milestoneId,
      name: milestone.name,
      description: milestone.description,
      objective: milestone.objective,
      causalLink: milestone.causalLink,
      exitCondition: milestone.exitCondition,
      role: milestone.role,
      escalationType: milestone.escalationType,
      secondaryEscalationType: milestone.secondaryEscalationType,
      crisisType: milestone.crisisType,
      expectedGapMagnitude: milestone.expectedGapMagnitude,
      isMidpoint: milestone.isMidpoint,
      midpointType: milestone.midpointType,
      uniqueScenarioHook: milestone.uniqueScenarioHook,
      approachVectors: milestone.approachVectors ? [...milestone.approachVectors] : null,
      setpieceSourceIndex: milestone.setpieceSourceIndex,
      obligatorySceneTag: milestone.obligatorySceneTag,
      resolution: progression.resolution ?? '',
    });
  }

  completedBeats.sort((a, b) => {
    if (a.actIndex !== b.actIndex) {
      return a.actIndex - b.actIndex;
    }

    return a.milestoneIndex - b.milestoneIndex;
  });

  return completedBeats;
}

/**
 * Extracts planned (not yet concluded) milestones that come after the current deviation point.
 * These are milestones from the original structure that the LLM has not yet reached,
 * provided as soft context during structure rewrites.
 */
export function extractPlannedBeats(
  structure: StoryStructure,
  structureState: AccumulatedStructureState,
  includeCurrentBeat = false
): readonly PlannedBeat[] {
  const concludedMilestoneIds = new Set(
    structureState.milestoneProgressions.filter((p) => p.status === 'concluded').map((p) => p.milestoneId)
  );

  const currentMilestoneId = `${structureState.currentActIndex + 1}.${structureState.currentMilestoneIndex + 1}`;

  const plannedBeats: PlannedBeat[] = [];

  for (let actIdx = 0; actIdx < structure.acts.length; actIdx++) {
    const act = structure.acts[actIdx]!;
    for (let milestoneIdx = 0; milestoneIdx < act.milestones.length; milestoneIdx++) {
      const milestoneId = `${actIdx + 1}.${milestoneIdx + 1}`;

      // Skip concluded milestones
      if (concludedMilestoneIds.has(milestoneId)) {
        continue;
      }

      // Skip the currently active milestone (where deviation occurred) unless includeCurrentBeat
      if (!includeCurrentBeat && milestoneId === currentMilestoneId) {
        continue;
      }

      // Only include milestones that come after the current position
      // (or at the current position when includeCurrentBeat is true)
      if (actIdx < structureState.currentActIndex) {
        continue;
      }
      if (includeCurrentBeat) {
        if (actIdx === structureState.currentActIndex && milestoneIdx < structureState.currentMilestoneIndex) {
          continue;
        }
      } else {
        if (
          actIdx === structureState.currentActIndex &&
          milestoneIdx <= structureState.currentMilestoneIndex
        ) {
          continue;
        }
      }

      const milestone = act.milestones[milestoneIdx]!;
      plannedBeats.push({
        actIndex: actIdx,
        milestoneIndex: milestoneIdx,
        milestoneId,
        name: milestone.name,
        description: milestone.description,
        objective: milestone.objective,
        causalLink: milestone.causalLink,
        exitCondition: milestone.exitCondition,
        role: milestone.role,
        escalationType: milestone.escalationType,
        secondaryEscalationType: milestone.secondaryEscalationType,
        crisisType: milestone.crisisType,
        expectedGapMagnitude: milestone.expectedGapMagnitude,
        isMidpoint: milestone.isMidpoint,
        midpointType: milestone.midpointType,
        uniqueScenarioHook: milestone.uniqueScenarioHook,
        approachVectors: milestone.approachVectors ? [...milestone.approachVectors] : null,
        setpieceSourceIndex: milestone.setpieceSourceIndex,
        obligatorySceneTag: milestone.obligatorySceneTag,
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
  deviation: MilestoneDeviation
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
    sceneSummary: deviation.sceneSummary,
    currentActIndex: structureState.currentActIndex,
    currentMilestoneIndex: structureState.currentMilestoneIndex,
    deviationReason: deviation.reason,
    originalTheme: structure.overallTheme,
    originalOpeningImage: structure.openingImage,
    originalClosingImage: structure.closingImage,
    totalActCount: structure.acts.length,
  };
}

/**
 * Gets milestone IDs that should be preserved (concluded milestones).
 */
export function getPreservedMilestoneIds(structureState: AccumulatedStructureState): readonly string[] {
  return structureState.milestoneProgressions
    .filter((milestoneProgression) => milestoneProgression.status === 'concluded')
    .map((milestoneProgression) => milestoneProgression.milestoneId);
}

/**
 * Validates that a new structure preserves all completed milestones.
 * Returns true if all completed milestones exist unchanged in new structure.
 */
export function validatePreservedBeats(
  originalStructure: StoryStructure,
  newStructure: StoryStructure,
  structureState: AccumulatedStructureState
): boolean {
  const concludedProgressions = structureState.milestoneProgressions.filter(
    (milestoneProgression) => milestoneProgression.status === 'concluded'
  );

  for (const progression of concludedProgressions) {
    const indices = parseMilestoneIndices(progression.milestoneId);
    if (!indices) {
      return false;
    }

    const originalBeat = originalStructure.acts[indices.actIndex]?.milestones[indices.milestoneIndex];
    const newBeat = newStructure.acts[indices.actIndex]?.milestones[indices.milestoneIndex];

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

/**
 * Builds context for a pacing-triggered structure rewrite.
 * Unlike `buildRewriteContext`, this includes the current milestone in planned milestones
 * (since it hasn't deviated, just stalled) and uses the analyst's narrative summary.
 */
export function buildPacingRewriteContext(
  story: Story,
  structureVersion: VersionedStoryStructure,
  structureState: AccumulatedStructureState,
  pacingIssueReason: string,
  sceneSummary: string
): StructureRewriteContext {
  const structure = structureVersion.structure;
  const completedBeats = extractCompletedBeats(structure, structureState);
  const plannedBeats = extractPlannedBeats(structure, structureState, true);

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
    sceneSummary,
    currentActIndex: structureState.currentActIndex,
    currentMilestoneIndex: structureState.currentMilestoneIndex,
    deviationReason: `Pacing issue: ${pacingIssueReason}`,
    originalTheme: structure.overallTheme,
    originalOpeningImage: structure.openingImage,
    originalClosingImage: structure.closingImage,
    totalActCount: structure.acts.length,
  };
}
