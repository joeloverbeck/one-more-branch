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

export {
  npcAgendaToFileData,
  npcAgendaArrayToFileData,
  accumulatedNpcAgendasToFileData,
  fileDataToNpcAgenda,
  fileDataToNpcAgendaArray,
  fileDataToAccumulatedNpcAgendas,
} from './npc-agenda-converter';

export {
  npcRelationshipToFileData,
  npcRelationshipArrayToFileData,
  accumulatedNpcRelationshipsToFileData,
  fileDataToNpcRelationship,
  fileDataToNpcRelationshipArray,
  fileDataToAccumulatedNpcRelationships,
} from './npc-relationship-converter';

export { storyBibleToFileData, fileDataToStoryBible } from './story-bible-converter';

export { analystResultToFileData, fileDataToAnalystResult } from './analyst-result-converter';
