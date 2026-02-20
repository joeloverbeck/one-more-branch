import {
  CONCEPT_SCORING_WEIGHTS,
  type ConceptEvaluatorContext,
  type ConceptSpec,
  type ScoredConcept,
} from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a strict evaluator for branching interactive narrative concepts. You score and analyze concepts; you do not rewrite or improve them.';

const RUBRIC = `SCORING RUBRIC (0-5):
- hookStrength: Curiosity gap, emotional pull, one-line clarity, whatIfQuestion quality, and playerFantasy appeal.
- conflictEngine: Stakes depth, pressure mechanism quality, recurring dilemma strength, ironicTwist quality, and conflictType-to-conflictAxis coherence (e.g., INDIVIDUAL_VS_SYSTEM axis + PERSON_VS_SOCIETY type = strong pairing; mismatched pairings need strong justification).
- agencyBreadth: Action verb diversity, strategy range, and meaningful choice space.
- noveltyLeverage: Familiar frame plus a load-bearing differentiator.
- branchingFitness: Branch scalability, reconvergence viability, and state manageability.
- llmFeasibility: Rule enforceability, drift resistance, and implementation tractability.`;

function formatWeights(): string {
  return `DIMENSION WEIGHTS:
- hookStrength: weight ${CONCEPT_SCORING_WEIGHTS.hookStrength}
- conflictEngine: weight ${CONCEPT_SCORING_WEIGHTS.conflictEngine}
- agencyBreadth: weight ${CONCEPT_SCORING_WEIGHTS.agencyBreadth}
- noveltyLeverage: weight ${CONCEPT_SCORING_WEIGHTS.noveltyLeverage}
- branchingFitness: weight ${CONCEPT_SCORING_WEIGHTS.branchingFitness}
- llmFeasibility: weight ${CONCEPT_SCORING_WEIGHTS.llmFeasibility}`;
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

function buildConceptList(concepts: readonly ConceptSpec[], conceptIds: readonly string[]): string {
  return concepts
    .map(
      (concept, index) =>
        `${index + 1}. ${JSON.stringify({ conceptId: conceptIds[index], concept }, null, 2)}`,
    )
    .join('\n\n');
}

function buildScoredConceptList(
  scoredConcepts: readonly ScoredConcept[],
  conceptIds: readonly string[],
): string {
  return scoredConcepts
    .map(
      (item, index) =>
        `${index + 1}. ${JSON.stringify(
          {
            conceptId: conceptIds[index],
            concept: item.concept,
            scores: item.scores,
            overallScore: item.overallScore,
          },
          null,
          2,
        )}`,
    )
    .join('\n\n');
}

export function buildConceptEvaluatorScoringPrompt(
  context: ConceptEvaluatorContext,
  conceptIds: readonly string[],
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    RUBRIC,
    formatWeights(),
    `SCORING RULES:
- Score every candidate concept.
- Do not rank, filter, or select concepts.
- Do not compute weighted totals.`,
    `EVIDENCE REQUIREMENT:
- For each dimension provide 1-3 concrete bullets tied to specific concept fields.`,
  ];

  const userSections: string[] = [
    'Score these concept candidates against the user intent and rubric.',
    `USER SEEDS:\n${buildSeedSection(context)}`,
    `CONCEPT CANDIDATES:\n${buildConceptList(context.concepts, conceptIds)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredConcepts": [ ... ] }.
- Include one scoredConcept item for every input concept.
- For each item include: conceptId, scores, scoreEvidence.
- conceptId must match exactly one provided candidate conceptId.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}

export function buildConceptEvaluatorDeepEvalPrompt(
  context: ConceptEvaluatorContext,
  scoredConcepts: readonly ScoredConcept[],
  conceptIds: readonly string[],
): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    RUBRIC,
    formatWeights(),
    `DEEP EVALUATION RULES:
- Evaluate all provided scored concepts.
- Do not rescore and do not alter concepts.
- For each concept, explain user-facing strengths, weaknesses, and tradeoffs.`,
  ];

  const userSections: string[] = [
    'Deep-evaluate all scored concepts.',
    `USER SEEDS:\n${buildSeedSection(context)}`,
    `SCORED CONCEPTS WITH LOCKED SCORES:\n${buildScoredConceptList(scoredConcepts, conceptIds)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedConcepts": [ ... ] }.
- Include one evaluatedConcept item for every scored concept.
- For each item include: conceptId, strengths, weaknesses, tradeoffSummary.
- conceptId must match exactly one provided scored conceptId.
- strengths and weaknesses must be non-empty string arrays.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
