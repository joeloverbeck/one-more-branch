import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

export interface CharacterWebPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
}

const ROLE_INTRO = `You are a cast architect for interactive branching fiction. Your job is to analyze the story's thematic foundation and design a character web: assigning cast roles with dramatic functions, sketching lightweight relationship archetypes between characters, and summarizing the cast dynamics that will drive the story.`;

const DESIGN_GUIDELINES = `CHARACTER WEB DESIGN GUIDELINES:
- Every character must serve a clear story function relative to the protagonist.
- isProtagonist must be true for exactly one character.
- narrativeRole is a one-sentence description of what this character DOES in the story — their dramatic purpose.
- conflictRelationship is a one-sentence description of how this character creates, escalates, or resolves conflict for the protagonist.
- Relationship archetypes are LIGHTWEIGHT: a type, a valence, and one line of essential tension. These are not full relationship profiles — they're dramatic sketches.
- essentialTension captures the core dramatic friction in the relationship in a single sentence.
- castDynamicsSummary is a paragraph describing how the cast as a whole creates dramatic pressure, what alliances and oppositions exist, and what fault lines could produce interesting branching.
- Aim for 3-8 characters total depending on story complexity.
- Every pair of characters with a meaningful dramatic relationship should have a relationship archetype entry.`;

export function buildCharacterWebPrompt(context: CharacterWebPromptContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];

  const userSections: string[] = [
    'Generate a character web for the following story setup.',
  ];

  if (context.kernelSummary) {
    userSections.push(`STORY KERNEL:\n${context.kernelSummary}`);
  }

  if (context.conceptSummary) {
    userSections.push(`CONCEPT:\n${context.conceptSummary}`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- assignments: Array of cast role assignments. Each must have:
  - characterName: The character's name.
  - isProtagonist: true for exactly one character, false for all others.
  - storyFunction: One of ANTAGONIST, RIVAL, ALLY, MENTOR, CATALYST, OBSTACLE, FOIL, TRICKSTER, INNOCENT.
  - characterDepth: ROUND for major characters, FLAT for minor ones.
  - narrativeRole: One sentence — what this character DOES in the story.
  - conflictRelationship: One sentence — how this character creates or resolves conflict for the protagonist.
- relationshipArchetypes: Array of relationship sketches between character pairs. Each must have:
  - fromCharacter: Name of the first character.
  - toCharacter: Name of the second character.
  - relationshipType: One of KIN, ALLY, RIVAL, PATRON, CLIENT, MENTOR, SUBORDINATE, ROMANTIC, EX_ROMANTIC, INFORMANT.
  - valence: One of POSITIVE, NEGATIVE, AMBIVALENT.
  - essentialTension: One sentence capturing the core dramatic friction.
- castDynamicsSummary: A paragraph describing overall cast dynamics, alliances, oppositions, and dramatic fault lines.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
