/**
 * Converts ActiveState and ActiveStateChanges between domain model and file format.
 */

import { ActiveState, ActiveStateChanges } from '../../models';
import { PageFileData } from '../page-serializer-types';

type ActiveStateChangesFileData = PageFileData['activeStateChanges'];
type AccumulatedActiveStateFileData = PageFileData['accumulatedActiveState'];

export function activeStateChangesToFileData(
  changes: ActiveStateChanges
): ActiveStateChangesFileData {
  return {
    newLocation: changes.newLocation,
    threatsAdded: [...changes.threatsAdded],
    threatsRemoved: [...changes.threatsRemoved],
    constraintsAdded: [...changes.constraintsAdded],
    constraintsRemoved: [...changes.constraintsRemoved],
    threadsAdded: [...changes.threadsAdded],
    threadsResolved: [...changes.threadsResolved],
  };
}

export function accumulatedActiveStateToFileData(
  state: ActiveState
): AccumulatedActiveStateFileData {
  return {
    currentLocation: state.currentLocation,
    activeThreats: state.activeThreats.map((entry) => ({ ...entry })),
    activeConstraints: state.activeConstraints.map((entry) => ({ ...entry })),
    openThreads: state.openThreads.map((entry) => ({ ...entry })),
  };
}

export function fileDataToActiveStateChanges(data: ActiveStateChangesFileData): ActiveStateChanges {
  return {
    newLocation: data.newLocation,
    threatsAdded: data.threatsAdded.map((entry) => ({ ...entry })),
    threatsRemoved: [...data.threatsRemoved],
    constraintsAdded: data.constraintsAdded.map((entry) => ({ ...entry })),
    constraintsRemoved: [...data.constraintsRemoved],
    threadsAdded: [...data.threadsAdded],
    threadsResolved: [...data.threadsResolved],
  };
}

export function fileDataToAccumulatedActiveState(
  data: AccumulatedActiveStateFileData
): ActiveState {
  return {
    currentLocation: data.currentLocation,
    activeThreats: data.activeThreats.map((entry) => ({ ...entry })),
    activeConstraints: data.activeConstraints.map((entry) => ({ ...entry })),
    openThreads: data.openThreads.map((entry) => ({ ...entry })),
  };
}
