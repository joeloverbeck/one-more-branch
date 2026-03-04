import {
  CONCEPT_PASS_THRESHOLDS,
  type ConceptDimensionScores,
  type ConceptStressTesterContext,
  type ConceptVerification,
} from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are an adversarial story architect. Your job is to break this concept under realistic play pressure and harden it for robust branching execution.';

const ADVERSARIAL_DIRECTIVES = `ADVERSARIAL DIRECTIVES:
- Do not praise the concept. Prioritize failure modes.
- Drift analysis: identify where world rules, constraints, or consequences are likely to erode across turns.
- Player-break analysis: test extreme but plausible player behavior (refusal, exploit loops, antagonist alignment, sidequest fixation).
- conflictType durability: does the conflictType create enough structural opposition to sustain branching? Can the antagonistic source (person/society/nature/etc.) generate sufficient variety of encounters?
- Irony Test: does the concept contain genuine structural irony, or is the "ironic twist" merely a plot surprise? Structural irony means the protagonist's strength IS the source of their potential undoing. If the ironicTwist is just a surprise reveal, tighten it.
- Dinner Table Test: could you explain this concept at a dinner table and have someone lean forward? If the concept sounds like a genre template ("a detective solves mysteries"), the hook needs sharpening. The concept must evoke a specific, vivid situation.
- Scene Flash Test: reading the concept, can you immediately see 5+ distinct, vivid scenes? If not, the concept is too abstract. Tighten settingAxioms, constraintSet, and pressureSource to be more concrete and scene-evoking.
- For every identified weakness, tighten existing concept fields with concrete and enforceable changes.
- Keep hardenedConcept in the exact ConceptSpec shape.`;

function buildWeakDimensionList(scores: ConceptDimensionScores): readonly string[] {
  const weak: string[] = [];

  if (scores.hookStrength < CONCEPT_PASS_THRESHOLDS.hookStrength) {
    weak.push('hookStrength');
  }
  if (scores.conflictEngine < CONCEPT_PASS_THRESHOLDS.conflictEngine) {
    weak.push('conflictEngine');
  }
  if (scores.agencyBreadth < CONCEPT_PASS_THRESHOLDS.agencyBreadth) {
    weak.push('agencyBreadth');
  }
  if (scores.noveltyLeverage < CONCEPT_PASS_THRESHOLDS.noveltyLeverage) {
    weak.push('noveltyLeverage');
  }
  if (scores.llmFeasibility < CONCEPT_PASS_THRESHOLDS.llmFeasibility) {
    weak.push('llmFeasibility');
  }
  if (scores.ironicPremise < CONCEPT_PASS_THRESHOLDS.ironicPremise) {
    weak.push('ironicPremise');
  }
  if (scores.sceneGenerativePower < CONCEPT_PASS_THRESHOLDS.sceneGenerativePower) {
    weak.push('sceneGenerativePower');
  }

  return weak;
}

function buildUserPayload(context: ConceptStressTesterContext): string {
  return JSON.stringify(
    {
      concept: context.concept,
      scores: context.scores,
      weaknesses: context.weaknesses,
    },
    null,
    2,
  );
}

function buildVerificationIntelligenceSection(verification: ConceptVerification): string {
  const setpieces = verification.escalatingSetpieces
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  return `## VERIFICATION INTELLIGENCE

### Signature Scenario (PROTECT THIS)
${verification.signatureScenario}

### Setpiece Bank (PRESERVE UNIQUENESS)
${setpieces}

### Load-Bearing Check
- Passes: ${verification.loadBearingCheck.passes}
- Generic collapse risk: "${verification.loadBearingCheck.genericCollapse}"
- Integrity score: ${verification.conceptIntegrityScore}/100

DIRECTIVES:
- Your hardened concept MUST NOT invalidate the signature scenario.
- Your drift risk mitigations MUST NOT erode any setpiece's world-specific elements.
- If load-bearing check identified generic collapse into "${verification.loadBearingCheck.genericCollapse}", your hardening must WIDEN the distance from that generic form, not narrow it.`;
}

export function buildConceptStressTesterPrompt(context: ConceptStressTesterContext): ChatMessage[] {
  const weakDimensions = buildWeakDimensionList(context.scores);
  const weakDimensionsLine =
    weakDimensions.length > 0 ? weakDimensions.join(', ') : 'none below threshold';

  const systemSections: string[] = [
    ROLE_INTRO,
    ADVERSARIAL_DIRECTIVES,
    `WEAK DIMENSION FOCUS:
- Prioritize reinforcement for: ${weakDimensionsLine}
- If no dimensions are below threshold, still harden against drift and hostile player strategies.`,
  ];

  const userSections: string[] = [
    'Stress-test this evaluated concept and return a hardened version plus concrete risk handling.',
    `EVALUATED CONCEPT INPUT:\n${buildUserPayload(context)}`,
  ];

  if (context.verification) {
    userSections.push(buildVerificationIntelligenceSection(context.verification));
  }

  userSections.push(`OUTPUT REQUIREMENTS:
- Return JSON with shape: { "hardenedConcept": ConceptSpec, "driftRisks": DriftRisk[], "playerBreaks": PlayerBreak[] }.
- driftRisks and playerBreaks must both be non-empty arrays.
- mitigationType must be one of: STATE_CONSTRAINT, WORLD_AXIOM, SCENE_RULE, RETRIEVAL_SCOPE.
- All text fields must be concrete and non-empty.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
