import {
  KERNEL_PASS_THRESHOLDS,
  KERNEL_SCORING_WEIGHTS,
  type KernelEvaluatorContext,
  type ScoredKernel,
  type StoryKernel,
} from '../../models/index.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a strict evaluator for story kernels. You score and analyze kernels; you do not rewrite, merge, or improve them.';

const RUBRIC = `SCORING RUBRIC (0-5):
- dramaticClarity: 0-1 vague truism; 2-3 identifiable but soft thesis; 4-5 crisp and falsifiable causal claim.
- thematicUniversality: 0-1 niche concern; 2-3 broad but partial resonance; 4-5 fundamental cross-cultural human resonance.
- generativePotential: 0-1 locked to one story/genre; 2-3 supports a few variations; 4-5 can seed many distinct concepts across genres.
- conflictTension: 0-1 weak opposition; 2-3 real but obvious resolution path; 4-5 irreconcilable value pressure with credible claims on both sides.
- emotionalDepth: 0-1 abstract and detached; 2-3 emotionally present but surface-level; 4-5 visceral and deeply human.`;

function formatWeightsAndThresholds(): string {
  return `WEIGHTS AND PASS THRESHOLDS:
- dramaticClarity: weight ${KERNEL_SCORING_WEIGHTS.dramaticClarity}, pass >= ${KERNEL_PASS_THRESHOLDS.dramaticClarity}
- thematicUniversality: weight ${KERNEL_SCORING_WEIGHTS.thematicUniversality}, pass >= ${KERNEL_PASS_THRESHOLDS.thematicUniversality}
- generativePotential: weight ${KERNEL_SCORING_WEIGHTS.generativePotential}, pass >= ${KERNEL_PASS_THRESHOLDS.generativePotential}
- conflictTension: weight ${KERNEL_SCORING_WEIGHTS.conflictTension}, pass >= ${KERNEL_PASS_THRESHOLDS.conflictTension}
- emotionalDepth: weight ${KERNEL_SCORING_WEIGHTS.emotionalDepth}, pass >= ${KERNEL_PASS_THRESHOLDS.emotionalDepth}`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildSeedSection(context: KernelEvaluatorContext): string {
  const seeds = context.userSeeds;
  const sections: string[] = [];

  const thematicInterests = normalize(seeds.thematicInterests);
  const emotionalCore = normalize(seeds.emotionalCore);
  const sparkLine = normalize(seeds.sparkLine);

  if (thematicInterests) {
    sections.push(`THEMATIC INTERESTS:\n${thematicInterests}`);
  }
  if (emotionalCore) {
    sections.push(`EMOTIONAL CORE:\n${emotionalCore}`);
  }
  if (sparkLine) {
    sections.push(`SPARK LINE:\n${sparkLine}`);
  }

  return sections.length > 0 ? sections.join('\n\n') : 'No optional user seeds provided.';
}

function buildKernelList(kernels: readonly StoryKernel[]): string {
  return kernels.map((kernel, index) => `${index + 1}. ${JSON.stringify(kernel, null, 2)}`).join('\n\n');
}

function buildScoredKernelList(scoredKernels: readonly ScoredKernel[]): string {
  return scoredKernels
    .map(
      (item, index) =>
        `${index + 1}. ${JSON.stringify(
          {
            kernel: item.kernel,
            scores: item.scores,
            overallScore: item.overallScore,
          },
          null,
          2,
        )}`,
    )
    .join('\n\n');
}

export function buildKernelEvaluatorScoringPrompt(context: KernelEvaluatorContext): ChatMessage[] {
  const systemSections = [
    ROLE_INTRO,
    RUBRIC,
    formatWeightsAndThresholds(),
    `SCORING RULES:
- Score every candidate kernel.
- Do not rank, filter, or select kernels.
- Do not compute weighted totals.`,
    `EVIDENCE REQUIREMENT:
- For each scoring dimension provide 1-3 concrete bullets tied to specific kernel fields.`,
  ];

  const userSections = [
    'Score these story kernel candidates against user intent and rubric.',
    `USER SEEDS:\n${buildSeedSection(context)}`,
    `KERNEL CANDIDATES:\n${buildKernelList(context.kernels)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scoredKernels": [ ... ] }.
- Include one scoredKernel item for every input kernel.
- Preserve kernel content exactly.
- For each item include: kernel, scores, scoreEvidence.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}

export function buildKernelEvaluatorDeepEvalPrompt(
  context: KernelEvaluatorContext,
  scoredKernels: readonly ScoredKernel[],
): ChatMessage[] {
  const systemSections = [
    ROLE_INTRO,
    RUBRIC,
    formatWeightsAndThresholds(),
    `DEEP EVALUATION RULES:
- Evaluate all provided kernels.
- Do not rescore and do not alter kernels.
- For each kernel, explain strengths, weaknesses, and tradeoffs.`,
  ];

  const userSections = [
    'Deep-evaluate this full kernel set selected in code.',
    `USER SEEDS:\n${buildSeedSection(context)}`,
    `KERNELS WITH LOCKED SCORES:\n${buildScoredKernelList(scoredKernels)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "evaluatedKernels": [ ... ] }.
- Include one evaluatedKernel item for every scored kernel.
- Preserve kernel content exactly.
- For each item include: kernel, strengths, weaknesses, tradeoffSummary.
- strengths and weaknesses must each contain 2-3 non-empty items.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
