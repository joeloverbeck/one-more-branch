import type { ThreadPayoffAssessment } from '../../models/state/index.js';
import type { AnalystResult, DetectedPromise } from '../analyst-types.js';
import { AnalystResultSchema } from './analyst-validation-schema.js';

const BEAT_ID_PATTERN = /^\d+\.\d+$/;
const MAX_OBJECTIVE_ANCHORS = 3;
const MAX_NARRATIVE_PROMISES = 3;

function normalizeAnchors(value: readonly string[]): string[] {
  return value
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0)
    .slice(0, MAX_OBJECTIVE_ANCHORS);
}

function normalizeNarrativePromises(
  value: readonly { description: string; promiseType: string; suggestedUrgency: string }[]
): DetectedPromise[] {
  return value
    .filter((p) => p.description.trim().length > 0)
    .slice(0, MAX_NARRATIVE_PROMISES)
    .map((p) => ({
      description: p.description.trim(),
      promiseType: p.promiseType as DetectedPromise['promiseType'],
      suggestedUrgency: p.suggestedUrgency as DetectedPromise['suggestedUrgency'],
    }));
}

function normalizeThreadPayoffAssessments(
  value: readonly {
    threadId: string;
    threadText: string;
    satisfactionLevel: string;
    reasoning: string;
  }[]
): ThreadPayoffAssessment[] {
  return value
    .filter((a) => a.threadId.trim().length > 0)
    .map((a) => ({
      threadId: a.threadId.trim(),
      threadText: a.threadText.trim(),
      satisfactionLevel: a.satisfactionLevel as ThreadPayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning.trim(),
    }));
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
    (_anchor: string, index: number) => rawAnchorEvidence[index] ?? ''
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
    toneAdherent: validated.toneAdherent,
    toneDriftDescription: validated.toneDriftDescription.trim(),
    narrativePromises: normalizeNarrativePromises(validated.narrativePromises),
    threadPayoffAssessments: normalizeThreadPayoffAssessments(validated.threadPayoffAssessments),
    rawResponse,
  };
}
