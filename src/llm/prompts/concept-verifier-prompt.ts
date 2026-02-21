import type { ConceptVerifierContext } from '../../models/concept-generator.js';
import type { ChatMessage } from '../llm-client-types.js';

const ROLE_INTRO =
  'You are a concept integrity analyst for interactive branching fiction. Your job is to prove whether each concept is genuinely specific and load-bearing, or a dressed-up genre template.';

const VERIFICATION_DIRECTIVES = `VERIFICATION DIRECTIVES:
- Do not praise concepts. Probe their specificity.
- For each concept, produce evidence that the concept is irreducibly unique — or expose that it collapses into genre.
- All scenarios and setpieces must be ONLY possible because of this specific concept's differentiator (genreSubversion + coreFlaw + coreConflictLoop). If a scenario could appear in a generic story of the same genre, reject it and write one that couldn't.
- The signature scenario must describe the single most iconic interactive decision moment — where the player's choice ONLY exists because of this concept's differentiator.
- The 6 escalating setpieces must form a rising intensity arc from opening hook to climax. Each must be concept-unique.
- The inevitability statement captures what kind of story MUST happen given this premise — not what could happen, but what is forced by internal logic.
- The load-bearing check is a negative test: remove the core differentiator and determine whether the story collapses into generic genre.`;

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
    playerFantasy: evaluated.concept.playerFantasy,
    strengths: evaluated.strengths,
    weaknesses: evaluated.weaknesses,
  }));

  return JSON.stringify(conceptInputs, null, 2);
}

export function buildConceptVerifierPrompt(context: ConceptVerifierContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, VERIFICATION_DIRECTIVES];

  const userSections: string[] = [
    'Verify the specificity and load-bearing integrity of each evaluated concept below.',
    `EVALUATED CONCEPTS INPUT:\n${buildUserPayload(context)}`,
    `OUTPUT REQUIREMENTS:
- Return JSON with shape: { "verifications": ConceptVerification[] }.
- verifications array must have exactly ${context.evaluatedConcepts.length} items, one per input concept, in the same order.
- Each verification must include:
  - signatureScenario: string (the single most iconic interactive decision moment unique to this concept)
  - escalatingSetpieces: string[] (exactly 6 concept-unique situations in rising intensity)
  - inevitabilityStatement: string (what kind of story MUST happen given the premise's internal logic)
  - loadBearingCheck: { passes: boolean, reasoning: string, genericCollapse: string }
    - passes: true if the concept is genuinely load-bearing (removing differentiator DOES collapse it)
    - reasoning: explain what makes it unique or why it fails
    - genericCollapse: describe what the concept collapses INTO when its differentiator is removed
  - conceptIntegrityScore: number 0-100 (how many of the 6 setpieces are truly concept-unique; 100 = all 6 are impossible in any other story)
- All text fields must be non-empty.
- Each escalatingSetpieces array must contain exactly 6 strings.`,
  ];

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
