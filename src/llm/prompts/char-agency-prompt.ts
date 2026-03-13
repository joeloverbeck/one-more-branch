import type { ConceptSpec } from '../../models/concept-generator.js';
import type { CharacterKernel, TridimensionalProfile } from '../../models/character-pipeline-types.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterDevPromptContext } from './char-kernel-prompt.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';

export interface CharAgencyPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
  readonly tridimensionalProfile: TridimensionalProfile;
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to model a character's agency: how they update plans, how strongly emotions steer behavior, what beliefs they act on, what they want right now, which false beliefs distort their choices, and the decision pattern a writer should expect under pressure.`;

const DESIGN_GUIDELINES = `AGENCY MODEL DESIGN GUIDELINES:
- Replanning policy captures WHEN this character changes course: never, on failure, on new information, or periodically.
- Emotion salience captures HOW MUCH their emotional state changes what they do in the moment.
- Core beliefs are the convictions the character uses to justify action. They should emerge from role, kernel, and tridimensional profile.
- Desires are enduring wants active in the current story situation.
- Current intentions are the concrete actions or near-term pursuits the character is actively trying to carry out now.
- False beliefs are misreadings, blind spots, or incorrect assumptions that create drama and bad decisions.
- Decision pattern explains how this character typically chooses under stress, temptation, uncertainty, or conflict.
- Every field should help a future writer predict this character's next move.`;

function buildAgencyConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use conflict engine and value spectrum to calibrate core beliefs and desires. Use protagonist lie to seed false beliefs. Use escape valve to shape what alternatives the character considers when replanning.'
  );
}

function buildAgencyKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use the value spectrum to ground core beliefs at a specific moral position. Use the thematic question to shape the character\'s deepest false belief. Use moral argument to inform the character\'s decision pattern.'
  );
}

export function buildCharAgencyPrompt(context: CharAgencyPromptContext): ChatMessage[] {
  const { webContext, characterKernel, tridimensionalProfile } = context;
  const { assignment } = webContext;

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];

  const userSections: string[] = [`Generate an agency model for ${assignment.characterName}.`];

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
          `- ${r.fromCharacter} -> ${r.toCharacter}: ${r.relationshipType} (${r.valence}) - ${r.essentialTension}`
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
- Worst Fear: ${characterKernel.worstFear}
- Scene Objective Patterns: ${characterKernel.sceneObjectivePatterns.join('; ')}`);

  userSections.push(`TRIDIMENSIONAL PROFILE (from Stage 2):
- Physiology: ${tridimensionalProfile.physiology}
- Sociology: ${tridimensionalProfile.sociology}
- Psychology: ${tridimensionalProfile.psychology}
- Derivation Chain: ${tridimensionalProfile.derivationChain}
- Core Traits: ${tridimensionalProfile.coreTraits.join('; ')}
- Formative Wound: ${tridimensionalProfile.formativeWound}
- Protective Mask: ${tridimensionalProfile.protectiveMask}
- Misbelief: ${tridimensionalProfile.misbelief}
- Attachment Style: ${tridimensionalProfile.attachmentStyle}`);

  const conceptSection = buildAgencyConceptSection(context.conceptSpec);
  const kernelSection = buildAgencyKernelSection(context.storyKernel);

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

  if (context.worldbuilding.length > 0) {
    userSections.push(`WORLDBUILDING:\n${context.worldbuilding}\n\nCONSTRAINT: Calibrate beliefs, knowledge, and false beliefs to world facts. Characters should know and misunderstand things consistent with their position in this specific world.`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- characterName: Must be "${assignment.characterName}".
- replanningPolicy: One of NEVER, ON_FAILURE, ON_NEW_INFORMATION, PERIODIC.
- emotionSalience: One of LOW, MEDIUM, HIGH.
- coreBeliefs: Array of the convictions or assumptions this character treats as true.
- desires: Array of enduring wants shaping the character's behavior.
- currentIntentions: Array of immediate, active pursuits this character is trying to carry out now.
- falseBeliefs: Array of incorrect assumptions, blind spots, or misreadings driving conflict.
- decisionPattern: A concise explanation of how this character typically makes choices under pressure.
- focalizationFilter: Object with noticesFirst, systematicallyMisses, misreadsAs — what this character perceives, overlooks, and misinterprets.
- escalationLadder: Array of 3-5 ordered steps showing how this character escalates when blocked, from mildest to most extreme.`);

  userSections.push(`GENERATION RULES:
- focalizationFilter must be grounded in the character's wound, training, and social position — not arbitrary.
- escalationLadder must be ordered from mildest to most extreme response. The final step should approach but not cross the moralLine from the kernel.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
