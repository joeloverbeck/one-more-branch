import type { ConceptSpec } from '../../models/concept-generator.js';
import type { CharacterKernel } from '../../models/character-pipeline-types.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterDevPromptContext } from './char-kernel-prompt.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';
import { buildWorldSectionForCharacterDev } from './sections/shared/worldbuilding-sections.js';

export interface CharTridimensionalPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to build a three-dimensional character profile using Lajos Egri's method: physiology (body), sociology (environment), and psychology (mind). Each dimension must be derived logically from the character's kernel — their super-objective, opposition, stakes, constraints, and pressure point — combined with their role in the cast.`;

const DESIGN_GUIDELINES = `TRIDIMENSIONAL PROFILE DESIGN GUIDELINES:
- PHYSIOLOGY: The character's body — age, sex, height, weight, posture, appearance, defects, heredity, health. Choose physical traits that CREATE DRAMATIC FRICTION with their objectives or role. A spy with a conspicuous scar. A warrior with a chronic injury. A seducer with an unsettling feature.
- SOCIOLOGY: The character's environment — class, occupation, education, home life, religion, race, nationality, political affiliation, community standing, amusements, hobbies. These shape HOW the character pursues their super-objective and WHAT they consider acceptable.
- PSYCHOLOGY: The character's mind — moral standards, personal premise, ambition, frustrations, temperament, attitude toward life, complexes, extrovert/introvert/ambivert, abilities, qualities, IQ. The psychology must LOGICALLY FOLLOW from the physiology and sociology — it is the product of the other two dimensions interacting.
- CORE TRAITS: 5-8 defining traits that emerge from the three dimensions. These are the behavioral tendencies a writer would need to portray this character consistently.
- Every detail must serve the drama. No arbitrary traits — each physical, social, and psychological detail should create tension, reveal character, or enable/constrain action.`;

function buildTridimensionalConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use genre frame and world architecture to ground physiology and sociology in the setting. Use setting axioms to determine what physical and social traits are possible. Use setting scale to calibrate the character\'s social reach.'
  );
}

function buildTridimensionalKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use the dramatic stance to calibrate the character\'s psychological tone. Use the value spectrum to inform their moral standards and personal premise.'
  );
}

export function buildCharTridimensionalPrompt(
  context: CharTridimensionalPromptContext
): ChatMessage[] {
  const { webContext, characterKernel } = context;
  const { assignment } = webContext;

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];

  const userSections: string[] = [
    `Generate a tridimensional profile for ${assignment.characterName}.`,
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

  userSections.push(`CHARACTER KERNEL (from Stage 1):
- Super-Objective: ${characterKernel.superObjective}
- Immediate Objectives: ${characterKernel.immediateObjectives.join('; ')}
- Primary Opposition: ${characterKernel.primaryOpposition}
- Stakes: ${characterKernel.stakes.join('; ')}
- Constraints: ${characterKernel.constraints.join('; ')}
- Pressure Point: ${characterKernel.pressurePoint}
- Moral Line: ${characterKernel.moralLine}
- Worst Fear: ${characterKernel.worstFear}`);

  const conceptSection = buildTridimensionalConceptSection(context.conceptSpec);
  const kernelSection = buildTridimensionalKernelSection(context.storyKernel);

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
    userSections.push(`${worldSection}\n\nCONSTRAINT: Ground sociology in the worldbuilding — class systems, occupations, cultural norms, and institutions must reflect the world as described. Use world geography, climate, and resources to inform physiology where relevant.`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- characterName: Must be "${assignment.characterName}".
- physiology: The character's physical dimension — body, appearance, health, heredity. Choose traits that create dramatic friction.
- sociology: The character's environmental dimension — class, occupation, education, community. These shape how they pursue their super-objective.
- psychology: The character's mental dimension — morals, temperament, complexes, abilities. Must logically follow from physiology + sociology.
- coreTraits: Array of 5-8 defining behavioral traits that emerge from the three dimensions.
- formativeWound: The defining early experience that shaped this character's defenses. 1-2 sentences.
- protectiveMask: The persona this character projects to hide or compensate for their wound. 1 sentence.
- misbelief: The false conclusion the character drew from their wound that distorts their worldview. 1 sentence.`);

  userSections.push(`GENERATION RULES:
- formativeWound must generate the protectiveMask and misbelief as logical consequences.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
