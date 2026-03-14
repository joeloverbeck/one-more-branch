import type { ConceptSpec, ConceptVerification } from '../../models/concept-generator.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { formatDecomposedCharacterForPrompt } from '../../models/decomposed-character.js';
import { formatDecomposedWorldForPrompt } from '../../models/decomposed-world.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { StorySpine } from '../../models/story-spine.js';
import type { PromptOptions } from '../generation-pipeline-types.js';
import type { ChatMessage } from '../llm-client-types.js';
import { buildDirectionalGuidanceSection, buildGenreObligationsSection, type StructureContext } from './structure-prompt.js';
import { buildStructureSystemPrompt } from './system-prompt.js';
import { buildGenreConventionsSection } from './sections/shared/genre-conventions-section.js';
import { buildSpineSection } from './sections/shared/spine-section.js';

function buildCharacterSection(context: StructureContext): string {
  if (context.decomposedCharacters.length === 0) {
    return '';
  }

  const profiles = context.decomposedCharacters
    .map((character) => formatDecomposedCharacterForPrompt(character))
    .join('\n\n');

  return `CHARACTERS (decomposed profiles):\n${profiles}\n\n`;
}

function buildWorldSection(context: StructureContext): string {
  if (context.decomposedWorld.facts.length === 0) {
    return '';
  }

  return `${formatDecomposedWorldForPrompt(context.decomposedWorld)}\n\n`;
}

function buildToneFeelSection(spine?: StorySpine): string {
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

function buildConceptStakesSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  return `CONCEPT STAKES:
Personal stakes: ${conceptSpec.stakesPersonal}
Systemic stakes: ${conceptSpec.stakesSystemic}
Pressure source: ${conceptSpec.pressureSource}
Deadline mechanism: ${conceptSpec.deadlineMechanism}

Use these stakes to calibrate act-level escalation. Act 1 should activate the personal pressure first, later acts should widen the blast radius toward the systemic stakes.

`;
}

function buildPremisePromiseSection(verification?: ConceptVerification): string {
  const premisePromises = verification?.premisePromises ?? [];
  if (premisePromises.length === 0) {
    return '';
  }

  const listed = premisePromises.map((promise) => `- ${promise}`).join('\n');
  return `PREMISE PROMISE CONTRACT:
${listed}

Every premise promise must be allocated to at least one act using promiseTargets. Do not leave any promise unassigned or defer it to unspecified future beats.

`;
}

function buildSignatureScenarioSection(verification?: ConceptVerification): string {
  if (!verification) {
    return '';
  }

  const setpieces = verification.escalatingSetpieces
    .map((setpiece, index) => `${index + 1}. ${setpiece}`)
    .join('\n');

  return `CONCEPT VERIFICATION:
Signature scenario: ${verification.signatureScenario}
Escalating setpieces:
${setpieces}

If concept verification is present, anchorMoments.signatureScenarioPlacement must be explicit and should position the signature scenario where it delivers maximum concept-specific dramatic force.

`;
}

function buildKernelSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  return `THEMATIC KERNEL:
Dramatic thesis: ${storyKernel.dramaticThesis}
Antithesis: ${storyKernel.antithesis}
Direction of change: ${storyKernel.directionOfChange}
Conflict axis: ${storyKernel.conflictAxis}
Dramatic stance: ${storyKernel.dramaticStance}
Thematic question: ${storyKernel.thematicQuestion}
Moral argument: ${storyKernel.moralArgument}

VALUE SPECTRUM:
Positive: ${storyKernel.valueSpectrum.positive}
Contrary: ${storyKernel.valueSpectrum.contrary}
Contradictory: ${storyKernel.valueSpectrum.contradictory}
Negation of negation: ${storyKernel.valueSpectrum.negationOfNegation}

Use the kernel to differentiate act questions and ensure each act turns the value charge harder than the last.

`;
}

function buildMacroNpcAgendaInstructions(characters: readonly DecomposedCharacter[]): string {
  if (characters.length === 0) {
    return 'Return initialNpcAgendas as an empty array.';
  }

  return 'For each non-protagonist NPC, generate an initial agenda with npcName, currentGoal, leverage, fear, and offScreenBehavior. Keep each field to one sentence.';
}

export function buildMacroArchitecturePrompt(
  context: StructureContext,
  _options?: PromptOptions
): ChatMessage[] {
  const worldSection = buildWorldSection(context);
  const characterSection = buildCharacterSection(context);
  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:\n${context.startingSituation}\n\n`
    : '';
  const spineSection = buildSpineSection(context.spine);
  const toneFeelSection = buildToneFeelSection(context.spine);
  const conceptStakesSection = buildConceptStakesSection(context.conceptSpec);
  const premisePromiseSection = buildPremisePromiseSection(context.conceptVerification);
  const signatureScenarioSection = buildSignatureScenarioSection(context.conceptVerification);
  const genreConventionsSection = buildGenreConventionsSection(context.conceptSpec?.genreFrame);
  const genreObligationsSection = buildGenreObligationsSection(context.conceptSpec);
  const kernelSection = buildKernelSection(context.storyKernel);

  const userPrompt = `Design the macro architecture for an interactive story before any milestone writing happens.

${worldSection}${characterSection}${startingSituationSection}${spineSection}${toneFeelSection}${conceptStakesSection}${premisePromiseSection}${signatureScenarioSection}${genreConventionsSection}${genreObligationsSection}${kernelSection}TONE/GENRE: ${context.tone}

REQUIREMENTS (follow ALL):
1. Return 3-5 acts. Default to 3 acts. Use 4 or 5 only when the story genuinely needs additional macro turns.
2. Do not generate milestones. Call 1 owns macro architecture only.
3. Write overallTheme, premise, openingImage, and closingImage as concrete, story-specific macro anchors.
4. Set pacingBudget.targetPagesMin and pacingBudget.targetPagesMax for a 15-50 page interactive story.
5. Define anchorMoments for incitingIncident, midpoint, climax, and signatureScenarioPlacement.
6. Midpoint is chosen here, not retrofitted later. midpoint must specify actIndex, milestoneSlot, and midpointType.
7. If conceptVerification is provided, signatureScenarioPlacement must be explicit, not null.
8. Each act must include:
   - name
   - objective
   - stakes
   - entryCondition
   - actQuestion
   - exitReversal
   - promiseTargets
   - obligationTargets
9. Each actQuestion must be distinct and dramatically consequential.
10. Each non-final act must end in a larger turn than the previous act and therefore needs a non-empty exitReversal. The final act must end the story rather than setting up another reversal, so its exitReversal should be an empty string.
11. Every premise promise must be mapped to at least one act via promiseTargets.
12. Every genre obligation must be mapped to at least one act via obligationTargets.
13. Use worldbuilding, character pressure, and the thematic kernel to make the act frames specific rather than generic.
14. ${buildDirectionalGuidanceSection(context.storyKernel)}
15. ${buildMacroNpcAgendaInstructions(context.decomposedCharacters)}

OUTPUT SHAPE:
- overallTheme: string
- premise: string
- openingImage: string
- closingImage: string
- pacingBudget:
  - targetPagesMin: number
  - targetPagesMax: number
- anchorMoments:
  - incitingIncident:
    - actIndex: integer
    - description: string
  - midpoint:
    - actIndex: integer
    - milestoneSlot: integer
    - midpointType: FALSE_VICTORY | FALSE_DEFEAT
  - climax:
    - actIndex: integer
    - description: string
  - signatureScenarioPlacement: { actIndex: integer, description: string } | null
- initialNpcAgendas: array
  - each agenda has:
    - npcName: exact NPC name
    - currentGoal: string
    - leverage: string
    - fear: string
    - offScreenBehavior: string
- acts: 3-5 items
  - each act has:
    - name: string
    - objective: string
    - stakes: string
    - entryCondition: string
    - actQuestion: string
    - exitReversal: string
    - promiseTargets: string[]
    - obligationTargets: string[]

Return valid JSON only.`;

  return [
    { role: 'system', content: buildStructureSystemPrompt(context.tone) },
    { role: 'user', content: userPrompt },
  ];
}

export type { StructureContext };
