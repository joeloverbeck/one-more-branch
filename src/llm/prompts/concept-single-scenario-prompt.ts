import type { EvaluatedConcept } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

interface SingleSpecificityResult {
  readonly signatureScenario: string;
}

const ROLE_INTRO =
  'You are a creative scenario architect for interactive branching fiction. Your job is to generate escalating setpieces that prove this concept can sustain a full story — or expose that it cannot. You work from a specificity analysis already performed on the concept.';

const SCENARIO_DIRECTIVES = `SCENARIO DIRECTIVES:
- All scenarios and setpieces must be ONLY possible because of this specific concept's premise — both its conflict engine (genreSubversion, coreFlaw, coreConflictLoop) and its world-specific elements (settingAxioms, constraintSet, keyInstitutions, deadlineMechanism, pressureSource, escapeValve). Each setpiece must exploit at least one world-specific element, not just the conflict engine. If a setpiece could appear in a generic story of the same genre with different world rules, reject it and write one that couldn't.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- setpiece causal chain test: analyze whether each setpiece outcome CAUSES the next setpiece setup. If links are weak or missing, set setpieceCausalChainBroken=true and still provide the strongest possible 5 causal links (between setpieces 1->2 through 5->6).
- The conceptIntegrityScore measures how many of the 6 setpieces are truly concept-unique (100 = all 6 are impossible in any other story).
- Anchor each setpiece to the signature scenario already identified in the specificity analysis. The setpieces should feel like they belong in the same story as that signature moment.`;

export function buildSingleConceptScenarioPrompt(
  evaluated: EvaluatedConcept,
  kernel: StoryKernel,
  specificityResult: SingleSpecificityResult,
): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, SCENARIO_DIRECTIVES];

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
    signatureScenario: specificityResult.signatureScenario,
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
    'Generate escalating setpieces and assess causal integrity for this concept. The concept includes its signature scenario from the specificity analysis.',
    `CONCEPT WITH SPECIFICITY CONTEXT:\n${JSON.stringify(conceptInput, null, 2)}`,
    kernelSection,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "scenarioAnalysis": { ... } }.
- scenarioAnalysis must include:
  - escalatingSetpieces: string[] (exactly 6 concept-unique situations in rising intensity)
  - setpieceCausalChainBroken: boolean (true iff causal chain between setpieces is weak/broken)
  - setpieceCausalLinks: string[] (exactly 5 causal links: 1->2, 2->3, 3->4, 4->5, 5->6)
  - conceptIntegrityScore: number 0-100 (how many of the 6 setpieces are truly concept-unique; 100 = all 6 are impossible in any other story)
- All text fields must be non-empty.
- escalatingSetpieces must contain exactly 6 strings.
- setpieceCausalLinks must contain exactly 5 non-empty strings.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
