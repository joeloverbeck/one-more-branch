import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { SpineArcEngine } from '../../models/spine-foundation.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';

export interface SpineSynthesisPromptContext {
  readonly characterConcept: string;
  readonly tone: string;
  readonly arcEngines: readonly SpineArcEngine[];
  readonly storyKernel?: StoryKernel;
  readonly conceptVerification?: ConceptVerification;
}

const SYNTHESIS_ROLE_INTRO = `You are a story architect specializing in dramatic synthesis for interactive branching fiction. You receive LOCKED arc engines (thematic foundation + story pattern + need/want) and must synthesize the capstone elements: antagonistic force, central dramatic question, and want-need collision point.

IMMUTABILITY CONSTRAINT: Do not rewrite, reinterpret, or alter any locked field. Your job is to synthesize the final dramatic elements FROM the locked material.`;

const SYNTHESIS_DESIGN_GUIDELINES = `SYNTHESIS DESIGN GUIDELINES:
- primaryAntagonisticForce.description: What opposes the protagonist. NOT necessarily a villain — can be a system, environment, internal flaw, social pressure, or fate. Must exploit or reinforce the protagonistDeepestFear.
- primaryAntagonisticForce.pressureMechanism: HOW the force creates difficult choices. Must widen the gap between need and want — forcing the protagonist to choose between what they pursue and what they truly need.
- centralDramaticQuestion: A single, specific question the story exists to answer. Ends with a question mark. Must be answerable by the story's events, not abstract. Must emerge from need/want + antagonistic force.
- wantNeedCollisionPoint: The specific moment or condition where pursuing the want actively blocks the need. Must be concrete and story-specific — not abstract.

COHERENCE RULES:
- The antagonistic force MUST exploit the protagonistDeepestFear.
- The pressure mechanism MUST widen the gap between need and want.
- The central dramatic question MUST be specific to THIS character in THIS world.
- The collision point MUST describe a concrete story moment, not a philosophical abstraction.`;

function formatArcEngines(arcEngines: readonly SpineArcEngine[]): string {
  return arcEngines.map((ae, i) => {
    const lines = [
      `ARC ENGINE ${i + 1}:`,
      `  conflictAxis: ${ae.conflictAxis}`,
      `  characterArcType: ${ae.characterArcType}`,
      `  protagonistDeepestFear: ${ae.protagonistDeepestFear}`,
      `  toneFeel: ${ae.toneFeel.join(', ')}`,
      `  toneAvoid: ${ae.toneAvoid.join(', ')}`,
      `  thematicPremise: ${ae.thematicPremise}`,
      `  storySpineType: ${ae.storySpineType}`,
      `  conflictType: ${ae.conflictType}`,
      `  need: ${ae.protagonistNeedVsWant.need}`,
      `  want: ${ae.protagonistNeedVsWant.want}`,
      `  dynamic: ${ae.protagonistNeedVsWant.dynamic}`,
    ];
    return lines.join('\n');
  }).join('\n\n');
}

function buildKernelConstraints(kernel?: StoryKernel): string {
  if (!kernel) {
    return '';
  }

  const lines: string[] = [
    'THEMATIC KERNEL CONSTRAINTS:',
    `Dramatic thesis: ${kernel.dramaticThesis}`,
    `Value at stake: ${kernel.valueAtStake}`,
    `Opposing force: ${kernel.opposingForce}`,
    '',
    'VALUE SPECTRUM:',
    `Positive: ${kernel.valueSpectrum.positive}`,
    `Contradictory: ${kernel.valueSpectrum.contradictory}`,
    `Negation of negation: ${kernel.valueSpectrum.negationOfNegation}`,
    '',
    'The antagonistic force\'s pressure mechanism should push the value toward the contradictory or negation-of-negation levels.',
    'The central dramatic question should operationalize the kernel\'s thematic question.',
  ];

  return lines.join('\n') + '\n\n';
}

function buildVerificationConstraints(verification?: ConceptVerification): string {
  if (!verification) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT VERIFICATION CONSTRAINTS:',
    `Signature scenario: ${verification.signatureScenario}`,
    `Narrative inevitability: ${verification.inevitabilityStatement}`,
    '',
    'The centralDramaticQuestion should make the signature scenario inevitable.',
    'The antagonistic force\'s pressure mechanism should logically produce the conditions described in the inevitability statement.',
  ];

  return lines.join('\n') + '\n\n';
}

export function buildSpineSynthesisPrompt(context: SpineSynthesisPromptContext): ChatMessage[] {
  const systemSections: string[] = [
    SYNTHESIS_ROLE_INTRO,
    CONTENT_POLICY,
    SYNTHESIS_DESIGN_GUIDELINES,
  ];

  const kernelSection = buildKernelConstraints(context.storyKernel);
  const verificationSection = buildVerificationConstraints(context.conceptVerification);

  const userPrompt = `Synthesize dramatic capstone elements for ALL ${context.arcEngines.length} locked arc engines below.

CHARACTER CONCEPT:
${context.characterConcept}

TONE/GENRE: ${context.tone}

${kernelSection}${verificationSection}LOCKED ARC ENGINES (DO NOT MODIFY — synthesize from this material):

${formatArcEngines(context.arcEngines)}

FIELD INSTRUCTIONS:
- primaryAntagonisticForce.description: What opposes the protagonist. Can be a person, system, environment, or internal force. Must exploit the protagonistDeepestFear. One sentence.
- primaryAntagonisticForce.pressureMechanism: HOW it creates difficult choices that widen the need-want gap. One sentence.
- centralDramaticQuestion: A single sentence ending with a question mark. Specific to THIS character and world. Bad: "Will good triumph over evil?" Good: "Can a disgraced guard expose the tribunal that framed her before they execute her as a scapegoat?"
- wantNeedCollisionPoint: The specific moment where pursuing the want actively blocks the need. Example: "When she finally earns the tribunal's trust, she realizes the information she needs can only come from betraying it." One sentence.

OUTPUT SHAPE:
- syntheses: array of exactly ${context.arcEngines.length} objects (one per arc engine, same order), each containing primaryAntagonisticForce, centralDramaticQuestion, wantNeedCollisionPoint`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}
