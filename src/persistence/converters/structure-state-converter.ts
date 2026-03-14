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
    currentMilestoneIndex: state.currentMilestoneIndex,
    milestoneProgressions: state.milestoneProgressions.map((milestoneProgression) => ({
      milestoneId: milestoneProgression.milestoneId,
      status: milestoneProgression.status,
      resolution: milestoneProgression.resolution,
    })),
    pagesInCurrentMilestone: state.pagesInCurrentMilestone,
    pacingNudge: state.pacingNudge,
  };
}

export function fileDataToStructureState(
  data: AccumulatedStructureStateFileData
): AccumulatedStructureState {
  return {
    currentActIndex: data.currentActIndex,
    currentMilestoneIndex: data.currentMilestoneIndex,
    milestoneProgressions: data.milestoneProgressions.map((milestoneProgression) => ({
      milestoneId: milestoneProgression.milestoneId,
      status: milestoneProgression.status,
      resolution: milestoneProgression.resolution,
    })),
    pagesInCurrentMilestone: data.pagesInCurrentMilestone,
    pacingNudge: data.pacingNudge,
  };
}
