import type { StructureEvaluatorResult } from '../structure-evaluator-types.js';
import { StructureEvaluatorResultSchema } from './structure-evaluator-validation-schema.js';

const BEAT_ID_PATTERN = /^\d+\.\d+$/;
const MAX_OBJECTIVE_ANCHORS = 3;

function normalizeAnchors(value: readonly string[]): string[] {
  return value
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0)
    .slice(0, MAX_OBJECTIVE_ANCHORS);
}

function normalizeAnchorEvidence(value: readonly string[]): string[] {
  return value.map((item: string) => item.trim()).slice(0, MAX_OBJECTIVE_ANCHORS);
}

export function validateStructureEvaluatorResponse(
  rawJson: unknown,
  rawResponse: string
): StructureEvaluatorResult & { rawResponse: string } {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = StructureEvaluatorResultSchema.parse(parsed);
  const objectiveAnchors = normalizeAnchors(validated.objectiveAnchors);
  const rawAnchorEvidence = normalizeAnchorEvidence(validated.anchorEvidence);
  const anchorEvidence = objectiveAnchors.map(
    (_anchor: string, index: number) => rawAnchorEvidence[index] ?? ''
  );
  const completionGateSatisfied = validated.completionGateSatisfied;

  return {
    milestoneConcluded: validated.milestoneConcluded && completionGateSatisfied,
    milestoneResolution: validated.milestoneResolution.trim(),
    sceneMomentum: validated.sceneMomentum,
    objectiveEvidenceStrength: validated.objectiveEvidenceStrength,
    commitmentStrength: validated.commitmentStrength,
    structuralPositionSignal: validated.structuralPositionSignal,
    entryConditionReadiness: validated.entryConditionReadiness,
    objectiveAnchors,
    anchorEvidence,
    completionGateSatisfied,
    completionGateFailureReason: validated.completionGateFailureReason.trim(),
    deviationDetected: validated.deviationDetected,
    deviationReason: validated.deviationReason.trim(),
    invalidatedMilestoneIds: validated.invalidatedMilestoneIds
      .map((id: string) => id.trim())
      .filter((id: string) => BEAT_ID_PATTERN.test(id)),
    spineDeviationDetected: validated.spineDeviationDetected,
    spineDeviationReason: validated.spineDeviationReason.trim(),
    spineInvalidatedElement: validated.spineInvalidatedElement,
    alignedMilestoneId: validated.alignedMilestoneId
      ? BEAT_ID_PATTERN.test(validated.alignedMilestoneId.trim())
        ? validated.alignedMilestoneId.trim()
        : null
      : null,
    milestoneAlignmentConfidence: validated.milestoneAlignmentConfidence,
    milestoneAlignmentReason: validated.milestoneAlignmentReason.trim(),
    pacingIssueDetected: validated.pacingIssueDetected,
    pacingIssueReason: validated.pacingIssueReason.trim(),
    recommendedAction: validated.recommendedAction,
    pacingDirective: validated.pacingDirective.trim(),
    rawResponse,
  };
}
