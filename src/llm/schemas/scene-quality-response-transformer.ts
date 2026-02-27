import type { KnowledgeAsymmetry } from '../../models/state/index.js';
import type { DetectedRelationshipShift, SceneQualityResult } from '../scene-quality-types.js';
import { SceneQualityResultSchema } from './scene-quality-validation-schema.js';

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

function normalizeKnowledgeAsymmetryDetected(
  value: readonly {
    characterName: string;
    knownFacts: readonly string[];
    falseBeliefs: readonly string[];
    secrets: readonly string[];
  }[]
): KnowledgeAsymmetry[] {
  return value
    .map((entry) => ({
      characterName: entry.characterName.trim(),
      knownFacts: entry.knownFacts
        .map((fact) => fact.trim())
        .filter((fact) => fact.length > 0),
      falseBeliefs: entry.falseBeliefs
        .map((belief) => belief.trim())
        .filter((belief) => belief.length > 0),
      secrets: entry.secrets
        .map((secret) => secret.trim())
        .filter((secret) => secret.length > 0),
    }))
    .filter((entry) => entry.characterName.length > 0);
}

function normalizeDramaticIronyOpportunities(value: readonly string[]): string[] {
  return value.map((item) => item.trim()).filter((item) => item.length > 0);
}

export function validateSceneQualityResponse(
  rawJson: unknown,
  rawResponse: string
): SceneQualityResult & { rawResponse: string } {
  let parsed: unknown = rawJson;
  if (typeof parsed === 'string') {
    parsed = JSON.parse(parsed);
  }

  const validated = SceneQualityResultSchema.parse(parsed);

  return {
    toneAdherent: validated.toneAdherent,
    toneDriftDescription: validated.toneDriftDescription.trim(),
    thematicCharge: validated.thematicCharge,
    thematicChargeDescription: validated.thematicChargeDescription.trim(),
    narrativeFocus: validated.narrativeFocus,
    npcCoherenceAdherent: validated.npcCoherenceAdherent,
    npcCoherenceIssues: validated.npcCoherenceIssues.trim(),
    relationshipShiftsDetected: normalizeRelationshipShifts(validated.relationshipShiftsDetected),
    knowledgeAsymmetryDetected: normalizeKnowledgeAsymmetryDetected(
      validated.knowledgeAsymmetryDetected
    ),
    dramaticIronyOpportunities: normalizeDramaticIronyOpportunities(
      validated.dramaticIronyOpportunities
    ),
    rawResponse,
  };
}
