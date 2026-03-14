import type {
  AccumulatedStructureState,
  StoryStructure,
} from '../models/story-arc';
import type { VersionedStoryStructure } from '../models/structure-version';
import { getMilestoneOrThrow, parseMilestoneIndices, upsertMilestoneProgression } from './milestone-utils';
import type { StructureProgressionResult } from './structure-types';

/**
 * Advances the structure state when a milestone is concluded.
 * Returns immutable updated state.
 */
export function advanceStructureState(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  milestoneResolution: string
): StructureProgressionResult {
  const resolution = milestoneResolution.trim();
  if (!resolution) {
    throw new Error('Cannot advance structure without a non-empty milestone resolution');
  }

  const currentMilestone = getMilestoneOrThrow(
    structure,
    currentState.currentActIndex,
    currentState.currentMilestoneIndex
  );

  const concludedProgressions = upsertMilestoneProgression(currentState.milestoneProgressions, {
    milestoneId: currentMilestone.id,
    status: 'concluded',
    resolution,
  });

  const currentAct = structure.acts[currentState.currentActIndex];
  if (!currentAct) {
    throw new Error(`Invalid currentActIndex: ${currentState.currentActIndex}`);
  }

  const isLastMilestoneOfAct = currentState.currentMilestoneIndex === currentAct.milestones.length - 1;
  const isLastAct = currentState.currentActIndex === structure.acts.length - 1;

  if (isLastMilestoneOfAct && isLastAct) {
    return {
      updatedState: {
        currentActIndex: currentState.currentActIndex,
        currentMilestoneIndex: currentState.currentMilestoneIndex,
        milestoneProgressions: concludedProgressions,
        pagesInCurrentMilestone: 0,
        pacingNudge: null,
      },
      actAdvanced: false,
      milestoneAdvanced: false,
      isComplete: true,
    };
  }

  const nextActIndex = isLastMilestoneOfAct
    ? currentState.currentActIndex + 1
    : currentState.currentActIndex;
  const nextMilestoneIndex = isLastMilestoneOfAct ? 0 : currentState.currentMilestoneIndex + 1;
  const nextMilestone = getMilestoneOrThrow(structure, nextActIndex, nextMilestoneIndex);

  const activatedProgressions = upsertMilestoneProgression(concludedProgressions, {
    milestoneId: nextMilestone.id,
    status: 'active',
  });

  return {
    updatedState: {
      currentActIndex: nextActIndex,
      currentMilestoneIndex: nextMilestoneIndex,
      milestoneProgressions: activatedProgressions,
      pagesInCurrentMilestone: 0,
      pacingNudge: null,
    },
    actAdvanced: isLastMilestoneOfAct,
    milestoneAdvanced: true,
    isComplete: false,
  };
}

/**
 * Advances structure state past multiple milestones when milestone alignment detection
 * indicates the narrative has leaped ahead. Concludes intermediate milestones
 * with a synthetic "bridged" resolution, then activates the target milestone.
 */
export function advanceWithMilestoneSkip(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  milestoneResolution: string,
  targetMilestoneId: string,
  bridgedResolution: string
): StructureProgressionResult {
  const target = parseMilestoneIndices(targetMilestoneId);
  if (!target) {
    return advanceStructureState(structure, currentState, milestoneResolution);
  }

  // First, advance normally from the current milestone
  let result = advanceStructureState(structure, currentState, milestoneResolution);
  if (result.isComplete) return result;

  // Then advance through intermediate milestones until we reach the target
  let state = result.updatedState;

  while (
    !isAtTarget(state, target.actIndex, target.milestoneIndex) &&
    !result.isComplete
  ) {
    result = advanceStructureState(structure, state, bridgedResolution);
    state = result.updatedState;
  }

  return {
    updatedState: state,
    actAdvanced: state.currentActIndex !== currentState.currentActIndex,
    milestoneAdvanced: true,
    isComplete: result.isComplete,
  };
}

function isAtTarget(
  state: AccumulatedStructureState,
  targetActIdx: number,
  targetMilestoneIdx: number
): boolean {
  return state.currentActIndex === targetActIdx && state.currentMilestoneIndex === targetMilestoneIdx;
}

/**
 * Applies structure state inheritance (parent -> child page).
 * If milestoneConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  milestoneConcluded: boolean,
  milestoneResolution: string,
  alignmentSkip?: { targetMilestoneId: string; bridgedResolution: string }
): AccumulatedStructureState {
  if (!milestoneConcluded) {
    return {
      ...parentState,
      pagesInCurrentMilestone: parentState.pagesInCurrentMilestone + 1,
    };
  }

  if (alignmentSkip) {
    const result = advanceWithMilestoneSkip(
      structure,
      parentState,
      milestoneResolution,
      alignmentSkip.targetMilestoneId,
      alignmentSkip.bridgedResolution
    );
    return result.updatedState;
  }

  const result = advanceStructureState(structure, parentState, milestoneResolution);
  return result.updatedState;
}

export interface StructureProgressionContext {
  readonly activeStructureVersion: VersionedStoryStructure | null;
  readonly storyStructure: StoryStructure | null;
  readonly parentStructureState: AccumulatedStructureState;
  readonly milestoneConcluded: boolean;
  readonly milestoneResolution: string;
  readonly alignmentSkip?: { targetMilestoneId: string; bridgedResolution: string };
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
    context.milestoneConcluded,
    context.milestoneResolution,
    context.alignmentSkip
  );
}
