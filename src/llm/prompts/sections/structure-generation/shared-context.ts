import type { ConceptSpec, ConceptVerification } from '../../../../models/concept-generator.js';
import type { DecomposedCharacter } from '../../../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../../../models/decomposed-character.js';
import type { DecomposedWorld } from '../../../../models/decomposed-world.js';
import { formatDecomposedWorldForPrompt } from '../../../../models/decomposed-world.js';
import { getGenreObligationTags } from '../../../../models/genre-obligations.js';
import type { StoryKernel } from '../../../../models/story-kernel.js';
import type { StorySpine } from '../../../../models/story-spine.js';

export interface StructureContext {
  tone: string;
  startingSituation?: string;
  spine?: StorySpine;
  decomposedCharacters: readonly DecomposedCharacter[];
  decomposedWorld: DecomposedWorld;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
}

export function buildStructureGenerationCharacterSection(context: StructureContext): string {
  if (context.decomposedCharacters.length === 0) {
    return '';
  }

  const profiles = context.decomposedCharacters
    .map((character) => formatDecomposedCharacterForPrompt(character))
    .join('\n\n');

  return `CHARACTERS (decomposed profiles):\n${profiles}\n\n`;
}

export function buildStructureGenerationWorldSection(context: StructureContext): string {
  if (context.decomposedWorld.facts.length === 0) {
    return '';
  }

  return `${formatDecomposedWorldForPrompt(context.decomposedWorld)}\n\n`;
}

export function buildStructureGenerationStartingSituationSection(
  context: StructureContext
): string {
  return context.startingSituation ? `STARTING SITUATION:\n${context.startingSituation}\n\n` : '';
}

export function buildStructureGenerationToneSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  const lines: string[] = [];
  if (spine.toneFeel.length > 0) {
    lines.push(`TONE FEEL (target atmosphere): ${spine.toneFeel.join(', ')}`);
  }
  if (spine.toneAvoid.length > 0) {
    lines.push(`TONE AVOID (must not drift toward): ${spine.toneAvoid.join(', ')}`);
  }

  return lines.length > 0 ? `${lines.join('\n')}\n\n` : '';
}

export function buildStructureGenerationConceptStakesSection(
  conceptSpec?: ConceptSpec,
  escalationGuidance?: string,
  heading = 'CONCEPT STAKES:'
): string {
  if (!conceptSpec) {
    return '';
  }

  const guidanceLine = escalationGuidance ? `\n${escalationGuidance}` : '';

  return `${heading}
Personal stakes: ${conceptSpec.stakesPersonal}
Systemic stakes: ${conceptSpec.stakesSystemic}
Pressure source: ${conceptSpec.pressureSource}
Deadline mechanism: ${conceptSpec.deadlineMechanism}${guidanceLine}

`;
}

export function buildStructureGenerationPremisePromiseSection(
  verification?: ConceptVerification,
  constraintText?: string,
  heading = 'PREMISE PROMISE CONTRACT:'
): string {
  const premisePromises = verification?.premisePromises ?? [];
  if (premisePromises.length === 0) {
    return '';
  }

  const listed = premisePromises.map((promise) => `- ${promise}`).join('\n');
  const suffix = constraintText ? `\n${constraintText}` : '';

  return `${heading}
${listed}${suffix}

`;
}

export function buildStructureGenerationKernelSection(
  storyKernel?: StoryKernel,
  options?: {
    valueSpectrumHeading?: string;
    guidanceText?: string;
  }
): string {
  if (!storyKernel) {
    return '';
  }

  const valueSpectrumHeading = options?.valueSpectrumHeading ?? 'VALUE SPECTRUM:';
  const guidanceText = options?.guidanceText ? `\n${options.guidanceText}` : '';

  return `THEMATIC KERNEL:
Dramatic thesis: ${storyKernel.dramaticThesis}
Antithesis: ${storyKernel.antithesis}
Direction of change: ${storyKernel.directionOfChange}
Conflict axis: ${storyKernel.conflictAxis}
Dramatic stance: ${storyKernel.dramaticStance}
Thematic question: ${storyKernel.thematicQuestion}
Moral argument: ${storyKernel.moralArgument}

${valueSpectrumHeading}
Positive: ${storyKernel.valueSpectrum.positive}
Contrary: ${storyKernel.valueSpectrum.contrary}
Contradictory: ${storyKernel.valueSpectrum.contradictory}
Negation of negation: ${storyKernel.valueSpectrum.negationOfNegation}${guidanceText}

`;
}

export function buildStructureGenerationGenreObligationsSection(
  conceptSpec?: ConceptSpec
): string {
  if (!conceptSpec) {
    return '';
  }

  const obligations = getGenreObligationTags(conceptSpec.genreFrame);
  if (obligations.length === 0) {
    return '';
  }

  const listed = obligations.map((entry) => `- ${entry.tag}: ${entry.gloss}`).join('\n');
  return `GENRE OBLIGATION CONTRACT (for ${conceptSpec.genreFrame}):
${listed}

CONSTRAINT: Use act-level obligationTargets to decide which obligations this structure is actively allocating.
Each allocated obligation should be fulfilled by at least one milestone tagged with obligatorySceneTag.
If a milestone does not fulfill any obligation, set obligatorySceneTag to null.

`;
}

export function buildDirectionalGuidanceSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return 'Act 3 should include a "turning_point" milestone representing a crisis -- an impossible choice or sacrifice';
  }

  const direction = storyKernel.directionOfChange;

  switch (direction) {
    case 'POSITIVE':
      return (
        'Act 3 should include a "turning_point" milestone representing a crisis -- a supreme test of who the protagonist has become. ' +
        'Milestone architecture should allow triumph through sacrifice or growth; the crisis is the crucible where inner transformation ' +
        'proves its worth. The resolution milestone should consummate the victory, showing the new equilibrium earned through change'
      );
    case 'NEGATIVE':
      return (
        'Act 3 should include a "turning_point" milestone representing a crisis -- a trap that seals the protagonist\'s loss. ' +
        'Every option the protagonist faces should lead to compromise or defeat; the crisis confirms that the fatal flaw ' +
        'or opposing force was insurmountable. The resolution milestone should consummate the fall, showing the cost of failure or refusal to change'
      );
    case 'IRONIC':
      return (
        'Act 3 should include a "turning_point" milestone representing a crisis -- a Pyrrhic crossroads where victory costs something essential. ' +
        'The protagonist may achieve the outer goal but lose something irreplaceable, or gain wisdom too late to use it. ' +
        'The resolution milestone should feel hollow or bittersweet, showing that the answer to the dramatic question is more complex than expected'
      );
    case 'AMBIGUOUS':
      return (
        'Act 3 should include a "turning_point" milestone representing a crisis -- an open question where outcomes are genuinely uncertain. ' +
        'The crisis should resist clean resolution; multiple interpretations of success and failure coexist. ' +
        'The resolution milestone should leave the dramatic question resonating rather than answered, inviting the reader to decide what the story means'
      );
  }
}
