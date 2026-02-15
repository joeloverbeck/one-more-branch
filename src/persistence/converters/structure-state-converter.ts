/**
 * Converts AccumulatedStructureState between domain model and file format.
 */

import { AccumulatedStructureState } from '../../models';
import { AccumulatedStructureStateFileData } from '../page-serializer-types';

export function structureStateToFileData(
  state: AccumulatedStructureState
): AccumulatedStructureStateFileData {
  return {
    currentActIndex: state.currentActIndex,
    currentBeatIndex: state.currentBeatIndex,
    beatProgressions: state.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
    pagesInCurrentBeat: state.pagesInCurrentBeat,
    pacingNudge: state.pacingNudge,
  };
}

export function fileDataToStructureState(
  data: AccumulatedStructureStateFileData
): AccumulatedStructureState {
  return {
    currentActIndex: data.currentActIndex,
    currentBeatIndex: data.currentBeatIndex,
    beatProgressions: data.beatProgressions.map((beatProgression) => ({
      beatId: beatProgression.beatId,
      status: beatProgression.status,
      resolution: beatProgression.resolution,
    })),
    pagesInCurrentBeat: data.pagesInCurrentBeat,
    pacingNudge: data.pacingNudge,
  };
}
