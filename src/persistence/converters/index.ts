/**
 * Converters for page serialization.
 * Each converter handles transformation between domain models and file format.
 */

export { structureStateToFileData, fileDataToStructureState } from './structure-state-converter';

export {
  protagonistAffectToFileData,
  fileDataToProtagonistAffect,
} from './protagonist-affect-converter';

export {
  activeStateChangesToFileData,
  accumulatedActiveStateToFileData,
  fileDataToActiveStateChanges,
  fileDataToAccumulatedActiveState,
} from './active-state-converter';
