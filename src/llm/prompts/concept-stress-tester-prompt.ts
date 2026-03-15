import {
  CONCEPT_PASS_THRESHOLDS,
  DRIFT_RISK_MITIGATION_TYPES,
  type ConceptDimensionScores,
  type ConceptStressTesterContext,
  type ConceptVerification,
} from '../../models/concept-generator.js';
import type { ContentPacket } from '../../models/content-packet.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

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

  if (scores.hookStrength <= CONCEPT_PASS_THRESHOLDS.hookStrength) {
    weak.push('hookStrength');
  }
  if (scores.conflictEngine <= CONCEPT_PASS_THRESHOLDS.conflictEngine) {
    weak.push('conflictEngine');
  }
  if (scores.agencyBreadth <= CONCEPT_PASS_THRESHOLDS.agencyBreadth) {
    weak.push('agencyBreadth');
  }
  if (scores.noveltyLeverage <= CONCEPT_PASS_THRESHOLDS.noveltyLeverage) {
    weak.push('noveltyLeverage');
  }
  if (scores.ironicPremise <= CONCEPT_PASS_THRESHOLDS.ironicPremise) {
    weak.push('ironicPremise');
  }
  if (scores.sceneGenerativePower <= CONCEPT_PASS_THRESHOLDS.sceneGenerativePower) {
    weak.push('sceneGenerativePower');
  }
  if (scores.contentCharge <= CONCEPT_PASS_THRESHOLDS.contentCharge) {
    weak.push('contentCharge');
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
  return `## VERIFICATION INTELLIGENCE

### Signature Scenario (PROTECT THIS)
${verification.signatureScenario}

### Load-Bearing Check
- Passes: ${verification.loadBearingCheck.passes}
- Generic collapse risk: "${verification.loadBearingCheck.genericCollapse}"
- Integrity score: ${verification.conceptIntegrityScore}/100

DIRECTIVES:
- Your hardened concept MUST NOT invalidate the signature scenario.
- If load-bearing check identified generic collapse into "${verification.loadBearingCheck.genericCollapse}", your hardening must WIDEN the distance from that generic form, not narrow it.`;
}

function buildWildnessInvariantSection(packets: readonly ContentPacket[]): string {
  const invariants = packets
    .map((p) => `- [${p.contentId}] wildnessInvariant: "${p.wildnessInvariant}"`)
    .join('\n');

  const collapses = packets
    .map((p) => `- [${p.contentId}] dullCollapse: "${p.dullCollapse}"`)
    .join('\n');

  return `## WILDNESS INVARIANT EROSION CHECK

This concept was seeded from content packets with wildness invariants that downstream stages are forbidden to sand off.

### Invariants (MUST BE PRESERVED)
${invariants}

### Dull Collapse Descriptions (WHAT GENERIC STORY THIS BECOMES IF INVARIANT IS REMOVED)
${collapses}

DIRECTIVES:
- Compare the pre-hardened concept's relationship to each wildnessInvariant against the hardened concept's. Flag if the hardened concept has normalized, genericized, or removed the invariant's concrete specificity.
- If invariant erosion is detected, emit a drift risk with mitigationType "WILDNESS_INVARIANT" describing specifically what was diluted and how to restore it.
- Compare each packet's dullCollapse against the verification's genericCollapse (from the Load-Bearing Check). If they describe substantially the same generic story, the concept has collapsed despite nominally passing — flag this as a critical drift risk with mitigationType "WILDNESS_INVARIANT".
- Wildness invariant erosion is MORE serious than other drift risks. A concept that passes all other checks but loses its wildness invariant has failed.`;
}

export function buildConceptStressTesterPrompt(context: ConceptStressTesterContext): ChatMessage[] {
  const weakDimensions = buildWeakDimensionList(context.scores);
  const weakDimensionsLine =
    weakDimensions.length > 0 ? weakDimensions.join(', ') : 'none below threshold';

  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
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

  if (context.contentPackets && context.contentPackets.length > 0) {
    userSections.push(buildWildnessInvariantSection(context.contentPackets));
  }

  const mitigationTypeList = DRIFT_RISK_MITIGATION_TYPES.join(', ');
  userSections.push(`OUTPUT REQUIREMENTS:
- Return JSON with shape: { "hardenedConcept": ConceptSpec, "driftRisks": DriftRisk[], "playerBreaks": PlayerBreak[] }.
- driftRisks and playerBreaks must both be non-empty arrays.
- mitigationType must be one of: ${mitigationTypeList}.
- All text fields must be concrete and non-empty.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
