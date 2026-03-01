import type { Story, Page, VersionedStoryStructure } from '../models';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import type { ContinuationContext } from '../llm/context-types';
import type { WriterValidationContext } from '../llm/generation-pipeline-types';
import type { AncestorContext } from './ancestor-collector';
import type { CollectedParentState } from './parent-state-collector';
import { incrementDelayedConsequenceAges } from './consequence-lifecycle';

/**
 * Assembles the 14-property ContinuationContext object from story, parent page,
 * parent state, ancestor context, and structure version.
 */
export function buildContinuationContext(
  story: Story,
  parentPage: Page,
  choiceText: string,
  parentState: CollectedParentState,
  ancestorContext: AncestorContext,
  currentStructureVersion: VersionedStoryStructure | null,
  protagonistGuidance?: ProtagonistGuidance
): ContinuationContext {
  const agedDelayedConsequences = incrementDelayedConsequenceAges(
    parentState.accumulatedDelayedConsequences
  );

  return {
    tone: story.tone,
    toneFeel: story.toneFeel,
    toneAvoid: story.toneAvoid,
    genreFrame: story.conceptSpec?.genreFrame,
    decomposedCharacters: story.decomposedCharacters!,
    decomposedWorld: story.decomposedWorld!,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
    spine: story.spine,
    accumulatedStructureState: parentState.structureState,
    previousNarrative: parentPage.narrativeText,
    selectedChoice: choiceText,
    protagonistGuidance,
    accumulatedInventory: parentState.accumulatedInventory,
    accumulatedHealth: parentState.accumulatedHealth,
    accumulatedCharacterState: parentState.accumulatedCharacterState,
    parentProtagonistAffect: parentPage.protagonistAffect,
    activeState: parentState.accumulatedActiveState,
    grandparentNarrative: ancestorContext.grandparentNarrative,
    ancestorSummaries: ancestorContext.ancestorSummaries,

    parentToneDriftDescription: parentPage.analystResult?.toneDriftDescription ?? undefined,
    parentPacingNudge: parentState.structureState.pacingNudge,
    parentPacingDirective: parentPage.analystResult?.pacingDirective ?? undefined,
    parentPacingIssueReason: parentPage.analystResult?.pacingIssueReason ?? undefined,
    parentSceneMomentum: parentPage.analystResult?.sceneMomentum ?? undefined,
    parentObjectiveEvidenceStrength:
      parentPage.analystResult?.objectiveEvidenceStrength ?? undefined,
    momentumTrajectory: ancestorContext.momentumTrajectory,
    thematicValenceTrajectory: ancestorContext.thematicValenceTrajectory,
    narrativeFocusTrajectory: ancestorContext.narrativeFocusTrajectory,

    accumulatedNpcAgendas: parentState.accumulatedNpcAgendas,
    accumulatedNpcRelationships: parentState.accumulatedNpcRelationships,

    threadAges: parentPage.threadAges,
    accumulatedPromises: parentPage.accumulatedPromises,
    accumulatedDelayedConsequences: agedDelayedConsequences,
    accumulatedKnowledgeState: parentState.accumulatedKnowledgeState,
    parentDramaticIronyOpportunities:
      parentPage.analystResult?.dramaticIronyOpportunities ?? [],
    premisePromises: story.premisePromises,
    fulfilledPremisePromises: parentPage.accumulatedFulfilledPremisePromises ?? [],
    parentThreadPayoffAssessments: parentPage.analystResult?.threadPayoffAssessments ?? [],
  };
}

/**
 * Extracts keyed entry IDs from parent state for writer validation.
 * Used to tell the writer which IDs are valid for removal operations.
 */
export function buildRemovableIds(
  parentState: CollectedParentState
): WriterValidationContext['removableIds'] {
  return {
    threats: parentState.accumulatedActiveState.activeThreats.map((entry) => entry.id),
    constraints: parentState.accumulatedActiveState.activeConstraints.map((entry) => entry.id),
    threads: parentState.accumulatedActiveState.openThreads.map((entry) => entry.id),
    inventory: parentState.accumulatedInventory.map((entry) => entry.id),
    health: parentState.accumulatedHealth.map((entry) => entry.id),
    characterState: Object.values(parentState.accumulatedCharacterState).flatMap((entries) =>
      entries.map((entry) => entry.id)
    ),
  };
}
