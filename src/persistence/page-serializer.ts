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
import type { TrackedPromise } from '../models/state/keyed-entry';
import type { NpcAgenda, AccumulatedNpcAgendas } from '../models/state/npc-agenda';
import type { NpcRelationship, AccumulatedNpcRelationships } from '../models/state/npc-relationship';
import type { AnalystResult } from '../llm/analyst-types';
import type { StoryBible } from '../llm/lorekeeper-types';
import {
  PageFileData,
  AnalystResultFileData,
  StoryBibleFileData,
  NpcAgendaFileData,
  NpcRelationshipFileData,
} from './page-serializer-types';
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

function serializeStoryBible(storyBible: StoryBible | null): StoryBibleFileData | null {
  if (!storyBible) {
    return null;
  }
  return {
    sceneWorldContext: storyBible.sceneWorldContext,
    relevantCharacters: storyBible.relevantCharacters.map((c) => ({
      name: c.name,
      role: c.role,
      relevantProfile: c.relevantProfile,
      speechPatterns: c.speechPatterns,
      protagonistRelationship: c.protagonistRelationship,
      ...(c.interCharacterDynamics !== undefined
        ? { interCharacterDynamics: c.interCharacterDynamics }
        : {}),
      currentState: c.currentState,
    })),
    relevantCanonFacts: [...storyBible.relevantCanonFacts],
    relevantHistory: storyBible.relevantHistory,
  };
}

function deserializeStoryBible(data: StoryBibleFileData | null): StoryBible | null {
  if (!data) {
    return null;
  }
  return {
    sceneWorldContext: data.sceneWorldContext,
    relevantCharacters: data.relevantCharacters.map((c) => ({
      name: c.name,
      role: c.role,
      relevantProfile: c.relevantProfile,
      speechPatterns: c.speechPatterns,
      protagonistRelationship: c.protagonistRelationship,
      ...(c.interCharacterDynamics !== undefined
        ? { interCharacterDynamics: c.interCharacterDynamics }
        : {}),
      currentState: c.currentState,
    })),
    relevantCanonFacts: [...data.relevantCanonFacts],
    relevantHistory: data.relevantHistory,
  };
}

function serializeAnalystResult(analystResult: AnalystResult | null): AnalystResultFileData | null {
  if (!analystResult) {
    return null;
  }
  return {
    beatConcluded: analystResult.beatConcluded,
    beatResolution: analystResult.beatResolution,
    deviationDetected: analystResult.deviationDetected,
    deviationReason: analystResult.deviationReason,
    invalidatedBeatIds: [...analystResult.invalidatedBeatIds],
    narrativeSummary: analystResult.narrativeSummary,
    pacingIssueDetected: analystResult.pacingIssueDetected,
    pacingIssueReason: analystResult.pacingIssueReason,
    recommendedAction: analystResult.recommendedAction,
    sceneMomentum: analystResult.sceneMomentum,
    objectiveEvidenceStrength: analystResult.objectiveEvidenceStrength,
    commitmentStrength: analystResult.commitmentStrength,
    structuralPositionSignal: analystResult.structuralPositionSignal,
    entryConditionReadiness: analystResult.entryConditionReadiness,
    objectiveAnchors: [...analystResult.objectiveAnchors],
    anchorEvidence: [...analystResult.anchorEvidence],
    completionGateSatisfied: analystResult.completionGateSatisfied,
    completionGateFailureReason: analystResult.completionGateFailureReason,
    toneAdherent: analystResult.toneAdherent,
    toneDriftDescription: analystResult.toneDriftDescription,
    npcCoherenceAdherent: analystResult.npcCoherenceAdherent,
    npcCoherenceIssues: analystResult.npcCoherenceIssues,
    promisesDetected: analystResult.promisesDetected.map((p) => ({
      description: p.description,
      promiseType: p.promiseType,
      scope: p.scope,
      resolutionHint: p.resolutionHint,
      suggestedUrgency: p.suggestedUrgency,
    })),
    promisesResolved: [...analystResult.promisesResolved],
    promisePayoffAssessments: analystResult.promisePayoffAssessments.map((a) => ({
      promiseId: a.promiseId,
      description: a.description,
      satisfactionLevel: a.satisfactionLevel,
      reasoning: a.reasoning,
    })),
    threadPayoffAssessments: analystResult.threadPayoffAssessments.map((a) => ({
      threadId: a.threadId,
      threadText: a.threadText,
      satisfactionLevel: a.satisfactionLevel,
      reasoning: a.reasoning,
    })),
    relationshipShiftsDetected: analystResult.relationshipShiftsDetected.map((s) => ({
      npcName: s.npcName,
      shiftDescription: s.shiftDescription,
      suggestedValenceChange: s.suggestedValenceChange,
      suggestedNewDynamic: s.suggestedNewDynamic,
    })),
    spineDeviationDetected: analystResult.spineDeviationDetected,
    spineDeviationReason: analystResult.spineDeviationReason,
    spineInvalidatedElement: analystResult.spineInvalidatedElement,
  };
}

function deserializeAnalystResult(
  data: AnalystResultFileData | null
): AnalystResult | null {
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
    objectiveEvidenceStrength:
      data.objectiveEvidenceStrength as AnalystResult['objectiveEvidenceStrength'],
    commitmentStrength: data.commitmentStrength as AnalystResult['commitmentStrength'],
    structuralPositionSignal:
      data.structuralPositionSignal as AnalystResult['structuralPositionSignal'],
    entryConditionReadiness:
      data.entryConditionReadiness as AnalystResult['entryConditionReadiness'],
    objectiveAnchors: [...data.objectiveAnchors],
    anchorEvidence: [...data.anchorEvidence],
    completionGateSatisfied: data.completionGateSatisfied,
    completionGateFailureReason: data.completionGateFailureReason,
    toneAdherent: data.toneAdherent,
    toneDriftDescription: data.toneDriftDescription,
    npcCoherenceAdherent: data.npcCoherenceAdherent,
    npcCoherenceIssues: data.npcCoherenceIssues,
    promisesDetected: data.promisesDetected.map((p) => ({
      description: p.description,
      promiseType: p.promiseType as AnalystResult['promisesDetected'][number]['promiseType'],
      scope: (p.scope ?? 'BEAT') as AnalystResult['promisesDetected'][number]['scope'],
      resolutionHint: p.resolutionHint ?? '',
      suggestedUrgency:
        p.suggestedUrgency as AnalystResult['promisesDetected'][number]['suggestedUrgency'],
    })),
    promisesResolved: [...data.promisesResolved],
    promisePayoffAssessments: data.promisePayoffAssessments.map((a) => ({
      promiseId: a.promiseId,
      description: a.description,
      satisfactionLevel:
        a.satisfactionLevel as AnalystResult['promisePayoffAssessments'][number]['satisfactionLevel'],
      reasoning: a.reasoning,
    })),
    threadPayoffAssessments: data.threadPayoffAssessments.map((a) => ({
      threadId: a.threadId,
      threadText: a.threadText,
      satisfactionLevel:
        a.satisfactionLevel as AnalystResult['threadPayoffAssessments'][number]['satisfactionLevel'],
      reasoning: a.reasoning,
    })),
    relationshipShiftsDetected: data.relationshipShiftsDetected.map((s) => ({
      npcName: s.npcName,
      shiftDescription: s.shiftDescription,
      suggestedValenceChange: s.suggestedValenceChange,
      suggestedNewDynamic: s.suggestedNewDynamic,
    })),
    spineDeviationDetected: data.spineDeviationDetected ?? false,
    spineDeviationReason: data.spineDeviationReason ?? '',
    spineInvalidatedElement:
      (data.spineInvalidatedElement as AnalystResult['spineInvalidatedElement']) ?? null,
    rawResponse: '',
  };
}

function deserializeNpcRelationship(data: NpcRelationshipFileData): NpcRelationship {
  return {
    npcName: data.npcName,
    valence: data.valence,
    dynamic: data.dynamic,
    history: data.history,
    currentTension: data.currentTension,
    leverage: data.leverage,
  };
}

function deserializeNpcRelationshipArray(
  data: NpcRelationshipFileData[]
): readonly NpcRelationship[] {
  return data.map(deserializeNpcRelationship);
}

function deserializeAccumulatedNpcRelationships(
  data: Record<string, NpcRelationshipFileData>
): AccumulatedNpcRelationships {
  return Object.fromEntries(
    Object.entries(data).map(([key, r]) => [key, deserializeNpcRelationship(r)])
  );
}

function deserializeNpcAgenda(data: NpcAgendaFileData): NpcAgenda {
  return {
    npcName: data.npcName,
    currentGoal: data.currentGoal,
    leverage: data.leverage,
    fear: data.fear,
    offScreenBehavior: data.offScreenBehavior,
  };
}

function deserializeNpcAgendaArray(data: NpcAgendaFileData[]): readonly NpcAgenda[] {
  return data.map(deserializeNpcAgenda);
}

function deserializeAccumulatedNpcAgendas(
  data: Record<string, NpcAgendaFileData>
): AccumulatedNpcAgendas {
  return Object.fromEntries(Object.entries(data).map(([key, a]) => [key, deserializeNpcAgenda(a)]));
}

export function serializePage(page: Page): PageFileData {
  const accumulatedCharacterState: Record<string, Array<{ id: string; text: string }>> = {};
  for (const [name, state] of Object.entries(page.accumulatedCharacterState)) {
    accumulatedCharacterState[name] = state.map((entry) => ({ ...entry }));
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
    accumulatedInventory: page.accumulatedInventory.map((entry) => ({ ...entry })),
    healthChanges: {
      added: [...page.healthChanges.added],
      removed: [...page.healthChanges.removed],
    },
    accumulatedHealth: page.accumulatedHealth.map((entry) => ({ ...entry })),
    characterStateChanges: {
      added: page.characterStateChanges.added.map((change) => ({
        characterName: change.characterName,
        states: [...change.states],
      })),
      removed: [...page.characterStateChanges.removed],
    },
    accumulatedCharacterState,
    accumulatedStructureState: structureStateToFileData(page.accumulatedStructureState),
    protagonistAffect: protagonistAffectToFileData(page.protagonistAffect),
    structureVersionId: page.structureVersionId,
    storyBible: serializeStoryBible(page.storyBible),
    analystResult: serializeAnalystResult(page.analystResult),
    threadAges: { ...page.threadAges },
    accumulatedPromises: page.accumulatedPromises.map((p) => ({
      id: p.id,
      description: p.description,
      promiseType: p.promiseType,
      scope: p.scope,
      resolutionHint: p.resolutionHint,
      suggestedUrgency: p.suggestedUrgency,
      age: p.age,
    })),
    resolvedThreadMeta: { ...page.resolvedThreadMeta },
    resolvedPromiseMeta: { ...page.resolvedPromiseMeta },
    npcAgendaUpdates: page.npcAgendaUpdates.map((a) => ({
      npcName: a.npcName,
      currentGoal: a.currentGoal,
      leverage: a.leverage,
      fear: a.fear,
      offScreenBehavior: a.offScreenBehavior,
    })),
    accumulatedNpcAgendas: Object.fromEntries(
      Object.entries(page.accumulatedNpcAgendas).map(([key, a]) => [
        key,
        {
          npcName: a.npcName,
          currentGoal: a.currentGoal,
          leverage: a.leverage,
          fear: a.fear,
          offScreenBehavior: a.offScreenBehavior,
        },
      ])
    ),
    npcRelationshipUpdates: page.npcRelationshipUpdates.map((r) => ({
      npcName: r.npcName,
      valence: r.valence,
      dynamic: r.dynamic,
      history: r.history,
      currentTension: r.currentTension,
      leverage: r.leverage,
    })),
    accumulatedNpcRelationships: Object.fromEntries(
      Object.entries(page.accumulatedNpcRelationships).map(([key, r]) => [
        key,
        {
          npcName: r.npcName,
          valence: r.valence,
          dynamic: r.dynamic,
          history: r.history,
          currentTension: r.currentTension,
          leverage: r.leverage,
        },
      ])
    ),
    pageActIndex: page.pageActIndex,
    pageBeatIndex: page.pageBeatIndex,
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

  const accumulatedInventory: Inventory = data.accumulatedInventory.map((entry) => ({ ...entry }));

  const healthChanges: HealthChanges = {
    added: [...data.healthChanges.added],
    removed: [...data.healthChanges.removed],
  };

  const accumulatedHealth: Health = data.accumulatedHealth.map((entry) => ({ ...entry }));

  const characterStateChanges: CharacterStateChanges = {
    added: data.characterStateChanges.added.map((change) => ({
      characterName: change.characterName,
      states: [...change.states],
    })),
    removed: [...data.characterStateChanges.removed],
  };

  const accumulatedCharacterState: AccumulatedCharacterState = Object.fromEntries(
    Object.entries(data.accumulatedCharacterState).map(([name, state]) => [
      name,
      state.map((entry) => ({ ...entry })),
    ])
  );

  const accumulatedStructureState: AccumulatedStructureState = fileDataToStructureState(
    data.accumulatedStructureState
  );
  const structureVersionId =
    data.structureVersionId === null
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
      choiceType: choice.choiceType as ChoiceType,
      primaryDelta: choice.primaryDelta as PrimaryDelta,
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
    storyBible: deserializeStoryBible(data.storyBible),
    analystResult: deserializeAnalystResult(data.analystResult),
    threadAges: data.threadAges,
    accumulatedPromises: data.accumulatedPromises.map((p) => ({
      id: p.id,
      description: p.description,
      promiseType: p.promiseType as TrackedPromise['promiseType'],
      scope: (p.scope ?? 'BEAT') as TrackedPromise['scope'],
      resolutionHint: p.resolutionHint ?? '',
      suggestedUrgency: p.suggestedUrgency as TrackedPromise['suggestedUrgency'],
      age: p.age,
    })),
    resolvedThreadMeta: data.resolvedThreadMeta,
    resolvedPromiseMeta: Object.fromEntries(
      Object.entries(data.resolvedPromiseMeta).map(([id, meta]) => [
        id,
        { promiseType: meta.promiseType, scope: meta.scope ?? 'BEAT', urgency: meta.urgency },
      ])
    ),
    npcAgendaUpdates: deserializeNpcAgendaArray(data.npcAgendaUpdates),
    accumulatedNpcAgendas: deserializeAccumulatedNpcAgendas(data.accumulatedNpcAgendas),
    npcRelationshipUpdates: deserializeNpcRelationshipArray(data.npcRelationshipUpdates),
    accumulatedNpcRelationships: deserializeAccumulatedNpcRelationships(
      data.accumulatedNpcRelationships
    ),
    pageActIndex: data.pageActIndex ?? data.accumulatedStructureState.currentActIndex,
    pageBeatIndex: data.pageBeatIndex ?? data.accumulatedStructureState.currentBeatIndex,
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
