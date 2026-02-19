import type { ConceptSpec } from '../../models/concept-generator.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { StorySpine } from '../../models/story-spine.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { AGENCY_PRINCIPLES, SPEECH_EXTRACTION_BULLETS } from '../entity-decomposition-contract.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { EntityDecomposerContext } from '../entity-decomposer-types.js';
import { buildToneDirective } from './sections/shared/tone-block.js';

function formatBullets(lines: readonly string[], indent = '   - '): string {
  return lines.map((line) => `${indent}${line}`).join('\n');
}

function formatNumbered(start: number, lines: readonly string[]): string {
  return lines.map((line, index) => `${start + index}. ${line}`).join('\n\n');
}

const ENTITY_DECOMPOSER_SYSTEM_PROMPT = `You are an Entity Decomposer for an interactive branching story engine. Your job is to convert raw character descriptions and worldbuilding prose into structured, machine-friendly attribute objects.

${CONTENT_POLICY}

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. Each character must be identifiable by voice alone without dialogue attribution. Extract or infer:
${formatBullets(SPEECH_EXTRACTION_BULLETS)}

2. TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels. These should be the traits that most influence behavior and dialogue.

3. KNOWLEDGE BOUNDARIES: Explicitly state what each character knows and does NOT know. This prevents information leaking between characters during generation.

4. FALSE BELIEFS: Identify things each character sincerely believes that are WRONG. These are genuine misconceptions that should influence their reasoning and dialogue. A character who falsely believes the king is alive will act on that belief. Empty array if none.

5. SECRETS KEPT: Identify things each character knows but actively conceals from others. A character hiding their noble birth will steer conversations away from lineage. Empty array if none.

6. PROTAGONIST RELATIONSHIP: For each NPC, produce a structured protagonistRelationship object describing the NPC's relationship WITH THE PROTAGONIST ONLY. Include valence (-5 hostile to +5 devoted), a dynamic label (mentor, rival, ally, etc.), brief history, current tension, and leverage. The protagonist's own entry MUST have protagonistRelationship: null.

7. WORLDBUILDING ATOMIZATION: Break worldbuilding prose into atomic facts with domain tags, scope annotations, and epistemic status (factType). Each fact should be a single, self-contained proposition.
   Available domains: geography (terrain, locations, climate), ecology (flora, fauna, agriculture), history (past events, eras), society (social structure, class, family), culture (customs, traditions, arts, daily life, education), religion (faiths, mythology, cosmology), governance (government, law, politics, military), economy (commerce, professions, labor, wealth), faction (organizations, guilds, alliances), technology (inventions, infrastructure, medicine), magic (supernatural systems, spells), language (languages, dialects, scripts).
   Epistemic status (factType) for each fact:
   - LAW: Fundamental world truths that simply ARE (magic rules, physics, cosmology). E.g. "Iron disrupts magical fields."
   - NORM: Cultural or regional standard practices. E.g. "Merchants bow before entering the Exchange."
   - BELIEF: Held as true by specific groups but may or may not be objectively true. Embed the holder in the fact text. E.g. "The northern clans believe the old gods sleep beneath the ice."
   - DISPUTED: Multiple contradictory versions exist. E.g. "Historians disagree whether the Sundering was caused by divine wrath or arcane experimentation."
   - RUMOR: Unverified hearsay circulating in the world. E.g. "Tavern talk claims the duke poisoned his brother."
   - MYSTERY: Intentionally unresolved unknowns. Preserve the unknown quality. E.g. "No one knows what lies beyond the Veil."

8. PRESERVE NUANCE: Do not flatten complex characters into stereotypes. If the description contains contradictions or complexity, preserve that in the decomposition.

9. INFER MISSING DETAILS: If the raw description implies speech patterns but doesn't state them explicitly, INFER them from the character's background, personality, and social context. A grizzled sailor speaks differently from a court diplomat.

${formatNumbered(10, AGENCY_PRINCIPLES)}`;

function buildSpineContextSection(spine?: StorySpine): string {
  if (!spine) {
    return '';
  }

  const lines: string[] = [
    'STORY SPINE (the narrative backbone — decompose characters in light of this):',
    `Central dramatic question: ${spine.centralDramaticQuestion}`,
    `Protagonist need: ${spine.protagonistNeedVsWant.need}`,
    `Protagonist want: ${spine.protagonistNeedVsWant.want}`,
    `Need-want dynamic: ${spine.protagonistNeedVsWant.dynamic}`,
    `Antagonistic force: ${spine.primaryAntagonisticForce.description}`,
    `Pressure mechanism: ${spine.primaryAntagonisticForce.pressureMechanism}`,
    `Character arc type: ${spine.characterArcType}`,
    '',
    'CONSTRAINT: Decompose characters so that the protagonist\'s core beliefs, decision patterns, and speech reflect the need-want tension. NPC traits should create friction with or support for the antagonistic force.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildConceptAnalysisSection(conceptSpec?: ConceptSpec): string {
  if (!conceptSpec) {
    return '';
  }

  const lines: string[] = [
    'CONCEPT ANALYSIS (use to ground character decomposition):',
    '',
    'NARRATIVE IDENTITY:',
    `One-line hook: ${conceptSpec.oneLineHook}`,
    `Elevator pitch: ${conceptSpec.elevatorParagraph}`,
    `Player fantasy: ${conceptSpec.playerFantasy}`,
    '',
    'PROTAGONIST:',
    `Role: ${conceptSpec.protagonistRole}`,
    `Core competence: ${conceptSpec.coreCompetence}`,
    `Core flaw: ${conceptSpec.coreFlaw}`,
    `Action verbs: ${conceptSpec.actionVerbs.join(', ')}`,
    '',
    'CONFLICT ENGINE:',
    `Core conflict loop: ${conceptSpec.coreConflictLoop}`,
    `Pressure source: ${conceptSpec.pressureSource}`,
    '',
    'WORLD ARCHITECTURE:',
    `Setting axioms: ${conceptSpec.settingAxioms.join('; ')}`,
    `Constraints: ${conceptSpec.constraintSet.join('; ')}`,
    `Key institutions: ${conceptSpec.keyInstitutions.join('; ')}`,
    '',
    'CONSTRAINT: Use protagonist fields to inform speech fingerprint and decision patterns. Use world architecture to scope worldbuilding atomization — facts should align with the setting axioms and constraints.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildKernelGroundingSection(storyKernel?: StoryKernel): string {
  if (!storyKernel) {
    return '';
  }

  const lines: string[] = [
    'THEMATIC KERNEL (philosophical foundation — let it shape character depth):',
    `Dramatic thesis: ${storyKernel.dramaticThesis}`,
    `Value at stake: ${storyKernel.valueAtStake}`,
    `Opposing force: ${storyKernel.opposingForce}`,
    `Direction of change: ${storyKernel.directionOfChange}`,
    `Thematic question: ${storyKernel.thematicQuestion}`,
    '',
    'CONSTRAINT: Protagonist core beliefs should reflect the value at stake. NPC false beliefs and secrets should tension with the thematic question.',
  ];

  return '\n\n' + lines.join('\n');
}

function buildStartingSituationSection(startingSituation?: string): string {
  if (!startingSituation) {
    return '';
  }

  const lines: string[] = [
    'STARTING SITUATION:',
    startingSituation,
    '',
    'CONSTRAINT: Ground the protagonist\'s initial knowledge boundaries and NPC relationship immediacy based on this opening scene context.',
  ];

  return '\n\n' + lines.join('\n');
}

export function buildEntityDecomposerPrompt(context: EntityDecomposerContext): ChatMessage[] {
  const npcsSection =
    context.npcs && context.npcs.length > 0
      ? `\n\nNPC DEFINITIONS:\n${formatNpcsForPrompt(context.npcs)}`
      : '';

  const worldSection = context.worldbuilding
    ? `\n\nWORLDBUILDING:\n${context.worldbuilding}`
    : '';

  const toneSection = context.tone
    ? `\n\n${buildToneDirective(context.tone, context.toneFeel, context.toneAvoid)}`
    : '';

  const spineSection = buildSpineContextSection(context.spine);
  const conceptSection = buildConceptAnalysisSection(context.conceptSpec);
  const kernelSection = buildKernelGroundingSection(context.storyKernel);
  const situationSection = buildStartingSituationSection(context.startingSituation);

  const userPrompt = `Decompose the following character descriptions and worldbuilding into structured attribute objects.

CHARACTER CONCEPT (protagonist):
${context.characterConcept}${npcsSection}${worldSection}${toneSection}${spineSection}${conceptSection}${kernelSection}${situationSection}

INSTRUCTIONS:
1. The FIRST character in the output array MUST be the protagonist (from CHARACTER CONCEPT)
2. Remaining characters follow in NPC definition order
3. For speech fingerprints: if the description explicitly describes how someone talks, use that. If not, INFER speech patterns from their personality, background, social class, and the story's tone/genre
4. For worldbuilding facts: decompose into atomic propositions. If no worldbuilding is provided, return an empty worldFacts array
5. Every character MUST have a distinct speech fingerprint - no two characters should sound alike
6. For decision patterns and core beliefs: if not explicit, infer from behavior, background, and relationship dynamics
7. Core beliefs should read like statements the character would actually think or say
8. The protagonist's protagonistRelationship MUST be null. Each NPC MUST have a non-null protagonistRelationship describing their relationship with the protagonist
9. For false beliefs: identify sincere misconceptions from character background and context
10. For secrets: identify truths the character actively hides from others`;

  return [
    { role: 'system', content: ENTITY_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
