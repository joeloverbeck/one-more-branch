import type {
  AccumulatedStructureState,
  StoryStructure,
} from '../models/story-arc';
import { getBeatOrThrow, parseBeatIndices, upsertBeatProgression } from './beat-utils';
import type { StructureProgressionResult } from './structure-types';

/**
 * Advances the structure state when a beat is concluded.
 * Returns immutable updated state.
 */
export function advanceStructureState(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  beatResolution: string
): StructureProgressionResult {
  const resolution = beatResolution.trim();
  if (!resolution) {
    throw new Error('Cannot advance structure without a non-empty beat resolution');
  }

  const currentBeat = getBeatOrThrow(
    structure,
    currentState.currentActIndex,
    currentState.currentBeatIndex
  );

  const concludedProgressions = upsertBeatProgression(currentState.beatProgressions, {
    beatId: currentBeat.id,
    status: 'concluded',
    resolution,
  });

  const currentAct = structure.acts[currentState.currentActIndex];
  if (!currentAct) {
    throw new Error(`Invalid currentActIndex: ${currentState.currentActIndex}`);
  }

  const isLastBeatOfAct = currentState.currentBeatIndex === currentAct.beats.length - 1;
  const isLastAct = currentState.currentActIndex === structure.acts.length - 1;

  if (isLastBeatOfAct && isLastAct) {
    return {
      updatedState: {
        currentActIndex: currentState.currentActIndex,
        currentBeatIndex: currentState.currentBeatIndex,
        beatProgressions: concludedProgressions,
        pagesInCurrentBeat: 0,
        pacingNudge: null,
      },
      actAdvanced: false,
      beatAdvanced: false,
      isComplete: true,
    };
  }

  const nextActIndex = isLastBeatOfAct
    ? currentState.currentActIndex + 1
    : currentState.currentActIndex;
  const nextBeatIndex = isLastBeatOfAct ? 0 : currentState.currentBeatIndex + 1;
  const nextBeat = getBeatOrThrow(structure, nextActIndex, nextBeatIndex);

  const activatedProgressions = upsertBeatProgression(concludedProgressions, {
    beatId: nextBeat.id,
    status: 'active',
  });

  return {
    updatedState: {
      currentActIndex: nextActIndex,
      currentBeatIndex: nextBeatIndex,
      beatProgressions: activatedProgressions,
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    },
    actAdvanced: isLastBeatOfAct,
    beatAdvanced: true,
    isComplete: false,
  };
}

/**
 * Advances structure state past multiple beats when beat alignment detection
 * indicates the narrative has leaped ahead. Concludes intermediate beats
 * with a synthetic "bridged" resolution, then activates the target beat.
 */
export function advanceWithBeatSkip(
  structure: StoryStructure,
  currentState: AccumulatedStructureState,
  beatResolution: string,
  targetBeatId: string,
  bridgedResolution: string
): StructureProgressionResult {
  const target = parseBeatIndices(targetBeatId);
  if (!target) {
    return advanceStructureState(structure, currentState, beatResolution);
  }

  // First, advance normally from the current beat
  let result = advanceStructureState(structure, currentState, beatResolution);
  if (result.isComplete) return result;

  // Then advance through intermediate beats until we reach the target
  let state = result.updatedState;

  while (
    !isAtTarget(state, target.actIndex, target.beatIndex) &&
    !result.isComplete
  ) {
    result = advanceStructureState(structure, state, bridgedResolution);
    state = result.updatedState;
  }

  return {
    updatedState: state,
    actAdvanced: state.currentActIndex !== currentState.currentActIndex,
    beatAdvanced: true,
    isComplete: result.isComplete,
  };
}

function isAtTarget(
  state: AccumulatedStructureState,
  targetActIdx: number,
  targetBeatIdx: number
): boolean {
  return state.currentActIndex === targetActIdx && state.currentBeatIndex === targetBeatIdx;
}

/**
 * Applies structure state inheritance (parent -> child page).
 * If beatConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string,
  alignmentSkip?: { targetBeatId: string; bridgedResolution: string }
): AccumulatedStructureState {
  if (!beatConcluded) {
    return {
      ...parentState,
      pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1,
    };
  }

  if (alignmentSkip) {
    const result = advanceWithBeatSkip(
      structure,
      parentState,
      beatResolution,
      alignmentSkip.targetBeatId,
      alignmentSkip.bridgedResolution
    );
    return result.updatedState;
  }

  const result = advanceStructureState(structure, parentState, beatResolution);
  return result.updatedState;
}
