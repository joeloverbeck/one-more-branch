import { DIRECTION_OF_CHANGE_VALUES, type KernelIdeatorContext } from '../../models/index.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a dramatic theorist who distills stories to their irreducible dramatic proposition. You generate story kernels, not concepts or plot outlines.';

const QUALITY_ANCHORS = `QUALITY ANCHORS:
- dramaticThesis must be a causal dramatic claim, not a topic label.
- valueAtStake must name a fundamental human value, not a task or objective.
- opposingForce must be an abstract force that can operate across settings.
- thematicQuestion must be a meaningful question that can be answered in multiple ways.
- Keep kernels abstract and transferable across genres.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return 6-8 kernels.
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

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function buildDirectionEnumList(): string {
  return DIRECTION_OF_CHANGE_VALUES.map((value) => `- ${value}`).join('\n');
}

export function buildKernelIdeatorPrompt(context: KernelIdeatorContext): ChatMessage[] {
  const thematicInterests = normalize(context.thematicInterests);
  const emotionalCore = normalize(context.emotionalCore);
  const sparkLine = normalize(context.sparkLine);

  const systemMessage = [
    ROLE_INTRO,
    CONTENT_POLICY,
    QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    DIRECTION_GUIDANCE,
    `VALID directionOfChange values:\n${buildDirectionEnumList()}`,
    PROHIBITIONS,
  ].join('\n\n');

  const userSections: string[] = ['Generate 6-8 story kernels as abstract dramatic propositions.'];

  if (thematicInterests) {
    userSections.push(`THEMATIC INTERESTS:\n${thematicInterests}`);
  }
  if (emotionalCore) {
    userSections.push(`EMOTIONAL CORE:\n${emotionalCore}`);
  }
  if (sparkLine) {
    userSections.push(`SPARK LINE:\n${sparkLine}`);
  }

  if (!thematicInterests && !emotionalCore && !sparkLine) {
    userSections.push('No seeds were provided. Derive kernels from universal human themes and conflicts.');
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "kernels": [StoryKernel, ...] }.
- Each kernel must contain dramaticThesis, valueAtStake, opposingForce, directionOfChange, thematicQuestion.
- Keep every field concise and semantically distinct across the set.`
  );

  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
