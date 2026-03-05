import type { EvaluatedKernel, KernelEvolverContext } from '../../models/index.js';
import { DIRECTION_OF_CHANGE_VALUES } from '../../models/index.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import {
  CONFLICT_AXIS_GUIDANCE,
  DRAMATIC_STANCE_GUIDANCE,
  buildConflictAxisEnumList,
  buildDramaticStanceEnumList,
} from './kernel-prompt-shared.js';

const ROLE_INTRO =
  'You are a kernel evolution architect for branching interactive fiction. You recombine proven dramatic propositions, mutate weak points, and generate novel but structurally sound story kernels.';

const MUTATION_STRATEGIES = `MUTATION STRATEGIES:
- thesis-inversion: Flip the dramatic thesis so the original claim becomes its opposite or its dark mirror.
- force-escalation: Preserve the core value-at-stake but amplify the opposing force to a higher order of magnitude.
- value-transplant: Move a working value/force dynamic into an entirely different human conflict domain.
- direction-pivot: Keep thesis and stakes but shift directionOfChange (e.g. POSITIVE parent becomes IRONIC offspring).
- synthesis: Merge the dramatic cores of two parents into a single kernel that honors both tensions.
- radicalize: Push one parent's defining differentiator to its logical extreme.
- axis-shift: Preserve thesis but move to a different conflict axis.
- stance-pivot: Keep same conflict, shift dramatic stance (e.g. TRAGIC parent becomes COMIC offspring).
- irony-injection: Restructure the value spectrum so that pursuing the positive value inherently creates its negation-of-negation — the thesis becomes self-defeating by design.
- fear-transplant: Replace the implicit deepest fear driving the dramatic tension with one from a completely different human anxiety domain, keeping the same value at stake.
- moral-inversion: Flip the moral argument so the story argues the opposite conclusion about the same value — e.g. "loyalty saves" becomes "loyalty destroys."
- value-spectrum-deepening: Keep the same value but redesign the four-level spectrum to be more specific, visceral, and dramatically distinct at each degradation level.`;

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
- Use at least 4 distinct conflictAxis values.
- Use at least 3 distinct dramaticStance values.
- Ensure kernels represent materially different human conflict domains.
- CRITICAL: Diversity means different dramatic propositions and conflict domains. It does NOT mean distributing user seeds across kernels. Every kernel must centrally reflect ALL user-specified thematic interests, emotional core, and spark line.`;

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

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

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
    CONFLICT_AXIS_GUIDANCE,
    `VALID conflictAxis values:\n${buildConflictAxisEnumList()}`,
    DRAMATIC_STANCE_GUIDANCE,
    `VALID dramaticStance values:\n${buildDramaticStanceEnumList()}`,
    PROHIBITIONS,
  ];

  const thematicInterests = normalize(context.userSeeds?.thematicInterests);
  const emotionalCore = normalize(context.userSeeds?.emotionalCore);
  const sparkLine = normalize(context.userSeeds?.sparkLine);

  const userSections: string[] = [
    'Evolve the provided parent kernels into exactly 6 offspring kernels.',
    `PARENT KERNELS INPUT:\n${buildParentPayload(context.parentKernels)}`,
  ];

  const hasAnySeeds = thematicInterests ?? emotionalCore ?? sparkLine;
  if (hasAnySeeds) {
    const mandateParts: string[] = [];
    if (thematicInterests) mandateParts.push(`Thematic Interests: ${thematicInterests}`);
    if (emotionalCore) mandateParts.push(`Emotional Core: ${emotionalCore}`);
    if (sparkLine) mandateParts.push(`Spark Line: ${sparkLine}`);

    userSections.push(
      `USER CREATIVE MANDATE (every kernel MUST honor ALL of the following):\n${mandateParts.join('\n')}\nThese are non-negotiable. Every kernel must centrally reflect all listed seeds, though HOW each manifests dramatically may differ across kernels. Diversity comes from different dramatic propositions, conflict domains, and value spectrums — not from distributing or ignoring user seeds.`,
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "kernels": [StoryKernel, ...] }.
- kernels array must contain exactly 6 items.
- Every kernel must be complete and schema-valid.
- Do not copy any parent unchanged.
- Preserve useful parent strengths while directly addressing parent weaknesses.
- Each offspring should employ a different mutation strategy.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
