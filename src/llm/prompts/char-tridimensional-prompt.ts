import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterDevPromptContext } from './char-kernel-prompt.js';
import type { CharacterKernel } from '../../models/character-pipeline-types.js';
import { CONTENT_POLICY } from '../content-policy.js';

export interface CharTridimensionalPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to build a three-dimensional character profile using Lajos Egri's method: physiology (body), sociology (environment), and psychology (mind). Each dimension must be derived logically from the character's kernel — their super-objective, opposition, stakes, constraints, and pressure point — combined with their role in the cast.`;

const DESIGN_GUIDELINES = `TRIDIMENSIONAL PROFILE DESIGN GUIDELINES:
- PHYSIOLOGY: The character's body — age, sex, height, weight, posture, appearance, defects, heredity, health. Choose physical traits that CREATE DRAMATIC FRICTION with their objectives or role. A spy with a conspicuous scar. A warrior with a chronic injury. A seducer with an unsettling feature.
- SOCIOLOGY: The character's environment — class, occupation, education, home life, religion, race, nationality, political affiliation, community standing, amusements, hobbies. These shape HOW the character pursues their super-objective and WHAT they consider acceptable.
- PSYCHOLOGY: The character's mind — moral standards, personal premise, ambition, frustrations, temperament, attitude toward life, complexes, extrovert/introvert/ambivert, abilities, qualities, IQ. The psychology must LOGICALLY FOLLOW from the physiology and sociology — it is the product of the other two dimensions interacting.
- DERIVATION CHAIN: Explicitly show HOW you derived each dimension from the kernel. For example: "Super-objective (reclaim throne) + constraint (must hide identity) → sociology (adopted common tradesman persona) → psychology (deep shame about deception contradicting noble upbringing)."
- CORE TRAITS: 5-8 defining traits that emerge from the three dimensions. These are the behavioral tendencies a writer would need to portray this character consistently.
- Every detail must serve the drama. No arbitrary traits — each physical, social, and psychological detail should create tension, reveal character, or enable/constrain action.`;

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
- Pressure Point: ${characterKernel.pressurePoint}`);

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
- physiology: The character's physical dimension — body, appearance, health, heredity. Choose traits that create dramatic friction.
- sociology: The character's environmental dimension — class, occupation, education, community. These shape how they pursue their super-objective.
- psychology: The character's mental dimension — morals, temperament, complexes, abilities. Must logically follow from physiology + sociology.
- derivationChain: Show explicitly how you derived each dimension from the kernel and cast role. Chain of reasoning from dramatic needs to character details.
- coreTraits: Array of 5-8 defining behavioral traits that emerge from the three dimensions.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
