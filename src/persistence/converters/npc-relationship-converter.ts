/**
 * Converts NpcRelationship and AccumulatedNpcRelationships between domain model and file format.
 */

import type {
  NpcRelationship,
  AccumulatedNpcRelationships,
} from '../../models/state/npc-relationship';
import type { NpcRelationshipFileData } from '../page-serializer-types';

export function npcRelationshipToFileData(relationship: NpcRelationship): NpcRelationshipFileData {
  return {
    npcName: relationship.npcName,
    valence: relationship.valence,
    dynamic: relationship.dynamic,
    history: relationship.history,
    currentTension: relationship.currentTension,
    leverage: relationship.leverage,
  };
}

export function npcRelationshipArrayToFileData(
  relationships: readonly NpcRelationship[]
): NpcRelationshipFileData[] {
  return relationships.map(npcRelationshipToFileData);
}

export function accumulatedNpcRelationshipsToFileData(
  accumulated: AccumulatedNpcRelationships
): Record<string, NpcRelationshipFileData> {
  return Object.fromEntries(
    Object.entries(accumulated).map(([key, r]) => [key, npcRelationshipToFileData(r)])
  );
}

export function fileDataToNpcRelationship(data: NpcRelationshipFileData): NpcRelationship {
  return {
    npcName: data.npcName,
    valence: data.valence,
    dynamic: data.dynamic,
    history: data.history,
    currentTension: data.currentTension,
    leverage: data.leverage,
  };
}

export function fileDataToNpcRelationshipArray(
  data: NpcRelationshipFileData[]
): readonly NpcRelationship[] {
  return data.map(fileDataToNpcRelationship);
}

export function fileDataToAccumulatedNpcRelationships(
  data: Record<string, NpcRelationshipFileData>
): AccumulatedNpcRelationships {
  return Object.fromEntries(
    Object.entries(data).map(([key, r]) => [key, fileDataToNpcRelationship(r)])
  );
}
