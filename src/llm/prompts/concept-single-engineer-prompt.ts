import type {
  ConceptSeedFields,
  ConceptCharacterWorldFields,
} from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import { ENGINEER_QUALITY_ANCHORS } from './concept-prompt-shared.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export interface SingleEngineerPromptContext {
  readonly seed: ConceptSeedFields;
  readonly characterWorld: ConceptCharacterWorldFields;
  readonly kernel?: StoryKernel;
  readonly protagonistDetails?: string;
  readonly genreVibes?: string;
  readonly moodKeywords?: string;
  readonly contentPreferences?: string;
}

const ROLE_INTRO =
  'You are a story conflict engineer for branching interactive fiction. Given concept identity, character, and world, design the mechanical forces that drive the story — pressure, stakes, deadlines, irony, disruption, escape mechanisms — and write a compelling elevator paragraph that synthesizes the full concept.';

function buildKernelBlock(kernel: StoryKernel | undefined): string | null {
  if (!kernel) {
    return null;
  }

  return `STORY KERNEL:
- dramaticThesis: ${kernel.dramaticThesis}
- antithesis: ${kernel.antithesis}
- valueAtStake: ${kernel.valueAtStake}
- opposingForce: ${kernel.opposingForce}
- directionOfChange: ${kernel.directionOfChange}
- conflictAxis: ${kernel.conflictAxis}
- dramaticStance: ${kernel.dramaticStance}
- thematicQuestion: ${kernel.thematicQuestion}
- moralArgument: ${kernel.moralArgument}
- valueSpectrum.positive: ${kernel.valueSpectrum.positive}
- valueSpectrum.contrary: ${kernel.valueSpectrum.contrary}
- valueSpectrum.contradictory: ${kernel.valueSpectrum.contradictory}
- valueSpectrum.negationOfNegation: ${kernel.valueSpectrum.negationOfNegation}

WEILAND ARC ENGINEERING:
- protagonistGhost should be the backstory wound that makes the pressureSource personally devastating.
- protagonistLie should be the false belief that the deadlineMechanism exploits.
- protagonistTruth should be the realization that, if embraced, would dissolve the Lie and resolve the moral argument.
- wantNeedCollisionSketch should describe the moment where the protagonist's conscious goal (want) directly prevents their inner transformation (need).`;
}

function normalize(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export function buildSingleConceptEngineerPrompt(
  context: SingleEngineerPromptContext,
): ChatMessage[] {
  const genreVibes = normalize(context.genreVibes);
  const moodKeywords = normalize(context.moodKeywords);
  const contentPreferences = normalize(context.contentPreferences);

  const systemSections: string[] = [ROLE_INTRO];

  const toneParts: string[] = [];
  if (genreVibes) toneParts.push(`genre vibes: ${genreVibes}`);
  if (moodKeywords) toneParts.push(`mood keywords: ${moodKeywords}`);
  if (toneParts.length > 0) {
    systemSections.push(buildToneDirective(toneParts.join(' | ')));
  }

  systemSections.push(CONTENT_POLICY, ENGINEER_QUALITY_ANCHORS);

  const combined = { ...context.seed, ...context.characterWorld };
  const userSections: string[] = [
    'Engineer conflict forces and write an elevator paragraph for this concept.',
    `CONCEPT IDENTITY + CHARACTER + WORLD:\n${JSON.stringify(combined, null, 2)}`,
  ];

  const kernelBlock = buildKernelBlock(context.kernel);
  if (kernelBlock) {
    userSections.push(kernelBlock);
  }

  const protagonistDetails = normalize(context.protagonistDetails);
  if (protagonistDetails) {
    userSections.push(
      `MANDATORY PROTAGONIST (NON-NEGOTIABLE — ARC MUST SERVE THIS CHARACTER):\n${protagonistDetails}\nThe pressureSource, stakes, deadlineMechanism, protagonistLie, protagonistTruth, protagonistGhost, and wantNeedCollisionSketch MUST be engineered for this specific protagonist. The conflict engine exists to pressure this character, not a substitute.`,
    );
  }

  const mandateParts: string[] = [];
  if (protagonistDetails) mandateParts.push(`Protagonist Details: ${protagonistDetails}`);
  if (genreVibes) mandateParts.push(`Genre Vibes: ${genreVibes}`);
  if (moodKeywords) mandateParts.push(`Mood Keywords: ${moodKeywords}`);
  if (contentPreferences) mandateParts.push(`Content Preferences: ${contentPreferences}`);

  if (mandateParts.length > 0) {
    userSections.push(
      `USER CREATIVE MANDATE (conflict forces, pressure, stakes, and elevator paragraph MUST embody ALL of the following):\n${mandateParts.join('\n')}\nDesign a conflict engine that centrally expresses these qualities.`,
    );
  }

  userSections.push(
    `OUTPUT REQUIREMENTS:
- Return JSON matching schema shape: { "concept": { ...12 fields } }.
- elevatorParagraph must synthesize the full concept — hook, character, world, and conflict engine — into a compelling pitch.
- pressureSource, stakesPersonal, stakesSystemic, deadlineMechanism, ironicTwist, incitingDisruption, and escapeValve must all be non-empty and specific to the concept.
- protagonistLie, protagonistTruth, protagonistGhost, and wantNeedCollisionSketch must all be non-empty, specific, and consistent with the concept's conflict engine.`,
  );

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
