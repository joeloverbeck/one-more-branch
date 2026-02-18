import {
  CONCEPT_PASS_THRESHOLDS,
  type ConceptDimensionScores,
  type ConceptStressTesterContext,
} from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are an adversarial story architect. Your job is to break this concept under realistic play pressure and harden it for robust branching execution.';

const ADVERSARIAL_DIRECTIVES = `ADVERSARIAL DIRECTIVES:
- Do not praise the concept. Prioritize failure modes.
- Drift analysis: identify where world rules, constraints, or consequences are likely to erode across turns.
- Player-break analysis: test extreme but plausible player behavior (refusal, exploit loops, antagonist alignment, sidequest fixation).
- conflictType durability: does the conflictType create enough structural opposition to sustain branching? Can the antagonistic source (person/society/nature/etc.) generate sufficient variety of encounters?
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
  if (scores.branchingFitness < CONCEPT_PASS_THRESHOLDS.branchingFitness) {
    weak.push('branchingFitness');
  }
  if (scores.llmFeasibility < CONCEPT_PASS_THRESHOLDS.llmFeasibility) {
    weak.push('llmFeasibility');
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
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "hardenedConcept": ConceptSpec, "driftRisks": DriftRisk[], "playerBreaks": PlayerBreak[] }.
- driftRisks and playerBreaks must both be non-empty arrays.
- mitigationType must be one of: STATE_CONSTRAINT, WORLD_AXIOM, SCENE_RULE, RETRIEVAL_SCOPE.
- All text fields must be concrete and non-empty.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
