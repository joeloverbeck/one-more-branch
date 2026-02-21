import type { EvaluatedKernel, KernelEvolverContext } from '../../models/index.js';
import { DIRECTION_OF_CHANGE_VALUES } from '../../models/index.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a kernel evolution architect for branching interactive fiction. You recombine proven dramatic propositions, mutate weak points, and generate novel but structurally sound story kernels.';

const MUTATION_STRATEGIES = `MUTATION STRATEGIES:
- thesis-inversion: Flip the dramatic thesis so the original claim becomes its opposite or its dark mirror.
- force-escalation: Preserve the core value-at-stake but amplify the opposing force to a higher order of magnitude.
- value-transplant: Move a working value/force dynamic into an entirely different human conflict domain.
- direction-pivot: Keep thesis and stakes but shift directionOfChange (e.g. POSITIVE parent becomes IRONIC offspring).
- synthesis: Merge the dramatic cores of two parents into a single kernel that honors both tensions.
- radicalize: Push one parent's defining differentiator to its logical extreme.`;

const QUALITY_ANCHORS = `QUALITY ANCHORS:
- dramaticThesis must be a causal dramatic claim, not a topic label.
- valueAtStake must name a fundamental human value, not a task or objective.
- opposingForce must be an abstract force that can operate across settings.
- thematicQuestion must be a meaningful question that can be answered in multiple ways.
- Keep kernels abstract and transferable across genres.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return exactly 6 kernels.
- No two kernels may share the same valueAtStake.
- No two kernels may share the same opposingForce.
- Use at least 3 distinct directionOfChange values.
- Ensure kernels represent materially different human conflict domains.`;

const DIRECTION_GUIDANCE = `DIRECTION OF CHANGE TAXONOMY:
- POSITIVE: The value ultimately prevails.
- NEGATIVE: The value is lost, compromised, or corrupted.
- IRONIC: The value is gained at a transformative cost, or victory feels hollow.
- AMBIGUOUS: Multiple dramatic outcomes remain equally valid.`;

const PROHIBITIONS = `PROHIBITIONS:
- Do not include genre framing.
- Do not include setting/world details.
- Do not include named characters or character bios.
- Do not include plot beats or scene sequencing.
- Do not include game mechanics or system design instructions.`;

function buildDirectionEnumList(): string {
  return DIRECTION_OF_CHANGE_VALUES.map((value) => `- ${value}`).join('\n');
}

function buildParentPayload(parentKernels: readonly EvaluatedKernel[]): string {
  const payload = parentKernels.map((parent, index) => ({
    parentId: `parent_${index + 1}`,
    overallScore: parent.overallScore,
    passes: parent.passes,
    scores: parent.scores,
    strengths: parent.strengths,
    weaknesses: parent.weaknesses,
    tradeoffSummary: parent.tradeoffSummary,
    kernel: parent.kernel,
  }));

  return JSON.stringify(payload, null, 2);
}

export function buildKernelEvolverPrompt(context: KernelEvolverContext): ChatMessage[] {
  const systemSections: string[] = [
    ROLE_INTRO,
    CONTENT_POLICY,
    MUTATION_STRATEGIES,
    QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    DIRECTION_GUIDANCE,
    `VALID directionOfChange values:\n${buildDirectionEnumList()}`,
    PROHIBITIONS,
  ];

  const userSections: string[] = [
    'Evolve the provided parent kernels into exactly 6 offspring kernels.',
    `PARENT KERNELS INPUT:\n${buildParentPayload(context.parentKernels)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "kernels": [StoryKernel, ...] }.
- kernels array must contain exactly 6 items.
- Every kernel must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- Each offspring should employ a different mutation strategy.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
