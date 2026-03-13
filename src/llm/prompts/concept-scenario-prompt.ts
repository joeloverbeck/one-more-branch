import type { ConceptVerifierContext } from '../../models/concept-generator.js';
import type { ContentPacket } from '../../models/content-packet.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ConceptSpecificityAnalysis } from '../concept-specificity-types.js';

const ROLE_INTRO =
  'You are a creative scenario architect for interactive branching fiction. Your job is to generate escalating setpieces that prove each concept can sustain a full story — or expose that it cannot. You work from specificity analyses already performed on each concept.';

const SCENARIO_DIRECTIVES = `SCENARIO DIRECTIVES:
- All scenarios and setpieces must be ONLY possible because of this specific concept's premise — both its conflict engine (genreSubversion, coreFlaw, coreConflictLoop) and its world-specific elements (settingAxioms, constraintSet, keyInstitutions, deadlineMechanism, pressureSource, escapeValve). Each setpiece must exploit at least one world-specific element, not just the conflict engine. If a setpiece could appear in a generic story of the same genre with different world rules, reject it and write one that couldn't.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- setpiece causal chain test: analyze whether each setpiece outcome CAUSES the next setpiece setup. If links are weak or missing, set setpieceCausalChainBroken=true and still provide the strongest possible 5 causal links (between setpieces 1->2 through 5->6).
- The conceptIntegrityScore measures how many of the 6 setpieces are truly concept-unique (100 = all 6 are impossible in any other story).
- Anchor each setpiece to the signature scenario already identified in the specificity analysis. The setpieces should feel like they belong in the same story as that signature moment.`;

function buildContentPacketSetpieceDirective(packets: readonly ContentPacket[]): string {
  const packetSummaries = packets
    .map(
      (p) =>
        `- ${p.contentId}: signatureImage="${p.signatureImage}", escalationPath="${p.escalationPath}", socialEngine="${p.socialEngine}"`,
    )
    .join('\n');

  return `CONTENT PACKET SETPIECE EXPLOITATION REQUIREMENTS:
- When content packets are present, at least 2 of the escalating setpieces must directly exploit the content packet's signatureImage or escalationPath. These setpieces must be impossible without the packet's concrete imagery or escalation logic.
- At least 1 setpiece must show the packet's socialEngine in action — the institution, market, ritual, or social structure that grows around the anomaly must be visibly operating in the scene.
- Setpieces that merely reference the packet cosmetically without exploiting its mechanics do not count.

CONTENT PACKETS IN CONTEXT:
${packetSummaries}`;
}

function buildUserPayload(
  context: ConceptVerifierContext,
  specificityAnalyses: readonly ConceptSpecificityAnalysis[],
): string {
  const conceptInputs = context.evaluatedConcepts.map((evaluated, index) => {
    const analysis = specificityAnalyses.find((a) => a.conceptId === `concept_${index + 1}`);
    return {
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
      signatureScenario: analysis?.signatureScenario ?? '',
    };
  });

  return JSON.stringify(conceptInputs, null, 2);
}

export function buildConceptScenarioPrompt(
  context: ConceptVerifierContext,
  specificityAnalyses: readonly ConceptSpecificityAnalysis[],
): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, SCENARIO_DIRECTIVES];

  if (context.contentPackets && context.contentPackets.length > 0) {
    systemSections.push(buildContentPacketSetpieceDirective(context.contentPackets));
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
    'Generate escalating setpieces and assess causal integrity for each concept below. Each concept includes its signature scenario from the specificity analysis.',
    `CONCEPTS WITH SPECIFICITY CONTEXT:\n${buildUserPayload(context, specificityAnalyses)}`,
    kernelSection,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scenarioAnalyses": ConceptScenarioAnalysis[] }.
- scenarioAnalyses array must have exactly ${context.evaluatedConcepts.length} items, one per input concept.
- Each analysis must include:
  - conceptId: string (must match exactly one provided input conceptId)
  - escalatingSetpieces: string[] (exactly 6 concept-unique situations in rising intensity)
  - setpieceCausalChainBroken: boolean (true iff causal chain between setpieces is weak/broken)
  - setpieceCausalLinks: string[] (exactly 5 causal links: 1->2, 2->3, 3->4, 4->5, 5->6)
  - conceptIntegrityScore: number 0-100 (how many of the 6 setpieces are truly concept-unique; 100 = all 6 are impossible in any other story)
- Every input conceptId must appear exactly once in the output. No duplicates, no omissions, no unknown IDs.
- All text fields must be non-empty.
- Each escalatingSetpieces array must contain exactly 6 strings.
- Each setpieceCausalLinks array must contain exactly 5 non-empty strings.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
