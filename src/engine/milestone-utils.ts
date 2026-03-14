import type {
  AccumulatedStructureState,
  MilestoneProgression,
  StoryMilestone,
  StoryStructure,
} from '../models/story-arc';
import { getCurrentMilestone } from '../models';

/**
 * Parses milestone ID (e.g., "1.2") into act and milestone indices.
 * Returns null for invalid formats.
 */
export function parseMilestoneIndices(milestoneId: string): { actIndex: number; milestoneIndex: number } | null {
  const milestoneIdMatch = /^(\d+)\.(\d+)$/.exec(milestoneId);
  if (!milestoneIdMatch) {
    return null;
  }

  const actIndex = Number(milestoneIdMatch[1]) - 1;
  const milestoneIndex = Number(milestoneIdMatch[2]) - 1;

  if (actIndex < 0 || milestoneIndex < 0) {
    return null;
  }

  return { actIndex, milestoneIndex };
}

/**
 * Gets a milestone from structure, throwing if indices are invalid.
 */
export function getMilestoneOrThrow(
  structure: StoryStructure,
  actIndex: number,
  milestoneIndex: number
): StoryMilestone {
  const act = structure.acts[actIndex];
  if (!act) {
    throw new Error(`Invalid currentActIndex: ${actIndex}`);
  }

  const milestone = act.milestones[milestoneIndex];
  if (!milestone) {
    throw new Error(`Invalid currentMilestoneIndex: ${milestoneIndex} for act ${act.id}`);
  }

  return milestone;
}

/**
 * Updates or inserts a milestone progression into a collection.
 * Returns a new array (immutable).
 */
export function upsertMilestoneProgression(
  milestoneProgressions: readonly MilestoneProgression[],
  nextProgression: MilestoneProgression
): MilestoneProgression[] {
  let found = false;
  const updated = milestoneProgressions.map((progression) => {
    if (progression.milestoneId !== nextProgression.milestoneId) {
      return { ...progression };
    }

    found = true;
    return nextProgression;
  });

  if (!found) {
    updated.push(nextProgression);
  }

  return updated;
}

/**
 * Computes the next sequential milestone ID from the current structure state.
 */
export function computeNextSequentialMilestoneId(state: AccumulatedStructureState): string | null {
  const nextMilestoneIndex = state.currentMilestoneIndex + 1;
  return `${state.currentActIndex + 1}.${nextMilestoneIndex + 1}`;
}

/**
 * Returns true if candidateId is ahead of referenceId in milestone ordering.
 */
export function isMilestoneIdAhead(candidateId: string, referenceId: string): boolean {
  const candidate = parseMilestoneIndices(candidateId);
  const reference = parseMilestoneIndices(referenceId);
  if (!candidate || !reference) return false;

  if (candidate.actIndex > reference.actIndex) return true;
  if (candidate.actIndex === reference.actIndex) {
    return candidate.milestoneIndex > reference.milestoneIndex;
  }
  return false;
}

/**
 * Resolves the currently active milestone from the structure and state.
 */
export function resolveActiveMilestone(
  activeStructureVersion: import('../models').VersionedStoryStructure | null,
  storyStructure: StoryStructure | null,
  parentStructureState: AccumulatedStructureState
): StoryMilestone | undefined {
  const activeStructure = activeStructureVersion?.structure ?? storyStructure;
  if (!activeStructure || !parentStructureState) {
    return undefined;
  }
  return getCurrentMilestone(activeStructure, parentStructureState);
}
