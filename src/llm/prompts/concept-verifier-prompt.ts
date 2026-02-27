import type { ConceptVerifierContext } from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a concept integrity analyst for interactive branching fiction. Your job is to prove whether each concept is genuinely specific and load-bearing, or a dressed-up genre template.';

const VERIFICATION_DIRECTIVES = `VERIFICATION DIRECTIVES:
- Do not praise concepts. Probe their specificity.
- For each concept, produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- All scenarios and setpieces must be ONLY possible because of this specific concept's premise — both its conflict engine (genreSubversion, coreFlaw, coreConflictLoop) and its world-specific elements (settingAxioms, constraintSet, keyInstitutions, deadlineMechanism, pressureSource, escapeValve). Each setpiece must exploit at least one world-specific element, not just the conflict engine. If a setpiece could appear in a generic story of the same genre with different world rules, reject it and write one that couldn't.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's premise (both its conflict engine and its world-specific elements).
- premise promises are audience expectations: list 3-5 specific scenarios this premise promises the reader will experience. These are not structure beats.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- The inevitability statement captures what kind of story MUST happen given this premise — not what could happen, but what is forced by internal logic.
- The load-bearing check is a negative test: remove the conflict engine (genreSubversion + coreFlaw + coreConflictLoop) and determine whether the story collapses into generic genre.`;

const KERNEL_FIDELITY_DIRECTIVE = `KERNEL FIDELITY DIRECTIVE:
- For each concept, determine whether the kernel's valueAtStake and opposingForce are STRUCTURALLY embedded in the concept's conflict engine, or merely cosmetically referenced.
- The test: Remove the story kernel entirely. Does the concept's conflict engine (coreConflictLoop, pressureSource, stakesPersonal, stakesSystemic) still clearly imply the same value-at-stake and opposing force? If NOT, the operationalization is genuine — the kernel's thematic logic is load-bearing in the concept. If it COULD serve any kernel equally well, the operationalization is superficial.
- kernelFidelityCheck.passes = true means the concept has genuinely grounded the kernel.
- kernelFidelityCheck.kernelDrift describes what kernel elements are absent, weakly mapped, or superficially parroted.`;

function buildUserPayload(context: ConceptVerifierContext): string {
  const conceptInputs = context.evaluatedConcepts.map((evaluated, index) => ({
    conceptId: `concept_${index + 1}`,
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
  }));

  return JSON.stringify(conceptInputs, null, 2);
}

export function buildConceptVerifierPrompt(context: ConceptVerifierContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, VERIFICATION_DIRECTIVES, KERNEL_FIDELITY_DIRECTIVE];

  const kernelSection = `STORY KERNEL (shared by all concepts):
- dramaticThesis: ${context.kernel.dramaticThesis}
- valueAtStake: ${context.kernel.valueAtStake}
- opposingForce: ${context.kernel.opposingForce}
- directionOfChange: ${context.kernel.directionOfChange}
- thematicQuestion: ${context.kernel.thematicQuestion}`;

  const userSections: string[] = [
    'Verify the specificity and load-bearing integrity of each evaluated concept below.',
    `EVALUATED CONCEPTS INPUT:\n${buildUserPayload(context)}`,
    kernelSection,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "verifications": ConceptVerification[] }.
- verifications array must have exactly ${context.evaluatedConcepts.length} items, one per input concept.
- Each verification must include:
  - conceptId: string (must match exactly one provided input conceptId)
  - signatureScenario: string (the single most iconic interactive decision moment unique to this concept)
  - premisePromises: string[] (exactly 3-5 specific audience expectations; not beat names)
  - escalatingSetpieces: string[] (exactly 6 concept-unique situations in rising intensity)
  - inevitabilityStatement: string (what kind of story MUST happen given the premise's internal logic)
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
    - passes: true if the concept is genuinely load-bearing (removing differentiator DOES collapse it)
    - reasoning: explain what makes it unique or why it fails
    - genericCollapse: describe what the concept collapses INTO when its differentiator is removed
  - kernelFidelityCheck: { passes: boolean, reasoning: string, kernelDrift: string }
    - passes: true if the concept's conflict engine genuinely embeds the kernel's valueAtStake and opposingForce
    - reasoning: explain how the kernel is structurally grounded (or why it isn't)
    - kernelDrift: describe what kernel elements are absent, weak, or superficially applied
  - conceptIntegrityScore: number 0-100 (how many of the 6 setpieces are truly concept-unique; 100 = all 6 are impossible in any other story)
- Every input conceptId must appear exactly once in the output. No duplicates, no omissions, no unknown IDs.
- All text fields must be non-empty.
- Each escalatingSetpieces array must contain exactly 6 strings.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
