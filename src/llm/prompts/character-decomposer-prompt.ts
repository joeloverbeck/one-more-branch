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

10. ${AGENCY_PRINCIPLES[2]}`;

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
7. If the description is sparse, INFER richly from what is implied — background, social class, occupation, and personality all shape speech, beliefs, and behavior`;

  return [
    { role: 'system', content: CHARACTER_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
