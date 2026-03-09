import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterWebContext } from '../../models/saved-developed-character.js';
import { CONTENT_POLICY } from '../content-policy.js';

export interface CharacterDevPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly webContext: CharacterWebContext;
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to analyze a character's role within their cast and generate their dramatic kernel: the super-objective that drives them, the opposition they face, the stakes that make it matter, the constraints that limit them, and the pressure point that could break them.`;

const DESIGN_GUIDELINES = `CHARACTER KERNEL DESIGN GUIDELINES:
- The super-objective is the character's DEEPEST want — the thing that drives all their actions, even when they don't realize it.
- Immediate objectives are concrete, near-term goals the character is actively pursuing. They should logically flow from the super-objective but be specific enough to generate scenes.
- Primary opposition is the main force standing between the character and their super-objective. It can be a person, institution, circumstance, or internal conflict.
- Stakes must feel personal and consequential. Abstract stakes ("the world will suffer") are weaker than personal ones ("she'll lose the only person who ever believed in her").
- Constraints are the rules the character plays by — moral codes, physical limits, social obligations, secrets they must keep. These create dramatic friction.
- The pressure point is the specific vulnerability that, when exploited, forces the character to act against their own interests or reveal their true nature. Every interesting character has one.
- Consider how this character's kernel creates dramatic tension with other cast members based on their roles and relationships.`;

export function buildCharKernelPrompt(context: CharacterDevPromptContext): ChatMessage[] {
  const { webContext } = context;
  const { assignment } = webContext;

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];

  const userSections: string[] = [
    `Generate a character kernel for ${assignment.characterName}.`,
  ];

  userSections.push(`CHARACTER ROLE IN CAST:
- Name: ${assignment.characterName}
- Is Protagonist: ${String(assignment.isProtagonist)}
- Story Function: ${assignment.storyFunction}
- Character Depth: ${assignment.characterDepth}
- Narrative Role: ${assignment.narrativeRole}
- Conflict Relationship: ${assignment.conflictRelationship}`);

  userSections.push(`CAST DYNAMICS:\n${webContext.castDynamicsSummary}`);

  if (webContext.relationshipArchetypes.length > 0) {
    const relLines = webContext.relationshipArchetypes
      .map(
        (r) =>
          `- ${r.fromCharacter} → ${r.toCharacter}: ${r.relationshipType} (${r.valence}) — ${r.essentialTension}`
      )
      .join('\n');
    userSections.push(`RELATIONSHIP ARCHETYPES:\n${relLines}`);
  }

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
- characterName: Must be "${assignment.characterName}".
- superObjective: The character's overarching dramatic goal — the deepest want driving all their actions.
- immediateObjectives: Array of concrete near-term goals the character is actively pursuing.
- primaryOpposition: The main force standing between the character and their super-objective.
- stakes: Array of what the character stands to lose or gain.
- constraints: Array of internal or external limitations restricting the character.
- pressurePoint: The specific vulnerability that forces the character to act against their interests when pressed.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
