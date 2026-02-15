import type { Npc } from '../../models/npc.js';
import { formatNpcsForPrompt } from '../../models/npc.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import { buildToneBlock } from './sections/shared/tone-block.js';

export interface SpinePromptContext {
  characterConcept: string;
  worldbuilding: string;
  tone: string;
  npcs?: readonly Npc[];
  startingSituation?: string;
}

const SPINE_ROLE_INTRO = `You are a story architect designing the thematic spine of interactive branching fiction. Your job is to identify the invariant causal chain and thematic logic that will anchor the entire story — the dramatic question, the protagonist's inner transformation, and the force that opposes them.`;

const SPINE_DESIGN_GUIDELINES = `SPINE DESIGN GUIDELINES:
- The central dramatic question must be a single, specific question that the story exists to answer. Not a theme statement — a question with stakes.
- The protagonist's need (inner transformation) and want (outer goal) must create productive tension. The need is what they must learn or become; the want is what they consciously pursue.
- The antagonistic force is NOT necessarily a villain. It can be a system, an environment, an internal flaw, a social pressure, or fate itself. What matters is that it creates difficult choices that widen the gap between need and want.
- The pressure mechanism explains HOW the antagonistic force creates those difficult choices — the specific way it forces the protagonist to choose between need and want.
- Each option must feel like a genuinely different story, not a cosmetic variation.`;

export function buildSpinePrompt(context: SpinePromptContext): ChatMessage[] {
  const systemSections: string[] = [SPINE_ROLE_INTRO];

  if (context.tone) {
    systemSections.push(buildToneBlock(context.tone));
  }

  systemSections.push(CONTENT_POLICY);
  systemSections.push(SPINE_DESIGN_GUIDELINES);

  const worldSection = context.worldbuilding
    ? `WORLDBUILDING:\n${context.worldbuilding}\n\n`
    : '';

  const npcsSection =
    context.npcs && context.npcs.length > 0
      ? `NPCS (Available Characters):\n${formatNpcsForPrompt(context.npcs)}\n\n`
      : '';

  const startingSituationSection = context.startingSituation
    ? `STARTING SITUATION:\n${context.startingSituation}\n\n`
    : '';

  const userPrompt = `Generate exactly 3 story spine options for the following story setup.

CHARACTER CONCEPT:
${context.characterConcept}

${worldSection}${npcsSection}${startingSituationSection}TONE/GENRE: ${context.tone}

DIVERGENCE CONSTRAINT:
Generate exactly 3 spine options. Each MUST differ in at least one of:
- storySpineType (primary narrative pattern)
- conflictType (primary source of opposition)
Do NOT generate options sharing both the same storySpineType AND conflictType.

FIELD INSTRUCTIONS:
- centralDramaticQuestion: A single sentence ending with a question mark. Specific to THIS character and world, not generic. Bad: "Will good triumph over evil?" Good: "Can a disgraced guard expose the tribunal that framed her before they execute her as a scapegoat?"
- protagonistNeedVsWant.need: The inner transformation — what they must learn, accept, or become. One sentence.
- protagonistNeedVsWant.want: The outer goal — what they consciously pursue. One sentence.
- protagonistNeedVsWant.dynamic: How need and want relate (CONVERGENT, DIVERGENT, SUBSTITUTIVE, IRRECONCILABLE).
- primaryAntagonisticForce.description: What opposes the protagonist. Can be a person, system, environment, or internal force. One sentence.
- primaryAntagonisticForce.pressureMechanism: HOW it creates difficult choices that widen the need-want gap. One sentence.
- storySpineType: The primary narrative pattern (QUEST, SURVIVAL, ESCAPE, REVENGE, RESCUE, RIVALRY, MYSTERY, TEMPTATION, TRANSFORMATION, FORBIDDEN_LOVE, SACRIFICE, FALL_FROM_GRACE, RISE_TO_POWER, COMING_OF_AGE, REBELLION).
- conflictType: The primary source of opposition (PERSON_VS_PERSON, PERSON_VS_SELF, PERSON_VS_SOCIETY, PERSON_VS_NATURE, PERSON_VS_TECHNOLOGY, PERSON_VS_SUPERNATURAL, PERSON_VS_FATE).
- characterArcType: The character arc trajectory (POSITIVE_CHANGE, FLAT, DISILLUSIONMENT, FALL, CORRUPTION).
- toneKeywords: 3-5 words capturing the target feel of the tone. These should be evocative adjectives or style words that downstream writers can use as a compass (e.g., ["irreverent", "bawdy", "slapstick", "warm-hearted"] for a comedic tone, or ["claustrophobic", "dread", "visceral", "bleak"] for horror).
- toneAntiKeywords: 3-5 words the tone should actively avoid. These define the negative space — what the story must NOT become (e.g., ["grimdark", "portentous", "tragic"] for a comedy, or ["whimsical", "lighthearted", "playful"] for horror).

OUTPUT SHAPE:
- options: array of exactly 3 spine objects, each containing all fields above`;

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userPrompt },
  ];
}
