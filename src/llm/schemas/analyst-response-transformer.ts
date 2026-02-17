import type { PromisePayoffAssessment, ThreadPayoffAssessment } from '../../models/state/index.js';
import type { AnalystResult, DetectedPromise, DetectedRelationshipShift } from '../analyst-types.js';
import { isCanonicalIdForPrefix, STATE_ID_PREFIXES } from '../validation/state-id-prefixes.js';
import { AnalystResultSchema } from './analyst-validation-schema.js';

const BEAT_ID_PATTERN = /^\d+\.\d+$/;
const MAX_OBJECTIVE_ANCHORS = 3;
const MAX_PROMISES_DETECTED = 2;

function normalizeAnchors(value: readonly string[]): string[] {
  return value
    .map((item: string) => item.trim())
    .filter((item: string) => item.length > 0)
    .slice(0, MAX_OBJECTIVE_ANCHORS);
}

function normalizeDetectedPromises(
  value: readonly {
    description: string;
    promiseType: string;
    scope: string;
    resolutionHint: string;
    suggestedUrgency: string;
  }[]
): DetectedPromise[] {
  return value
    .filter((p) => p.description.trim().length > 0 && p.resolutionHint.trim().length > 0)
    .slice(0, MAX_PROMISES_DETECTED)
    .map((p) => ({
      description: p.description.trim(),
      promiseType: p.promiseType as DetectedPromise['promiseType'],
      scope: p.scope as DetectedPromise['scope'],
      resolutionHint: p.resolutionHint.trim(),
      suggestedUrgency: p.suggestedUrgency as DetectedPromise['suggestedUrgency'],
    }));
}

function isCanonicalPromiseId(value: string): boolean {
  return isCanonicalIdForPrefix(value, STATE_ID_PREFIXES.promises);
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

function normalizePromisePayoffAssessments(
  value: readonly {
    promiseId: string;
    description: string;
    satisfactionLevel: string;
    reasoning: string;
  }[]
): PromisePayoffAssessment[] {
  return value
    .filter((a) => isCanonicalPromiseId(a.promiseId))
    .map((a) => ({
      promiseId: a.promiseId.trim(),
      description: a.description.trim(),
      satisfactionLevel: a.satisfactionLevel as PromisePayoffAssessment['satisfactionLevel'],
      reasoning: a.reasoning.trim(),
    }));
}

function normalizePromisesResolved(value: readonly string[]): string[] {
  return value.map((id) => id.trim()).filter((id) => isCanonicalPromiseId(id));
}

function normalizeAnchorEvidence(value: readonly string[]): string[] {
  return value.map((item: string) => item.trim()).slice(0, MAX_OBJECTIVE_ANCHORS);
}

function normalizeRelationshipShifts(
  value: readonly {
    npcName: string;
    shiftDescription: string;
    suggestedValenceChange: number;
    suggestedNewDynamic: string;
  }[]
): DetectedRelationshipShift[] {
  return value
    .filter((s) => s.npcName.trim().length > 0 && s.shiftDescription.trim().length > 0)
    .map((s) => ({
      npcName: s.npcName.trim(),
      shiftDescription: s.shiftDescription.trim(),
      suggestedValenceChange: Math.max(-3, Math.min(3, s.suggestedValenceChange)),
      suggestedNewDynamic: s.suggestedNewDynamic.trim(),
    }));
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
    pacingDirective: validated.pacingDirective.trim(),
    objectiveAnchors,
    anchorEvidence,
    completionGateSatisfied,
    completionGateFailureReason,
    toneAdherent: validated.toneAdherent,
    toneDriftDescription: validated.toneDriftDescription.trim(),
    npcCoherenceAdherent: validated.npcCoherenceAdherent,
    npcCoherenceIssues: validated.npcCoherenceIssues.trim(),
    promisesDetected: normalizeDetectedPromises(validated.promisesDetected),
    promisesResolved: normalizePromisesResolved(validated.promisesResolved),
    promisePayoffAssessments: normalizePromisePayoffAssessments(validated.promisePayoffAssessments),
    threadPayoffAssessments: normalizeThreadPayoffAssessments(validated.threadPayoffAssessments),
    relationshipShiftsDetected: normalizeRelationshipShifts(validated.relationshipShiftsDetected),
    spineDeviationDetected: validated.spineDeviationDetected,
    spineDeviationReason: validated.spineDeviationReason.trim(),
    spineInvalidatedElement: validated.spineInvalidatedElement,
    rawResponse,
  };
}
