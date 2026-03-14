import type { EvaluatedConcept } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

const ROLE_INTRO =
  'You are a concept specificity analyst for interactive branching fiction. Your job is to prove whether this concept is genuinely specific and load-bearing, or a dressed-up genre template. You perform destructive analytical testing — probing, breaking, and exposing weaknesses.';

const SPECIFICITY_DIRECTIVES = `SPECIFICITY DIRECTIVES:
- Do not praise the concept. Probe its specificity.
- Produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's premise.
- logline compression test: assess whether the full concept compresses into a compelling <=27-word logline. Set loglineCompressible and provide the compressed logline text in logline.
- premise promises are audience expectations: list 3-5 specific scenarios this premise promises the reader will experience. These are not structure milestones.
- The inevitability statement captures what kind of story MUST happen given this premise.
- The load-bearing check is a negative test: remove the conflict engine and determine whether the story collapses into generic genre.`;

const KERNEL_FIDELITY_DIRECTIVE = `KERNEL FIDELITY DIRECTIVE:
- Determine whether the kernel's valueAtStake and opposingForce are STRUCTURALLY embedded in the concept's conflict engine, or merely cosmetically referenced.
- kernelFidelityCheck.passes = true means the concept has genuinely grounded the kernel.
- kernelFidelityCheck.kernelDrift describes what kernel elements are absent, weakly mapped, or superficially parroted.`;

export function buildSingleConceptSpecificityPrompt(
  evaluated: EvaluatedConcept,
  kernel: StoryKernel,
): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, SPECIFICITY_DIRECTIVES, KERNEL_FIDELITY_DIRECTIVE];

  const conceptInput = {
    oneLineHook: evaluated.concept.oneLineHook,
    genreFrame: evaluated.concept.genreFrame,
    genreSubversion: evaluated.concept.genreSubversion,
    protagonistRole: evaluated.concept.protagonistRole,
    coreFlaw: evaluated.concept.coreFlaw,
    coreConflictLoop: evaluated.concept.coreConflictLoop,
    conflictAxis: evaluated.concept.conflictAxis,
    conflictType: evaluated.concept.conflictType,
    pressureSource: evaluated.concept.pressureSource,
    settingAxioms: evaluated.concept.settingAxioms,
    constraintSet: evaluated.concept.constraintSet,
    deadlineMechanism: evaluated.concept.deadlineMechanism,
    keyInstitutions: evaluated.concept.keyInstitutions,
    escapeValve: evaluated.concept.escapeValve,
    incitingDisruption: evaluated.concept.incitingDisruption,
    playerFantasy: evaluated.concept.playerFantasy,
    strengths: evaluated.strengths,
    weaknesses: evaluated.weaknesses,
  };

  const kernelSection = `STORY KERNEL:
- dramaticThesis: ${kernel.dramaticThesis}
- valueAtStake: ${kernel.valueAtStake}
- opposingForce: ${kernel.opposingForce}
- directionOfChange: ${kernel.directionOfChange}
- conflictAxis: ${kernel.conflictAxis}
- dramaticStance: ${kernel.dramaticStance}
- thematicQuestion: ${kernel.thematicQuestion}`;

  const userSections: string[] = [
    'Analyze the specificity and load-bearing integrity of this evaluated concept.',
    `EVALUATED CONCEPT:\n${JSON.stringify(conceptInput, null, 2)}`,
    kernelSection,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "specificityAnalysis": { ... } }.
- specificityAnalysis must include:
  - signatureScenario: string
  - loglineCompressible: boolean
  - logline: string (<=27 words)
  - premisePromises: string[] (3-5 items)
  - inevitabilityStatement: string
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
  - kernelFidelityCheck: { passes: boolean, reasoning: string, kernelDrift: string }
- All text fields must be non-empty.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
