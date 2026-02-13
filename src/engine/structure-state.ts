import type {
  AccumulatedStructureState,
  StoryStructure,
} from '../models/story-arc';
import { getBeatOrThrow, upsertBeatProgression } from './beat-utils';
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
 * Applies structure state inheritance (parent -> child page).
 * If beatConcluded, advances the state.
 */
export function applyStructureProgression(
  structure: StoryStructure,
  parentState: AccumulatedStructureState,
  beatConcluded: boolean,
  beatResolution: string
): AccumulatedStructureState {
  if (!beatConcluded) {
    return {
      ...parentState,
      pagesInCurrentBeat: parentState.pagesInCurrentBeat + 1,
    };
  }

  const result = advanceStructureState(structure, parentState, beatResolution);
  return result.updatedState;
}
