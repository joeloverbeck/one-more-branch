import type { Story, Page, VersionedStoryStructure } from '../models';
import type { ProtagonistGuidance } from '../models/protagonist-guidance.js';
import type { ContinuationContext } from '../llm/context-types';
import type { WriterValidationContext } from '../llm/generation-pipeline-types';
import type { AncestorContext } from './ancestor-collector';
import type { CollectedParentState } from './parent-state-collector';

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
  return {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    toneKeywords: story.toneKeywords,
    toneAntiKeywords: story.toneAntiKeywords,
    npcs: story.npcs,
    decomposedCharacters: story.decomposedCharacters,
    decomposedWorld: story.decomposedWorld,
    globalCanon: story.globalCanon,
    globalCharacterCanon: story.globalCharacterCanon,
    structure: currentStructureVersion?.structure ?? story.structure ?? undefined,
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
    parentPacingIssueReason: parentPage.analystResult?.pacingIssueReason ?? undefined,
    parentSceneMomentum: parentPage.analystResult?.sceneMomentum ?? undefined,
    parentObjectiveEvidenceStrength:
      parentPage.analystResult?.objectiveEvidenceStrength ?? undefined,
    momentumTrajectory: ancestorContext.momentumTrajectory,

    accumulatedNpcAgendas: parentState.accumulatedNpcAgendas,

    threadAges: parentPage.threadAges,
    inheritedNarrativePromises: parentPage.inheritedNarrativePromises,
    parentAnalystNarrativePromises: parentPage.analystResult?.narrativePromises ?? [],
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
