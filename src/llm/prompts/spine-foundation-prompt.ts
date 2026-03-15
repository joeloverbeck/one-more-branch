import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneDirective } from './sections/shared/tone-block.js';
import { buildWorldSectionForSpine } from './sections/shared/worldbuilding-sections.js';
import type { SpinePromptContext } from './spine-prompt.js';
import { formatStandaloneCharacterSummary } from '../../models/standalone-decomposed-character.js';
import { formatNpcsForPrompt } from '../../models/npc.js';

const FOUNDATION_ROLE_INTRO = `You are a story architect specializing in thematic foundation design for interactive branching fiction. Your task is to generate 5-6 DIVERGENT thematic foundations — the bedrock choices (conflict axis, character arc trajectory, protagonist's deepest fear, and tonal direction) that will anchor the entire story.

You work at the THEMATIC level only. You do NOT determine plot patterns, opposition sources, need/want, antagonistic forces, or dramatic questions — those come in later stages. Your job is to establish the emotional and philosophical DNA of the story.`;

const FOUNDATION_DESIGN_GUIDELINES = `FOUNDATION DESIGN GUIDELINES:
- conflictAxis: THE root thematic choice. It determines the philosophical tension that permeates every scene.
- characterArcType: The trajectory of transformation. POSITIVE_CHANGE (grows), FLAT (tests existing belief), DISILLUSIONMENT (learns hard truth), FALL (loses way), CORRUPTION (becomes what they opposed).
- protagonistDeepestFear: Following Truby's backward-design principle, start with the fear. This is the emotional engine — it determines WHY the character resists change and shapes everything downstream (need, want, antagonistic force).
- toneFeel: 3-5 atmospheric adjectives describing HOW the story FEELS — sensory, emotional, rhythmic qualities. Do NOT repeat genre labels.
- toneAvoid: 3-5 tonal anti-patterns the story must never drift toward.
- thematicPremise: An Egri-style one-line premise (e.g., "Ruthless ambition leads to self-destruction"). This guides later stages but is NOT stored on the final spine.`;

function buildConceptConstraints(context: SpinePromptContext): string {
  if (!context.conceptSpec) {
    return '';
  }

  const cs = context.conceptSpec;
  const lines: string[] = [
    'CONCEPT ANALYSIS (from upstream concept generation — use as grounding):',
    '',
    'NARRATIVE IDENTITY:',
    `One-line hook: ${cs.oneLineHook}`,
    `Player fantasy: ${cs.playerFantasy}`,
    `What-if question: ${cs.whatIfQuestion}`,
    `Ironic twist: ${cs.ironicTwist}`,
    '',
    'PROTAGONIST:',
    `Role: ${cs.protagonistRole}`,
    `Core competence: ${cs.coreCompetence}`,
    `Core flaw: ${cs.coreFlaw}`,
    '',
    'CONFLICT ENGINE:',
    `Core conflict loop: ${cs.coreConflictLoop}`,
    `Thematic tension axis: ${cs.conflictAxis} — ALL foundations MUST use this exact conflictAxis value.`,
    `Pressure source: ${cs.pressureSource}`,
    `Personal stakes: ${cs.stakesPersonal}`,
    `Systemic stakes: ${cs.stakesSystemic}`,
    '',
    'PROTAGONIST ARC GROUNDING:',
    `Protagonist's ghost (backstory wound): ${cs.protagonistGhost}`,
    'CONSTRAINT: The protagonistDeepestFear should connect to the ghost — the wound that makes letting go of the lie terrifying.',
  ];

  return lines.join('\n') + '\n\n';
}

function buildKernelGrounding(context: SpinePromptContext): string {
  if (!context.storyKernel) {
    return '';
  }

  const k = context.storyKernel;
  const lines: string[] = [
    'THEMATIC KERNEL (the spine\'s philosophical foundation):',
    `Dramatic thesis: ${k.dramaticThesis}`,
    `Antithesis: ${k.antithesis}`,
    `Value at stake: ${k.valueAtStake}`,
    `Direction of change: ${k.directionOfChange}`,
    `Conflict axis: ${k.conflictAxis}`,
    `Dramatic stance: ${k.dramaticStance}`,
    `Thematic question: ${k.thematicQuestion}`,
    '',
    'CONSTRAINT: The thematicPremise should operationalize the kernel\'s dramaticThesis.',
    'When kernel specifies conflictAxis, ALL foundations MUST use that exact value.',
  ];

  return lines.join('\n') + '\n\n';
}

function buildContentPreferences(context: SpinePromptContext): string {
  if (!context.contentPreferences || context.contentPreferences.trim().length === 0) {
    return '';
  }

  return `CONTENT PREFERENCES (user creative direction — incorporate into foundation design):\n${context.contentPreferences.trim()}\n\n`;
}

export function buildSpineFoundationPrompt(context: SpinePromptContext): ChatMessage[] {
  const systemSections: string[] = [FOUNDATION_ROLE_INTRO];

  if (context.tone) {
    systemSections.push(buildToneDirective(context.tone));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(FOUNDATION_DESIGN_GUIDELINES);

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

  const conceptSection = buildConceptConstraints(context);
  const kernelSection = buildKernelGrounding(context);
  const contentPreferencesSection = buildContentPreferences(context);

  const lockedConflictAxis = context.conceptSpec?.conflictAxis ?? context.storyKernel?.conflictAxis;
  const conflictAxisConstraint = lockedConflictAxis
    ? `\nCONFLICT AXIS LOCK: All foundations MUST use conflictAxis "${lockedConflictAxis}". Diverge on ALL other fields instead.`
    : '';

  const userPrompt = `Generate 5-6 thematic foundations for the following story setup.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${startingSituationSection}${contentPreferencesSection}${conceptSection}${kernelSection}TONE/GENRE: ${context.tone}
${conflictAxisConstraint}

DIVERGENCE CONSTRAINTS:
- Generate 5-6 foundations (prefer 6).
- Minimum 4 distinct conflictAxis values across all foundations (unless locked by concept/kernel).
- Minimum 3 distinct characterArcType values across all foundations.
- No two foundations may share BOTH the same conflictAxis AND characterArcType.
- Each foundation must feel like the seed of a genuinely different story direction.

FIELD INSTRUCTIONS:
- conflictAxis: The thematic tension axis (INDIVIDUAL_VS_SYSTEM, TRUTH_VS_STABILITY, DUTY_VS_DESIRE, FREEDOM_VS_SAFETY, KNOWLEDGE_VS_INNOCENCE, POWER_VS_MORALITY, LOYALTY_VS_SURVIVAL, IDENTITY_VS_BELONGING, JUSTICE_VS_MERCY, PROGRESS_VS_TRADITION).
- characterArcType: The character arc trajectory (POSITIVE_CHANGE, FLAT, DISILLUSIONMENT, FALL, CORRUPTION).
- protagonistDeepestFear: The fear that drives the protagonist to resist transformation. Following Truby's backward-design: start here, everything else follows. One sentence specific to THIS character.
- toneFeel: 3-5 atmospheric adjectives. NOT genre labels. Ask: "If I were inside this story, what would I feel on my skin, in my gut, in my pulse?"
- toneAvoid: 3-5 tonal anti-patterns the story must NEVER drift toward.
- thematicPremise: Egri-style one-line premise (e.g., "Ruthless ambition leads to self-destruction"). When a kernel exists, operationalize its dramaticThesis.

OUTPUT SHAPE:
- foundations: array of 5-6 foundation objects, each containing all fields above`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}
