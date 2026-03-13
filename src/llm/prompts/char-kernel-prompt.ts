import type { ConceptSpec } from '../../models/concept-generator.js';
import type { DecomposedWorld } from '../../models/decomposed-world.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterWebContext } from '../../models/saved-developed-character.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';
import { buildWorldSectionForCharacterDev } from './sections/shared/worldbuilding-sections.js';

export interface CharacterDevPromptContext {
  readonly kernelSummary?: string;
  readonly conceptSummary?: string;
  readonly userNotes?: string;
  readonly worldbuilding?: string;
  readonly decomposedWorld?: DecomposedWorld;
  readonly webContext: CharacterWebContext;
  readonly storyKernel?: StoryKernel;
  readonly conceptSpec?: ConceptSpec;
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

function buildCharKernelConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    "CONSTRAINT: Use conflict engine and protagonist arc to ground the super-objective in the story's central tension. Use protagonist lie/truth/ghost to shape the character's deepest wants and blind spots. Use pressure source to calibrate opposition."
  );
}

function buildCharKernelKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Align the super-objective with the value at stake. Use the value spectrum to position the character morally. Use the thematic question to shape the character\'s core internal conflict.'
  );
}

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

  const conceptSection = buildCharKernelConceptSection(context.conceptSpec);
  const kernelSection = buildCharKernelKernelSection(context.storyKernel);

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

  const worldSection = context.decomposedWorld
    ? buildWorldSectionForCharacterDev(context.decomposedWorld)
    : context.worldbuilding && context.worldbuilding.length > 0
      ? `WORLDBUILDING:\n${context.worldbuilding}`
      : '';

  if (worldSection.length > 0) {
    userSections.push(`${worldSection}\n\nCONSTRAINT: Ground the super-objective and opposition in the world's power structures and realities. Use worldbuilding facts to determine what resources, institutions, and forces are available to the character.`);
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
- pressurePoint: The specific vulnerability that forces the character to act against their interests when pressed.
- moralLine: The line this character will not cross. 1 sentence.
- unacceptableCost: The price this character refuses to pay, even for their super-objective. 1 sentence.
- worstFear: What would psychologically destroy this character. 1 sentence.
- sceneObjectivePatterns: Array of 2-4 patterns describing how this character typically pursues goals in concrete interactions. E.g. "Opens with flattery, then applies incremental pressure."`);

  userSections.push(`GENERATION RULES:
- moralLine and unacceptableCost must not be duplicates — one is ethical, the other is personal.
- sceneObjectivePatterns must describe observable tactics, not abstract strategy.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
