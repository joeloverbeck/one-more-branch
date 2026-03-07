/**
 * Converts AnalystResult between domain model and file format.
 */

import type { AnalystResult } from '../../llm/analyst-types';
import type { AnalystResultFileData } from '../page-serializer-types';

function parseNarrativeFocus(
  value: string
): AnalystResult['narrativeFocus'] {
  if (value === 'DEEPENING' || value === 'BROADENING' || value === 'BALANCED') {
    return value;
  }
  throw new Error(`Invalid analyst narrativeFocus persisted value: ${value}`);
}

export function analystResultToFileData(
  analystResult: AnalystResult | null
): AnalystResultFileData | null {
  if (!analystResult) {
    return null;
  }
  return {
    beatConcluded: analystResult.beatConcluded,
    beatResolution: analystResult.beatResolution,
    deviationDetected: analystResult.deviationDetected,
    deviationReason: analystResult.deviationReason,
    invalidatedBeatIds: [...analystResult.invalidatedBeatIds],
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
    pacingDirective: analystResult.pacingDirective,
    spineDeviationDetected: analystResult.spineDeviationDetected,
    spineDeviationReason: analystResult.spineDeviationReason,
    spineInvalidatedElement: analystResult.spineInvalidatedElement,
    alignedBeatId: analystResult.alignedBeatId,
    beatAlignmentConfidence: analystResult.beatAlignmentConfidence,
    beatAlignmentReason: analystResult.beatAlignmentReason,
    thematicCharge: analystResult.thematicCharge,
    narrativeFocus: analystResult.narrativeFocus,
    thematicChargeDescription: analystResult.thematicChargeDescription,
    obligatorySceneFulfilled: analystResult.obligatorySceneFulfilled,
    premisePromiseFulfilled: analystResult.premisePromiseFulfilled,
    delayedConsequencesTriggered: [...(analystResult.delayedConsequencesTriggered ?? [])],
    delayedConsequencesCreated: (analystResult.delayedConsequencesCreated ?? []).map((d) => ({
      description: d.description,
      triggerCondition: d.triggerCondition,
      minPagesDelay: d.minPagesDelay,
      maxPagesDelay: d.maxPagesDelay,
    })),
    knowledgeAsymmetryDetected: (analystResult.knowledgeAsymmetryDetected ?? []).map((entry) => ({
      characterName: entry.characterName,
      knownFacts: [...entry.knownFacts],
      falseBeliefs: [...entry.falseBeliefs],
      secrets: [...entry.secrets],
    })),
    dramaticIronyOpportunities: [...(analystResult.dramaticIronyOpportunities ?? [])],
  };
}

export function fileDataToAnalystResult(
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
    pacingDirective: data.pacingDirective ?? '',
    spineDeviationDetected: data.spineDeviationDetected ?? false,
    spineDeviationReason: data.spineDeviationReason ?? '',
    spineInvalidatedElement:
      (data.spineInvalidatedElement as AnalystResult['spineInvalidatedElement']) ?? null,
    alignedBeatId: (data.alignedBeatId as AnalystResult['alignedBeatId']) ?? null,
    beatAlignmentConfidence:
      (data.beatAlignmentConfidence as AnalystResult['beatAlignmentConfidence']) ?? 'LOW',
    beatAlignmentReason: (data.beatAlignmentReason as string) ?? '',
    thematicCharge:
      (data.thematicCharge as AnalystResult['thematicCharge']) ?? 'AMBIGUOUS',
    narrativeFocus: parseNarrativeFocus(data.narrativeFocus),
    thematicChargeDescription: data.thematicChargeDescription ?? '',
    obligatorySceneFulfilled: data.obligatorySceneFulfilled ?? null,
    premisePromiseFulfilled: data.premisePromiseFulfilled ?? null,
    delayedConsequencesTriggered: [...(data.delayedConsequencesTriggered ?? [])],
    delayedConsequencesCreated: (data.delayedConsequencesCreated ?? []).map((d) => ({
      description: d.description,
      triggerCondition: d.triggerCondition,
      minPagesDelay: d.minPagesDelay,
      maxPagesDelay: d.maxPagesDelay,
    })),
    knowledgeAsymmetryDetected: (data.knowledgeAsymmetryDetected ?? []).map((entry) => ({
      characterName: entry.characterName,
      knownFacts: [...entry.knownFacts],
      falseBeliefs: [...entry.falseBeliefs],
      secrets: [...entry.secrets],
    })),
    dramaticIronyOpportunities: [...(data.dramaticIronyOpportunities ?? [])],
    rawResponse: '',
  };
}
