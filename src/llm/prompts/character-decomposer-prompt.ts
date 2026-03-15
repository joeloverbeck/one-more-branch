import { CONTENT_POLICY } from '../content-policy.js';
import { AGENCY_PRINCIPLES, SPEECH_EXTRACTION_BULLETS } from '../entity-decomposition-contract.js';
import type { ChatMessage } from '../llm-client-types.js';

function formatBullets(lines: readonly string[], indent = '   - '): string {
  return lines.map((line) => `${indent}${line}`).join('\n');
}

const CHARACTER_DECOMPOSER_SYSTEM_PROMPT = `You are a Character Decomposer for an interactive branching story engine. Your job is to convert a single raw character description into a structured, machine-friendly attribute object.

${CONTENT_POLICY}

You are decomposing ONE character in isolation — no story context, no other characters. Focus entirely on extracting the richest possible profile from the provided description.

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. The character must be identifiable by voice alone without dialogue attribution. Extract or infer:
${formatBullets(SPEECH_EXTRACTION_BULLETS)}

2. TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels. These should be the traits that most influence behavior and dialogue.

3. KNOWLEDGE BOUNDARIES: Explicitly state what this character knows and does NOT know. This prevents information leaking between characters during generation.

4. FALSE BELIEFS: Identify things this character sincerely believes that are WRONG. These are genuine misconceptions that should influence their reasoning and dialogue. Empty array if none.

5. SECRETS KEPT: Identify things this character knows but actively conceals from others. Empty array if none.

6. PRESERVE NUANCE: Do not flatten complex characters into stereotypes. If the description contains contradictions or complexity, preserve that in the decomposition.

7. INFER MISSING DETAILS: If the raw description implies speech patterns but doesn't state them explicitly, INFER them from the character's background, personality, and social context. A grizzled sailor speaks differently from a court diplomat.

8. ${AGENCY_PRINCIPLES[0]}

9. ${AGENCY_PRINCIPLES[1]}

10. ${AGENCY_PRINCIPLES[2]}

11. DEEP PSYCHOLOGY: Extract the character's moral line (what they will never cross), worst fear (identity-level devastation), formative wound (defining early experience), and misbelief (the false worldview conclusion drawn from their wound — distinct from factual false beliefs).

12. STRESS VARIANTS: Describe how the character's voice and behavior shift under five conditions: underThreat, inIntimacy, whenLying, whenAshamed, whenWinning. These are essential for authentic voice modulation in dramatic scenes.

13. FOCALIZATION FILTER: Identify what this character notices first, systematically misses, and misreads. null if there is not enough information to determine this.

14. ESCALATION LADDER: List 3-5 ordered steps showing how this character escalates when blocked, from mildest response to most extreme.

15. IMMEDIATE OBJECTIVES: Extract 2-5 concrete, time-bound tactical goals the character is actively pursuing. These are NOT the super-objective — they are specific, actionable targets that drive scene-level behavior.

16. CONSTRAINTS: Identify 2-4 external limitations that restrict what this character can do. These create dramatic tension by defining boundaries the character must work within or around.

17. DESIRES: Extract 3-6 granular wants beyond the super-objective. Each desire should be concrete enough to generate a story beat or scene conflict on its own.

18. CURRENT INTENTIONS: Identify 2-4 active plans this character is executing or about to execute. These represent what the character would DO in the next scene they appear in.

19. SOCIOLOGY: Ground the character in material reality — class, family structure, economic circumstances, and social world. This prevents characters from floating in psychological abstraction without social context.`;

export interface CharacterDecomposerPromptContext {
  readonly characterName: string;
  readonly characterDescription: string;
}

export function buildCharacterDecomposerPrompt(
  context: CharacterDecomposerPromptContext
): ChatMessage[] {
  const userPrompt = `Decompose the following character description into a structured attribute object.

CHARACTER NAME: ${context.characterName}

CHARACTER DESCRIPTION:
${context.characterDescription}

INSTRUCTIONS:
1. Extract or infer a complete speech fingerprint — this is the most important output
2. Every field must reflect the character's unique identity — no generic filler
3. For decision patterns and core beliefs: if not explicit, infer from behavior, background, and personality
4. Core beliefs should read like statements the character would actually think or say
5. For false beliefs: identify sincere misconceptions from character background and context
6. For secrets: identify truths the character actively hides from others
7. If the description is sparse, INFER richly from what is implied — background, social class, occupation, and personality all shape speech, beliefs, and behavior
8. superObjective: Identify the single deepest dramatic drive — what this character would pursue even at great personal cost
9. stakes: List 2-4 concrete things the character stands to lose or gain
10. pressurePoint: Identify the one vulnerability that could force this character to act against their own interest
11. personalDilemmas: Identify 1-3 competing loyalties or values that create genuine internal conflict
12. emotionSalience: Assess how emotionally expressive this character is (LOW/MEDIUM/HIGH). null if uncertain
13. moralLine: Identify the line this character will not cross, regardless of the stakes
14. worstFear: What would psychologically destroy this character — not physical danger, but identity-level devastation
15. formativeWound: The defining early experience that shaped this character's defenses and worldview
16. misbelief: The false conclusion drawn from their wound that distorts how they see the world (distinct from falseBeliefs which are factual misconceptions)
17. stressVariants: How the character's voice and behavior shift under five conditions: underThreat, inIntimacy, whenLying, whenAshamed, whenWinning
18. focalizationFilter: What the character notices first, systematically misses, and misreads. null if uncertain
19. escalationLadder: 3-5 ordered steps showing how this character escalates when blocked, from mildest to most extreme
20. immediateObjectives: 2-5 concrete tactical goals the character is actively pursuing right now — specific and time-bound, not abstract
21. constraints: 2-4 external limitations on what the character can do — physical, social, economic, or political barriers
22. desires: 3-6 concrete wants beyond the super-objective — each specific enough to drive a scene
23. currentIntentions: 2-4 active plans the character is executing — what they would DO in the next scene
24. sociology: The character's social position — class, family, economic situation, social world. 2-4 sentences grounding them in material reality`;

  return [
    { role: 'system', content: CHARACTER_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
