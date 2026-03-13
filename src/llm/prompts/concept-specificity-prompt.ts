import type { ConceptVerifierContext } from '../../models/concept-generator.js';
import type { ContentPacket } from '../../models/content-packet.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

const ROLE_INTRO =
  'You are a concept specificity analyst for interactive branching fiction. Your job is to prove whether each concept is genuinely specific and load-bearing, or a dressed-up genre template. You perform destructive analytical testing — probing, breaking, and exposing weaknesses.';

const SPECIFICITY_DIRECTIVES = `SPECIFICITY DIRECTIVES:
- Do not praise concepts. Probe their specificity.
- For each concept, produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's premise (both its conflict engine and its world-specific elements).
- logline compression test: assess whether the full concept compresses into a compelling <=27-word logline. Set loglineCompressible and provide the compressed logline text in logline.
- premise promises are audience expectations: list 3-5 specific scenarios this premise promises the reader will experience. These are not structure beats.
- The inevitability statement captures what kind of story MUST happen given this premise — not what could happen, but what is forced by internal logic.
- The load-bearing check is a negative test: remove the conflict engine (genreSubversion + coreFlaw + coreConflictLoop) and determine whether the story collapses into generic genre.`;

const KERNEL_FIDELITY_DIRECTIVE = `KERNEL FIDELITY DIRECTIVE:
- For each concept, determine whether the kernel's valueAtStake and opposingForce are STRUCTURALLY embedded in the concept's conflict engine, or merely cosmetically referenced.
- The test: Remove the story kernel entirely. Does the concept's conflict engine (coreConflictLoop, pressureSource, stakesPersonal, stakesSystemic) still clearly imply the same value-at-stake and opposing force? If NOT, the operationalization is genuine — the kernel's thematic logic is load-bearing in the concept. If it COULD serve any kernel equally well, the operationalization is superficial.
- kernelFidelityCheck.passes = true means the concept has genuinely grounded the kernel.
- kernelFidelityCheck.kernelDrift describes what kernel elements are absent, weakly mapped, or superficially parroted.`;

function buildContentPacketInvariantDirective(packets: readonly ContentPacket[]): string {
  const packetSummaries = packets
    .map(
      (p) =>
        `- ${p.contentId}: wildnessInvariant="${p.wildnessInvariant}", dullCollapse="${p.dullCollapse}"`,
    )
    .join('\n');

  return `CONTENT PACKET INVARIANT-REMOVAL TEST (additional load-bearing check):
- This test is ADDITIVE to the existing load-bearing check above. Both checks must run.
- For each concept that was seeded from a content packet, perform a second negative test: remove the wildnessInvariant or primary content packet entirely. Does the story collapse into generic genre?
- If removing the content packet's wildnessInvariant leaves a concept that could be any stock genre story, the invariant is genuinely load-bearing.
- Compare the result against the packet's dullCollapse field — if the concept matches or resembles the dullCollapse description, the invariant was doing real work.
- Record this result in the SAME loadBearingCheck field. The reasoning and genericCollapse should reflect BOTH the existing test (genreSubversion + coreFlaw + coreConflictLoop removal) AND this invariant-removal test.

CONTENT PACKETS IN CONTEXT:
${packetSummaries}`;
}

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

export function buildConceptSpecificityPrompt(context: ConceptVerifierContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, SPECIFICITY_DIRECTIVES, KERNEL_FIDELITY_DIRECTIVE];

  if (context.contentPackets && context.contentPackets.length > 0) {
    systemSections.push(buildContentPacketInvariantDirective(context.contentPackets));
  }

  const kernelSection = `STORY KERNEL (shared by all concepts):
- dramaticThesis: ${context.kernel.dramaticThesis}
- valueAtStake: ${context.kernel.valueAtStake}
- opposingForce: ${context.kernel.opposingForce}
- directionOfChange: ${context.kernel.directionOfChange}
- conflictAxis: ${context.kernel.conflictAxis}
- dramaticStance: ${context.kernel.dramaticStance}
- thematicQuestion: ${context.kernel.thematicQuestion}`;

  const userSections: string[] = [
    'Analyze the specificity and load-bearing integrity of each evaluated concept below.',
    `EVALUATED CONCEPTS INPUT:\n${buildUserPayload(context)}`,
    kernelSection,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "specificityAnalyses": ConceptSpecificityAnalysis[] }.
- specificityAnalyses array must have exactly ${context.evaluatedConcepts.length} items, one per input concept.
- Each analysis must include:
  - conceptId: string (must match exactly one provided input conceptId)
  - signatureScenario: string (the single most iconic interactive decision moment unique to this concept)
  - loglineCompressible: boolean (true iff concept can compress to a compelling <=27-word logline)
  - logline: string (the compressed logline itself, <=27 words)
  - premisePromises: string[] (exactly 3-5 specific audience expectations; not beat names)
  - inevitabilityStatement: string (what kind of story MUST happen given the premise's internal logic)
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
    - passes: true if the concept is genuinely load-bearing (removing differentiator DOES collapse it)
    - reasoning: explain what makes it unique or why it fails
    - genericCollapse: describe what the concept collapses INTO when its differentiator is removed
  - kernelFidelityCheck: { passes: boolean, reasoning: string, kernelDrift: string }
    - passes: true if the concept's conflict engine genuinely embeds the kernel's valueAtStake and opposingForce
    - reasoning: explain how the kernel is structurally grounded (or why it isn't)
    - kernelDrift: describe what kernel elements are absent, weak, or superficially applied
- Every input conceptId must appear exactly once in the output. No duplicates, no omissions, no unknown IDs.
- All text fields must be non-empty.
- logline must be <=27 words.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
