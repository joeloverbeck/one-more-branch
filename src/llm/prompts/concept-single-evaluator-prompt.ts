import {
  CONCEPT_SCORING_WEIGHTS,
  type ConceptSpec,
  type ScoredConcept,
} from '../../models/concept-generator.js';
import type { ConceptSeedInput } from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.';

const RUBRIC = `SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.
- ironicPremise: 0-1 premise is straightforward with no built-in contradiction; 2-3 mild irony or subtext present; 4-5 the premise contains a deep structural irony where the protagonist's strength is also their undoing, or the world's rules create inherently paradoxical choices.
- sceneGenerativePower: 0-1 premise evokes only abstract tensions; 2-3 a few specific scenes come to mind; 4-5 reading the premise immediately triggers 5+ vivid, distinct scenes you can see playing out.
- contentCharge: 0-1 mostly abstract or stock genre with cosmetic weirdness; 2-3 one decent differentiator, but it could still be reskinned into generic genre; 4-5 contains one or more unforgettable concrete impossibilities that drive institutions, dilemmas, and scenes.`;

function formatWeights(): string {
  return `DIMENSION WEIGHTS:
- hookStrength: weight ${CONCEPT_SCORING_WEIGHTS.hookStrength}
- conflictEngine: weight ${CONCEPT_SCORING_WEIGHTS.conflictEngine}
- agencyBreadth: weight ${CONCEPT_SCORING_WEIGHTS.agencyBreadth}
- noveltyLeverage: weight ${CONCEPT_SCORING_WEIGHTS.noveltyLeverage}
- llmFeasibility: weight ${CONCEPT_SCORING_WEIGHTS.llmFeasibility}
- ironicPremise: weight ${CONCEPT_SCORING_WEIGHTS.ironicPremise}
- sceneGenerativePower: weight ${CONCEPT_SCORING_WEIGHTS.sceneGenerativePower}
- contentCharge: weight ${CONCEPT_SCORING_WEIGHTS.contentCharge}`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildSeedSection(seeds: ConceptSeedInput): string {
  const sections: string[] = [];
  const genreVibes = normalize(seeds.genreVibes);
  const moodKeywords = normalize(seeds.moodKeywords);
  const contentPreferences = normalize(seeds.contentPreferences);

  if (genreVibes) sections.push(`GENRE VIBES:\n${genreVibes}`);
  if (moodKeywords) sections.push(`MOOD KEYWORDS:\n${moodKeywords}`);
  if (contentPreferences) sections.push(`CONTENT PREFERENCES:\n${contentPreferences}`);

  return sections.length > 0 ? sections.join('\n\n') : 'No user preferences specified.';
}

export function buildSingleConceptScoringPrompt(
  concept: ConceptSpec,
  userSeeds: ConceptSeedInput,
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    RUBRIC,
    formatWeights(),
    `SCORING RULES:
- Score this concept across all 8 dimensions.
- Do not compute weighted totals.`,
    `PREFERENCE FIDELITY:
- When user preferences are provided, penalize if the concept fails to centrally embody ALL listed vibes/moods/preferences.
- In scoreEvidence for hookStrength and conflictEngine, explicitly note whether each user preference is centrally present or merely incidental.`,
    `EVIDENCE REQUIREMENT:
- For each dimension provide 1-3 concrete bullets tied to specific concept fields.`,
  ];

  const userSections: string[] = [
    'Score this concept against the user intent and rubric.',
    `MANDATORY USER PREFERENCES:\n${buildSeedSection(userSeeds)}`,
    `CONCEPT:\n${JSON.stringify(concept, null, 2)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredConcept": { scores, scoreEvidence } }.
- scores must contain all 8 dimension scores (0-5).
- scoreEvidence must contain 1-3 string items per dimension.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}

export function buildSingleConceptDeepEvalPrompt(
  concept: ConceptSpec,
  scored: ScoredConcept,
  userSeeds: ConceptSeedInput,
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    RUBRIC,
    formatWeights(),
    `DEEP EVALUATION RULES:
- Evaluate this scored concept.
- Do not rescore and do not alter the concept.
- Explain user-facing strengths, weaknesses, and tradeoffs.`,
    `PREFERENCE ADHERENCE:
- Explicitly assess whether the concept centrally embodies ALL listed user preferences.
- Flag missing or merely incidental preferences as weaknesses.`,
  ];

  const userSections: string[] = [
    'Deep-evaluate this scored concept.',
    `MANDATORY USER PREFERENCES:\n${buildSeedSection(userSeeds)}`,
    `SCORED CONCEPT WITH LOCKED SCORES:\n${JSON.stringify(
      { concept, scores: scored.scores, overallScore: scored.overallScore },
      null,
      2,
    )}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcept": { strengths, weaknesses, tradeoffSummary } }.
- strengths and weaknesses must be non-empty string arrays.
- tradeoffSummary must be a non-empty string.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
