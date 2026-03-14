import { DIRECTION_OF_CHANGE_VALUES, type KernelIdeatorContext } from '../../models/index.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import {
  CONFLICT_AXIS_GUIDANCE,
  DRAMATIC_STANCE_GUIDANCE,
  buildConflictAxisEnumList,
  buildDramaticStanceEnumList,
} from './kernel-prompt-shared.js';

const ROLE_INTRO =
  'You are a dramatic theorist who distills stories to their irreducible dramatic proposition. You generate story kernels, not concepts or plot outlines.';

const VALUE_SPECTRUM_GUIDANCE = `VALUE SPECTRUM (McKee's value charge):
Each kernel must include a valueSpectrum with four levels of the value at stake:
- positive: The value fully realized (e.g., "True justice served").
- contrary: A lesser, compromised version of the value (e.g., "Procedural fairness without moral weight").
- contradictory: The direct negation of the value (e.g., "Injustice — the guilty go free").
- negationOfNegation: The worst possible state — the value weaponized against itself (e.g., "The justice system itself becomes the instrument of oppression").
The four levels must form a coherent degradation ladder. Each level must be one concise sentence.`;

const MORAL_ARGUMENT_GUIDANCE = `MORAL ARGUMENT:
Each kernel must include a moralArgument — one sentence stating the story's implicit moral claim about the value at stake. Not a lesson or moral tag, but the dramatic conclusion the story argues toward through its events. Example: "Power corrupts not through malice but through the erosion of the boundaries one swore to uphold."`;

const QUALITY_ANCHORS = `QUALITY ANCHORS:
- dramaticThesis must be a causal dramatic claim, not a topic label.
- antithesis must be the strongest credible counter-argument to dramaticThesis.
- valueAtStake must name a fundamental human value, not a task or objective.
- opposingForce must be an abstract force that can operate across settings.
- thematicQuestion must be a meaningful question that can be answered in multiple ways.
- valueSpectrum must degrade coherently from positive through negationOfNegation.
- moralArgument must be a dramatic conclusion, not a platitude.
- Keep kernels abstract and transferable across genres.`;

const DIVERSITY_CONSTRAINTS = `DIVERSITY CONSTRAINTS:
- Return 6-8 kernels.
- No two kernels may share the same valueAtStake.
- No two kernels may share the same opposingForce.
- Use at least 3 distinct directionOfChange values.
- Use at least 5 distinct conflictAxis values.
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
- Do not include plot milestones or scene sequencing.
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
    VALUE_SPECTRUM_GUIDANCE,
    MORAL_ARGUMENT_GUIDANCE,
    QUALITY_ANCHORS,
    DIVERSITY_CONSTRAINTS,
    DIRECTION_GUIDANCE,
    `VALID directionOfChange values:\n${buildDirectionEnumList()}`,
    CONFLICT_AXIS_GUIDANCE,
    `VALID conflictAxis values:\n${buildConflictAxisEnumList()}`,
    DRAMATIC_STANCE_GUIDANCE,
    `VALID dramaticStance values:\n${buildDramaticStanceEnumList()}`,
    `DISAMBIGUATION:
dramaticStance IRONIC describes philosophical worldview (subversive/deconstructive), while directionOfChange IRONIC describes outcome trajectory (value gained at transformative cost). A kernel can be TRAGIC stance with IRONIC direction, or IRONIC stance with POSITIVE direction.`,
    PROHIBITIONS,
  ].join('\n\n');

  const userSections: string[] = ['Generate 6-8 story kernels as abstract dramatic propositions.'];

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

  if (!hasAnySeeds) {
    userSections.push('No seeds were provided. Derive kernels from universal human themes and conflicts.');
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching exactly: { "kernels": [StoryKernel, ...] }.
- Each kernel must contain dramaticThesis, antithesis, valueAtStake, opposingForce, directionOfChange, conflictAxis, dramaticStance, thematicQuestion, valueSpectrum (object with positive, contrary, contradictory, negationOfNegation), moralArgument.
- Keep every field concise and semantically distinct across the set.`
  );

  return [
    { role: 'system', content: systemMessage },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
