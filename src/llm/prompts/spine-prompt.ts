import type { ConceptSpec } from '../../models/concept-generator.js';
import type { ConceptVerification } from '../../models/concept-generator.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import type { Npc } from '../../models/npc.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import type { StandaloneDecomposedCharacter } from '../../models/standalone-decomposed-character.js';
import { formatStandaloneCharacterSummary } from '../../models/standalone-decomposed-character.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildWorldSectionForSpine } from './sections/shared/worldbuilding-sections.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

export interface SpinePromptContext {
  characterConcept: string;
  worldbuilding?: string;
  decomposedWorld?: DecomposedWorld;
  tone: string;
  npcs?: readonly Npc[];
  decomposedCharacters?: readonly StandaloneDecomposedCharacter[];
  startingSituation?: string;
  conceptSpec?: ConceptSpec;
  storyKernel?: StoryKernel;
  conceptVerification?: ConceptVerification;
  contentPreferences?: string;
}

const SPINE_ROLE_INTRO = `You are a story architect designing the thematic spine of interactive branching fiction. Your job is to identify the invariant causal chain and thematic logic that will anchor the entire story — the dramatic question, the protagonist's inner transformation, and the force that opposes them.`;

const SPINE_DESIGN_GUIDELINES = `SPINE DESIGN GUIDELINES:
- The central dramatic question must be a single, specific question that the story exists to answer. Not a theme statement — a question with stakes.
- The protagonist's need (inner transformation) and want (outer goal) must create productive tension. The need is what they must learn or become; the want is what they consciously pursue.
- The antagonistic force is NOT necessarily a villain. It can be a system, an environment, an internal flaw, a social pressure, or fate itself. What matters is that it creates difficult choices that widen the gap between need and want.
- The pressure mechanism explains HOW the antagonistic force creates those difficult choices — the specific way it forces the protagonist to choose between need and want.
- Each option must feel like a genuinely different story, not a cosmetic variation.`;

function buildConceptAnalysisSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const settingAxioms = conceptSpec.settingAxioms.join('; ');
  const constraintSet = conceptSpec.constraintSet.join('; ');
  const keyInstitutions = conceptSpec.keyInstitutions.join('; ');

  const lines: string[] = [
    'CONCEPT ANALYSIS (from upstream concept generation — use as grounding):',
    '',
    'NARRATIVE IDENTITY:',
    `One-line hook: ${conceptSpec.oneLineHook}`,
    `Elevator pitch: ${conceptSpec.elevatorParagraph}`,
    `Player fantasy: ${conceptSpec.playerFantasy}`,
    `What-if question: ${conceptSpec.whatIfQuestion}`,
    `Ironic twist: ${conceptSpec.ironicTwist}`,
    '',
    'PROTAGONIST:',
    `Role: ${conceptSpec.protagonistRole}`,
    `Core competence: ${conceptSpec.coreCompetence}`,
    `Core flaw: ${conceptSpec.coreFlaw}`,
    `Action verbs: ${conceptSpec.actionVerbs.join(', ')}`,
    '',
    'GENRE FRAME:',
    `Genre: ${conceptSpec.genreFrame} (Subversion: ${conceptSpec.genreSubversion})`,
    '',
    'CONFLICT ENGINE:',
    `Core conflict loop: ${conceptSpec.coreConflictLoop}`,
    `Thematic tension axis: ${conceptSpec.conflictAxis} — MUST use this exact value.`,
    `Structural opposition: ${conceptSpec.conflictType} — MUST use this exact value.`,
    `Pressure source: ${conceptSpec.pressureSource}`,
    `Personal stakes: ${conceptSpec.stakesPersonal}`,
    `Systemic stakes: ${conceptSpec.stakesSystemic}`,
    `Deadline mechanism: ${conceptSpec.deadlineMechanism}`,
    '',
    'WORLD ARCHITECTURE:',
    `Setting axioms: ${settingAxioms}`,
    `Constraints: ${constraintSet}`,
    `Key institutions: ${keyInstitutions}`,
    `Setting scale: ${conceptSpec.settingScale}`,
    '',
    'PROTAGONIST ARC GROUNDING:',
    `Protagonist's lie (false belief): ${conceptSpec.protagonistLie}`,
    `Protagonist's truth (lesson to learn): ${conceptSpec.protagonistTruth}`,
    `Protagonist's ghost (backstory wound): ${conceptSpec.protagonistGhost}`,
    `Want/need collision sketch: ${conceptSpec.wantNeedCollisionSketch}`,
    '',
    'CONSTRAINT: Your spine must be CONSISTENT with this concept analysis. The concept defines the "what" — your spine defines the "how". Build on the concept\'s conflict loop and stakes; don\'t contradict them.',
    'The protagonistNeedVsWant must align with the lie/truth arc — the "want" should be driven by the lie, the "need" by the truth.',
    'The wantNeedCollisionPoint must operationalize the collision sketch — the specific moment where the want blocks the need.',
    'The protagonistDeepestFear should connect to the ghost — the wound that makes letting go of the lie terrifying.',
  ];

  return lines.join('\n') + '\n\n';
}

function buildKernelGroundingSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  const lines: string[] = [
    'THEMATIC KERNEL (the spine\'s philosophical foundation):',
    `Dramatic thesis: ${storyKernel.dramaticThesis}`,
    `Antithesis: ${storyKernel.antithesis}`,
    `Value at stake: ${storyKernel.valueAtStake}`,
    `Opposing force: ${storyKernel.opposingForce}`,
    `Direction of change: ${storyKernel.directionOfChange}`,
    `Conflict axis: ${storyKernel.conflictAxis}`,
    `Dramatic stance: ${storyKernel.dramaticStance}`,
    `Thematic question: ${storyKernel.thematicQuestion}`,
    `Moral argument: ${storyKernel.moralArgument}`,
    '',
    'VALUE SPECTRUM (McKee value charge ladder):',
    `Positive: ${storyKernel.valueSpectrum.positive}`,
    `Contrary: ${storyKernel.valueSpectrum.contrary}`,
    `Contradictory: ${storyKernel.valueSpectrum.contradictory}`,
    `Negation of negation: ${storyKernel.valueSpectrum.negationOfNegation}`,
    '',
    'CONSTRAINT: The spine\'s central dramatic question should operationalize this kernel.',
    'The kernel defines the thematic "why" — the spine defines the structural "how".',
    'The antagonistic force\'s pressure mechanism should push the value toward the contradictory or negation-of-negation levels.',
  ];

  return lines.join('\n') + '\n\n';
}

function buildContentPreferencesSection(contentPreferences?: string): string {
  if (!contentPreferences || contentPreferences.trim().length === 0) {
    return '';
  }

  return `CONTENT PREFERENCES (user creative direction — incorporate into spine design):\n${contentPreferences.trim()}\n\n`;
}

function buildConceptVerificationSection(verification?: ConceptVerification): string {
  if (!verification) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT VERIFICATION (upstream proof of concept specificity):',
    `Signature scenario: ${verification.signatureScenario}`,
    `Narrative inevitability: ${verification.inevitabilityStatement}`,
    '',
    'CONSTRAINT: Your centralDramaticQuestion should make the signature scenario',
    'inevitable — this is the most iconic decision moment the concept enables.',
    'The dramatic question should steer toward it, not away from it.',
    "The antagonistic force's pressure mechanism should logically produce the conditions",
    'described in the inevitability statement — the force is what makes this outcome inescapable.',
  ];

  return lines.join('\n') + '\n\n';
}

export function buildSpinePrompt(context: SpinePromptContext): ChatMessage[] {
  const systemSections: string[] = [SPINE_ROLE_INTRO];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(SPINE_DESIGN_GUIDELINES);

  const worldSection = context.decomposedWorld
    ? `${buildWorldSectionForSpine(context.decomposedWorld)}\n\n`
    : context.worldbuilding
      ? `WORLDBUILDING:\n${context.worldbuilding}\n\n`
      : '';

  const npcsSection =
    context.decomposedCharacters && context.decomposedCharacters.length > 0
      ? `CHARACTERS (Pre-Decomposed Profiles):\n${context.decomposedCharacters.map(formatStandaloneCharacterSummary).join('\n\n')}\n\n`
      : context.npcs && context.npcs.length > 0
        ? `NPCS (Available Characters):\n${formatNpcsForPrompt(context.npcs)}\n\n`
        : '';

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:\n${context.startingSituation}\n\n`
    : '';

  const contentPreferencesSection = buildContentPreferencesSection(context.contentPreferences);
  const conceptSection = buildConceptAnalysisSection(context.conceptSpec);
  const kernelSection = buildKernelGroundingSection(context.storyKernel);
  const verificationSection = buildConceptVerificationSection(context.conceptVerification);

  const userPrompt = `Generate exactly 3 story spine options for the following story setup.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${startingSituationSection}${contentPreferencesSection}${conceptSection}${kernelSection}${verificationSection}TONE/GENRE: ${context.tone}

DIVERGENCE CONSTRAINT:
Generate exactly 3 spine options. Each MUST differ in at least one of:
- storySpineType (primary narrative pattern)
- conflictType (primary source of opposition)
Do NOT generate options sharing both the same storySpineType AND conflictType.
Each option must represent a genuinely different story direction, not a cosmetic variant.
Across the 3 options, each option must differ from every other option in at least TWO of:
- protagonistNeedVsWant.dynamic (need/want relationship)
- primaryAntagonisticForce.description (nature of opposition)
- primaryAntagonisticForce.pressureMechanism (how pressure is applied)
- centralDramaticQuestion (core story question framing)

FIELD INSTRUCTIONS:
- centralDramaticQuestion: A single sentence ending with a question mark. Specific to THIS character and world, not generic. Bad: "Will good triumph over evil?" Good: "Can a disgraced guard expose the tribunal that framed her before they execute her as a scapegoat?"
- protagonistNeedVsWant.need: The inner transformation — what they must learn, accept, or become. One sentence.
- protagonistNeedVsWant.want: The outer goal — what they consciously pursue. One sentence.
- protagonistNeedVsWant.dynamic: How need and want relate (CONVERGENT, DIVERGENT, SUBSTITUTIVE, IRRECONCILABLE).
- primaryAntagonisticForce.description: What opposes the protagonist. Can be a person, system, environment, or internal force. One sentence.
- primaryAntagonisticForce.pressureMechanism: HOW it creates difficult choices that widen the need-want gap. One sentence.
- storySpineType: The primary narrative pattern (QUEST, SURVIVAL, ESCAPE, REVENGE, RESCUE, RIVALRY, MYSTERY, TEMPTATION, TRANSFORMATION, FORBIDDEN_LOVE, SACRIFICE, FALL_FROM_GRACE, RISE_TO_POWER, COMING_OF_AGE, REBELLION).
- conflictAxis: The thematic tension axis (INDIVIDUAL_VS_SYSTEM, TRUTH_VS_STABILITY, DUTY_VS_DESIRE, FREEDOM_VS_SAFETY, KNOWLEDGE_VS_INNOCENCE, POWER_VS_MORALITY, LOYALTY_VS_SURVIVAL, IDENTITY_VS_BELONGING).
- conflictType: The primary source of opposition (PERSON_VS_PERSON, PERSON_VS_SELF, PERSON_VS_SOCIETY, PERSON_VS_NATURE, PERSON_VS_TECHNOLOGY, PERSON_VS_SUPERNATURAL, PERSON_VS_FATE).
- characterArcType: The character arc trajectory (POSITIVE_CHANGE, FLAT, DISILLUSIONMENT, FALL, CORRUPTION).
- toneFeel: 3-5 atmospheric adjectives describing HOW the story FEELS to the reader -- sensory, emotional, and rhythmic qualities. A compass for downstream writers.
  CRITICAL: Do NOT repeat or rephrase genre/tone labels from the TONE/GENRE field. Instead, DERIVE the experiential qualities that emerge from that genre.
  Ask: "If I were inside this story, what would I feel on my skin, in my gut, in my pulse?"
  BAD for "grim political fantasy": ["grim", "political", "dark", "serious"]
  GOOD for "grim political fantasy": ["claustrophobic", "treacherous", "morally-grey", "ash-scented", "hushed"]
  BAD for "comedic heist": ["comedic", "funny", "heist", "lighthearted"]
  GOOD for "comedic heist": ["snappy", "irreverent", "nerve-jangling", "winking", "kinetic"]
- toneAvoid: 3-5 tonal anti-patterns the story must never drift toward. These define the negative space -- what the story must NOT become.
  Example for "grim political fantasy": ["whimsical", "slapstick", "heartwarming", "campy"]
  Example for "comedic heist": ["grimdark", "portentous", "plodding", "nihilistic"]
- wantNeedCollisionPoint: The specific moment or condition where pursuing the want actively blocks the need. One sentence. Example: "When she finally earns the tribunal's trust, she realizes the information she needs can only come from betraying it."
- protagonistDeepestFear: The fear that drives the protagonist to cling to their want instead of facing their need. One sentence. Example: "She fears that without the tribunal's validation, her father's execution was meaningless."

OUTPUT SHAPE:
- options: array of exactly 3 spine objects, each containing all fields above`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}
