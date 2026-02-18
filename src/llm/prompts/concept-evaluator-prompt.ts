import {
  CONCEPT_PASS_THRESHOLDS,
  CONCEPT_SCORING_WEIGHTS,
  type ConceptEvaluatorContext,
} from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a strict evaluator for branching interactive narrative concepts. You score and select concepts; you do not rewrite or improve them.';

const RUBRIC = `SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, and one-line clarity.
- conflictEngine: Stakes depth, pressure mechanism quality, and recurring dilemma strength.
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- branchingFitness: Branch scalability, reconvergence viability, and state manageability.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.`;

function formatWeightsAndThresholds(): string {
  return `WEIGHTS AND PASS THRESHOLDS:
- hookStrength: weight ${CONCEPT_SCORING_WEIGHTS.hookStrength}, pass >= ${CONCEPT_PASS_THRESHOLDS.hookStrength}
- conflictEngine: weight ${CONCEPT_SCORING_WEIGHTS.conflictEngine}, pass >= ${CONCEPT_PASS_THRESHOLDS.conflictEngine}
- agencyBreadth: weight ${CONCEPT_SCORING_WEIGHTS.agencyBreadth}, pass >= ${CONCEPT_PASS_THRESHOLDS.agencyBreadth}
- noveltyLeverage: weight ${CONCEPT_SCORING_WEIGHTS.noveltyLeverage}, pass >= ${CONCEPT_PASS_THRESHOLDS.noveltyLeverage}
- branchingFitness: weight ${CONCEPT_SCORING_WEIGHTS.branchingFitness}, pass >= ${CONCEPT_PASS_THRESHOLDS.branchingFitness}
- llmFeasibility: weight ${CONCEPT_SCORING_WEIGHTS.llmFeasibility}, pass >= ${CONCEPT_PASS_THRESHOLDS.llmFeasibility}`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildSeedSection(context: ConceptEvaluatorContext): string {
  const seeds = context.userSeeds;
  const sections: string[] = [];
  const genreVibes = normalize(seeds.genreVibes);
  const moodKeywords = normalize(seeds.moodKeywords);
  const contentPreferences = normalize(seeds.contentPreferences);
  const thematicInterests = normalize(seeds.thematicInterests);
  const sparkLine = normalize(seeds.sparkLine);

  if (genreVibes) {
    sections.push(`GENRE VIBES:\n${genreVibes}`);
  }
  if (moodKeywords) {
    sections.push(`MOOD KEYWORDS:\n${moodKeywords}`);
  }
  if (thematicInterests) {
    sections.push(`THEMATIC INTERESTS:\n${thematicInterests}`);
  }
  if (sparkLine) {
    sections.push(`SPARK LINE:\n${sparkLine}`);
  }
  if (contentPreferences) {
    sections.push(`CONTENT PREFERENCES:\n${contentPreferences}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : 'No optional user seeds provided.';
}

function buildConceptList(context: ConceptEvaluatorContext): string {
  return context.concepts
    .map((concept, index) => `${index + 1}. ${JSON.stringify(concept, null, 2)}`)
    .join('\n\n');
}

export function buildConceptEvaluatorPrompt(context: ConceptEvaluatorContext): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    RUBRIC,
    formatWeightsAndThresholds(),
    `EVIDENCE REQUIREMENT:
- For every score dimension, ground judgment in 1-3 concrete bullet points that reference actual concept fields.`,
    `SELECTION RULES:
- Compute weighted scores using the provided weights.
- Return only the top 3 concepts by weighted score.
- If fewer than 3 concepts pass thresholds, return only passing concepts and call out threshold failures in weaknesses/tradeoffSummary.`,
    `TRADEOFF FRAMING:
- For each selected concept, state what the user gains and what they give up.
- Do not modify concept content.`,
  ];

  const userSections: string[] = [
    'Evaluate these concept candidates against the user intent and rubric.',
    `USER SEEDS:\n${buildSeedSection(context)}`,
    `CONCEPT CANDIDATES:\n${buildConceptList(context)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcepts": [ ... ] }.
- For each item include: concept, scores, overallScore, strengths, weaknesses, tradeoffSummary.
- strengths and weaknesses must be non-empty string arrays.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
