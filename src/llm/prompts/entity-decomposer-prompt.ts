import { formatNpcsForPrompt } from '../../models/npc.js';
import { CONTENT_POLICY } from '../content-policy.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { EntityDecomposerContext } from '../entity-decomposer-types.js';

const ENTITY_DECOMPOSER_SYSTEM_PROMPT = `You are an Entity Decomposer for an interactive branching story engine. Your job is to convert raw character descriptions and worldbuilding prose into structured, machine-friendly attribute objects.

${CONTENT_POLICY}

DECOMPOSITION PRINCIPLES:

1. SPEECH FINGERPRINT EXTRACTION: This is the MOST IMPORTANT output. Each character must be identifiable by voice alone without dialogue attribution. Extract or infer:
   - Catchphrases: Signature phrases they would repeat based on personality and background
   - Vocabulary profile: Formality level, word preferences, jargon usage, archaic vs modern
   - Sentence patterns: Short/terse vs ornate, questions vs declarations, imperative vs passive
   - Verbal tics: Filler words, interjections, habitual speech markers
   - Dialogue samples: Write 2-3 invented example lines showing their unique voice in action

2. TRAIT DECOMPOSITION: Extract 3-5 core personality traits as concise labels. These should be the traits that most influence behavior and dialogue.

3. KNOWLEDGE BOUNDARIES: Explicitly state what each character knows and does NOT know. This prevents information leaking between characters during generation.

4. RELATIONSHIP MAPPING: Capture relationships WITH CONTEXT - not just "knows X" but the emotional quality and history of the relationship.

5. WORLDBUILDING ATOMIZATION: Break worldbuilding prose into atomic facts with domain tags and scope annotations. Each fact should be a single, self-contained proposition.

6. PRESERVE NUANCE: Do not flatten complex characters into stereotypes. If the description contains contradictions or complexity, preserve that in the decomposition.

7. INFER MISSING DETAILS: If the raw description implies speech patterns but doesn't state them explicitly, INFER them from the character's background, personality, and social context. A grizzled sailor speaks differently from a court diplomat.`;

export function buildEntityDecomposerPrompt(context: EntityDecomposerContext): ChatMessage[] {
  const npcsSection =
    context.npcs && context.npcs.length > 0
      ? `\n\nNPC DEFINITIONS:\n${formatNpcsForPrompt(context.npcs)}`
      : '';

  const worldSection = context.worldbuilding
    ? `\n\nWORLDBUILDING:\n${context.worldbuilding}`
    : '';

  const toneSection = context.tone ? `\n\nTONE/GENRE: ${context.tone}` : '';

  const userPrompt = `Decompose the following character descriptions and worldbuilding into structured attribute objects.

CHARACTER CONCEPT (protagonist):
${context.characterConcept}${npcsSection}${worldSection}${toneSection}

INSTRUCTIONS:
1. The FIRST character in the output array MUST be the protagonist (from CHARACTER CONCEPT)
2. Remaining characters follow in NPC definition order
3. For speech fingerprints: if the description explicitly describes how someone talks, use that. If not, INFER speech patterns from their personality, background, social class, and the story's tone/genre
4. For worldbuilding facts: decompose into atomic propositions. If no worldbuilding is provided, return an empty worldFacts array
5. Every character MUST have a distinct speech fingerprint - no two characters should sound alike`;

  return [
    { role: 'system', content: ENTITY_DECOMPOSER_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}
