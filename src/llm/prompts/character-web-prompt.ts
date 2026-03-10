import type { ConceptSpec } from '../../models/concept-generator.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';

export interface CharacterWebPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly storyKernel?: StoryKernel;
  readonly conceptSpec?: ConceptSpec;
}

const ROLE_INTRO = `You are a cast architect for interactive branching fiction. Your job is to analyze the story's thematic foundation and design a character web: assigning cast roles with dramatic functions, sketching lightweight relationship archetypes between characters, and summarizing the cast dynamics that will drive the story.`;

const DESIGN_GUIDELINES = `CHARACTER WEB DESIGN GUIDELINES:
- Every character must serve a clear story function relative to the protagonist.
- Every character must be a being with agency — capable of intention, decision-making, and purposeful action. Locations, environmental features, abstract forces, and inanimate objects are worldbuilding elements, NOT characters. A non-human entity (sentient artifact, supernatural being, AI) qualifies only if it can independently make decisions and act on them.
- isProtagonist must be true for exactly one character.
- narrativeRole is a one-sentence description of what this character DOES in the story — their dramatic purpose.
- conflictRelationship is a one-sentence description of how this character creates, escalates, or resolves conflict for the protagonist.
- Relationship archetypes are LIGHTWEIGHT: a type, a valence, and one line of essential tension. These are not full relationship profiles — they're dramatic sketches.
- essentialTension captures the core dramatic friction in the relationship in a single sentence.
- castDynamicsSummary is a paragraph describing how the cast as a whole creates dramatic pressure, what alliances and oppositions exist, and what fault lines could produce interesting branching.
- Aim for 3-8 characters total depending on story complexity.
- Every pair of characters with a meaningful dramatic relationship should have a relationship archetype entry.`;

const CAST_DESIGN_CONSTRAINT =
  'CONSTRAINT: Use conflict engine to assign cast roles that create maximum dramatic friction. Use protagonist arc to design foils and mirrors. Use genre frame to calibrate character archetypes. Use value spectrum to distribute moral positions across the cast.';

function buildCastConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return baseSection + '\n\n' + CAST_DESIGN_CONSTRAINT;
}

function buildCastKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use value spectrum to position each cast member at a distinct moral coordinate. Use conflict axis to ensure every character relationship creates or amplifies thematic tension.'
  );
}

export function buildCharacterWebPrompt(context: CharacterWebPromptContext): ChatMessage[] {
  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];

  const userSections: string[] = [
    'Generate a character web for the following story setup.',
  ];

  const conceptSection = buildCastConceptSection(context.conceptSpec);
  const kernelSection = buildCastKernelSection(context.storyKernel);

  if (conceptSection.length > 0) {
    userSections.push(conceptSection.trim());
  } else if (context.conceptSummary) {
    userSections.push(`CONCEPT:\n${context.conceptSummary}`);
  }

  if (kernelSection.length > 0) {
    userSections.push(kernelSection.trim());
  } else if (context.kernelSummary) {
    userSections.push(`STORY KERNEL:\n${context.kernelSummary}`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- assignments: Array of cast role assignments. Each must have:
  - characterName: The name of a being with agency (capable of decisions and purposeful action — never a location, object, or environmental feature).
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
