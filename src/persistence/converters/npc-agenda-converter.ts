/**
 * Converts NpcAgenda and AccumulatedNpcAgendas between domain model and file format.
 */

import type { NpcAgenda, AccumulatedNpcAgendas } from '../../models/state/npc-agenda';
import type { NpcAgendaFileData } from '../page-serializer-types';

export function npcAgendaToFileData(agenda: NpcAgenda): NpcAgendaFileData {
  return {
    npcName: agenda.npcName,
    currentGoal: agenda.currentGoal,
    leverage: agenda.leverage,
    fear: agenda.fear,
    offScreenBehavior: agenda.offScreenBehavior,
  };
}

export function npcAgendaArrayToFileData(agendas: readonly NpcAgenda[]): NpcAgendaFileData[] {
  return agendas.map(npcAgendaToFileData);
}

export function accumulatedNpcAgendasToFileData(
  accumulated: AccumulatedNpcAgendas
): Record<string, NpcAgendaFileData> {
  return Object.fromEntries(
    Object.entries(accumulated).map(([key, a]) => [key, npcAgendaToFileData(a)])
  );
}

export function fileDataToNpcAgenda(data: NpcAgendaFileData): NpcAgenda {
  return {
    npcName: data.npcName,
    currentGoal: data.currentGoal,
    leverage: data.leverage,
    fear: data.fear,
    offScreenBehavior: data.offScreenBehavior,
  };
}

export function fileDataToNpcAgendaArray(data: NpcAgendaFileData[]): readonly NpcAgenda[] {
  return data.map(fileDataToNpcAgenda);
}

export function fileDataToAccumulatedNpcAgendas(
  data: Record<string, NpcAgendaFileData>
): AccumulatedNpcAgendas {
  return Object.fromEntries(
    Object.entries(data).map(([key, a]) => [key, fileDataToNpcAgenda(a)])
  );
}
