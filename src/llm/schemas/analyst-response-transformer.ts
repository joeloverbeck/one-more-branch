import type { AnalystResult } from '../types.js';
import { AnalystResultSchema } from './analyst-validation-schema.js';

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

export function validateAnalystResponse(rawJson: unknown, rawResponse: string): AnalystResult {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = AnalystResultSchema.parse(parsed);
  const objectiveAnchors = normalizeAnchors(validated.objectiveAnchors);
  const rawAnchorEvidence = normalizeAnchorEvidence(validated.anchorEvidence);
  const anchorEvidence = objectiveAnchors.map(
    (_anchor: string, index: number) => rawAnchorEvidence[index] ?? '',
  );
  const completionGateFailureReason = validated.completionGateFailureReason.trim();
  const completionGateSatisfied = validated.completionGateSatisfied;

  return {
    beatConcluded: validated.beatConcluded && completionGateSatisfied,
    beatResolution: validated.beatResolution.trim(),
    deviationDetected: validated.deviationDetected,
    deviationReason: validated.deviationReason.trim(),
    invalidatedBeatIds: validated.invalidatedBeatIds
      .map((id: string) => id.trim())
      .filter((id: string) => BEAT_ID_PATTERN.test(id)),
    narrativeSummary: validated.narrativeSummary.trim(),
    pacingIssueDetected: validated.pacingIssueDetected,
    pacingIssueReason: validated.pacingIssueReason.trim(),
    recommendedAction: validated.recommendedAction,
    sceneMomentum: validated.sceneMomentum,
    objectiveEvidenceStrength: validated.objectiveEvidenceStrength,
    commitmentStrength: validated.commitmentStrength,
    structuralPositionSignal: validated.structuralPositionSignal,
    entryConditionReadiness: validated.entryConditionReadiness,
    objectiveAnchors,
    anchorEvidence,
    completionGateSatisfied,
    completionGateFailureReason,
    rawResponse,
  };
}
