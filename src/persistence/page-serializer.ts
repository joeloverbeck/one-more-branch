import {
  AccumulatedCharacterState,
  AccumulatedStructureState,
  CharacterStateChanges,
  ChoiceType,
  Health,
  HealthChanges,
  Inventory,
  InventoryChanges,
  Page,
  PageId,
  PrimaryDelta,
  parseStructureVersionId,
  parsePageId,
} from '../models';
import type { AnalystResult } from '../llm/types';
import { PageFileData, AnalystResultFileData } from './page-serializer-types';
import {
  structureStateToFileData,
  fileDataToStructureState,
  protagonistAffectToFileData,
  fileDataToProtagonistAffect,
  activeStateChangesToFileData,
  accumulatedActiveStateToFileData,
  fileDataToActiveStateChanges,
  fileDataToAccumulatedActiveState,
} from './converters';

export { PageFileData } from './page-serializer-types';

function serializeAnalystResult(
  analystResult: AnalystResult | null,
): AnalystResultFileData | null {
  if (!analystResult) {
    return null;
  }
  return {
    beatConcluded: analystResult.beatConcluded ?? false,
    beatResolution: analystResult.beatResolution ?? '',
    deviationDetected: analystResult.deviationDetected ?? false,
    deviationReason: analystResult.deviationReason ?? '',
    invalidatedBeatIds: [...(analystResult.invalidatedBeatIds ?? [])],
    narrativeSummary: analystResult.narrativeSummary ?? '',
    pacingIssueDetected: analystResult.pacingIssueDetected ?? false,
    pacingIssueReason: analystResult.pacingIssueReason ?? '',
    recommendedAction: analystResult.recommendedAction ?? 'none',
    sceneMomentum: analystResult.sceneMomentum ?? 'STASIS',
    objectiveEvidenceStrength: analystResult.objectiveEvidenceStrength ?? 'NONE',
    commitmentStrength: analystResult.commitmentStrength ?? 'NONE',
    structuralPositionSignal: analystResult.structuralPositionSignal ?? 'WITHIN_ACTIVE_BEAT',
    entryConditionReadiness: analystResult.entryConditionReadiness ?? 'NOT_READY',
    objectiveAnchors: [...(analystResult.objectiveAnchors ?? [])],
    anchorEvidence: [...(analystResult.anchorEvidence ?? [])],
    completionGateSatisfied: analystResult.completionGateSatisfied ?? false,
    completionGateFailureReason: analystResult.completionGateFailureReason ?? '',
  };
}

function deserializeAnalystResult(data: AnalystResultFileData | null | undefined): AnalystResult | null {
  if (!data) {
    return null;
  }
  return {
    beatConcluded: data.beatConcluded,
    beatResolution: data.beatResolution,
    deviationDetected: data.deviationDetected,
    deviationReason: data.deviationReason,
    invalidatedBeatIds: [...data.invalidatedBeatIds],
    narrativeSummary: data.narrativeSummary,
    pacingIssueDetected: data.pacingIssueDetected,
    pacingIssueReason: data.pacingIssueReason,
    recommendedAction: data.recommendedAction as AnalystResult['recommendedAction'],
    sceneMomentum: data.sceneMomentum as AnalystResult['sceneMomentum'],
    objectiveEvidenceStrength: data.objectiveEvidenceStrength as AnalystResult['objectiveEvidenceStrength'],
    commitmentStrength: data.commitmentStrength as AnalystResult['commitmentStrength'],
    structuralPositionSignal: data.structuralPositionSignal as AnalystResult['structuralPositionSignal'],
    entryConditionReadiness: data.entryConditionReadiness as AnalystResult['entryConditionReadiness'],
    objectiveAnchors: [...data.objectiveAnchors],
    anchorEvidence: [...data.anchorEvidence],
    completionGateSatisfied: data.completionGateSatisfied,
    completionGateFailureReason: data.completionGateFailureReason,
    rawResponse: '',
  };
}

export function serializePage(page: Page): PageFileData {
  const accumulatedCharacterState: Record<string, Array<{ id: string; text: string }>> = {};
  for (const [name, state] of Object.entries(page.accumulatedCharacterState)) {
    accumulatedCharacterState[name] = state.map(entry => ({ ...entry }));
  }

  return {
    id: page.id,
    narrativeText: page.narrativeText,
    sceneSummary: page.sceneSummary,
    choices: page.choices.map((choice) => ({
      text: choice.text,
      choiceType: choice.choiceType,
      primaryDelta: choice.primaryDelta,
      nextPageId: choice.nextPageId,
    })),
    activeStateChanges: activeStateChangesToFileData(page.activeStateChanges),
    accumulatedActiveState: accumulatedActiveStateToFileData(page.accumulatedActiveState),
    inventoryChanges: {
      added: [...page.inventoryChanges.added],
      removed: [...page.inventoryChanges.removed],
    },
    accumulatedInventory: page.accumulatedInventory.map(entry => ({ ...entry })),
    healthChanges: {
      added: [...page.healthChanges.added],
      removed: [...page.healthChanges.removed],
    },
    accumulatedHealth: page.accumulatedHealth.map(entry => ({ ...entry })),
    characterStateChanges: {
      added: page.characterStateChanges.added.map(change => ({
        characterName: change.characterName,
        states: [...change.states],
      })),
      removed: [...page.characterStateChanges.removed],
    },
    accumulatedCharacterState,
    accumulatedStructureState: structureStateToFileData(page.accumulatedStructureState),
    protagonistAffect: protagonistAffectToFileData(page.protagonistAffect),
    structureVersionId: page.structureVersionId,
    analystResult: serializeAnalystResult(page.analystResult),
    isEnding: page.isEnding,
    parentPageId: page.parentPageId,
    parentChoiceIndex: page.parentChoiceIndex,
  };
}

export function deserializePage(data: PageFileData): Page {
  const inventoryChanges: InventoryChanges = {
    added: [...data.inventoryChanges.added],
    removed: [...data.inventoryChanges.removed],
  };

  const accumulatedInventory: Inventory = data.accumulatedInventory.map(entry => ({ ...entry }));

  const healthChanges: HealthChanges = {
    added: [...data.healthChanges.added],
    removed: [...data.healthChanges.removed],
  };

  const accumulatedHealth: Health = data.accumulatedHealth.map(entry => ({ ...entry }));

  const characterStateChanges: CharacterStateChanges = {
    added: data.characterStateChanges.added.map(change => ({
      characterName: change.characterName,
      states: [...change.states],
    })),
    removed: [...data.characterStateChanges.removed],
  };

  const accumulatedCharacterState: AccumulatedCharacterState = Object.fromEntries(
    Object.entries(data.accumulatedCharacterState).map(([name, state]) => [
      name,
      state.map(entry => ({ ...entry })),
    ]),
  );

  const accumulatedStructureState: AccumulatedStructureState = fileDataToStructureState(
    data.accumulatedStructureState,
  );
  const structureVersionId =
    data.structureVersionId === undefined || data.structureVersionId === null
      ? null
      : parseStructureVersionId(data.structureVersionId);

  const activeStateChanges = fileDataToActiveStateChanges(data.activeStateChanges);
  const accumulatedActiveState = fileDataToAccumulatedActiveState(data.accumulatedActiveState);

  const protagonistAffect = fileDataToProtagonistAffect(data.protagonistAffect);

  return {
    id: parsePageId(data.id),
    narrativeText: data.narrativeText,
    sceneSummary: data.sceneSummary,
    choices: data.choices.map((choice) => ({
      text: choice.text,
      choiceType: (choice.choiceType ?? 'TACTICAL_APPROACH') as ChoiceType,
      primaryDelta: (choice.primaryDelta ?? 'GOAL_SHIFT') as PrimaryDelta,
      nextPageId: choice.nextPageId === null ? null : parsePageId(choice.nextPageId),
    })),
    activeStateChanges,
    accumulatedActiveState,
    inventoryChanges,
    accumulatedInventory,
    healthChanges,
    accumulatedHealth,
    characterStateChanges,
    accumulatedCharacterState,
    accumulatedStructureState,
    protagonistAffect,
    structureVersionId,
    analystResult: deserializeAnalystResult(data.analystResult),
    isEnding: data.isEnding,
    parentPageId: data.parentPageId === null ? null : parsePageId(data.parentPageId),
    parentChoiceIndex: data.parentChoiceIndex,
  };
}

export function parsePageIdFromFileName(fileName: string): PageId | null {
  const match = fileName.match(/^page_(\d+)\.json$/);
  if (!match?.[1]) {
    return null;
  }

  return parsePageId(parseInt(match[1], 10));
}
