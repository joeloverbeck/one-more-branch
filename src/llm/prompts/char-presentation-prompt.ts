import type { ConceptSpec } from '../../models/concept-generator.js';
import type {
  AgencyModel,
  CharacterKernel,
  DeepRelationshipResult,
  TridimensionalProfile,
} from '../../models/character-pipeline-types.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterDevPromptContext } from './char-kernel-prompt.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';

export interface CharPresentationPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly agencyModel: AgencyModel;
  readonly deepRelationships: DeepRelationshipResult;
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to synthesize a character's full build into textual presentation guidance a writer can immediately use: voice register, speech fingerprint, appearance, knowledge boundaries, and conflict priority.`;

const DESIGN_GUIDELINES = `TEXTUAL PRESENTATION DESIGN GUIDELINES:
- Voice register is the broad tonal lane the character defaults to: formal, neutral, colloquial, ceremonial, technical, vulgar, or poetic.
- Speech fingerprint must be specific enough that a writer can reliably produce distinct dialogue without drifting into generic voice.
- Dialogue samples should sound like this exact character in action, not generic exposition.
- Anti-examples should define the edges of the voice by showing lines this character would never say in this way.
- Appearance should emphasize details that a writer can surface naturally in scene, especially details that reinforce role, psychology, status, or tension.
- Knowledge boundaries must clearly separate what this character knows, suspects, misreads, and cannot know.
- Conflict priority must state what wins when loyalties, fears, duties, desires, and survival pressures collide.
- Every field should synthesize the prior stages. Do not invent a presentation layer that ignores the kernel, profile, agency, or relationship pressures.`;

function formatStringList(values: readonly string[]): string {
  return values.join('; ');
}

function formatRelationships(relationships: DeepRelationshipResult['relationships']): string {
  return relationships
    .map(
      (relationship) =>
        `- ${relationship.fromCharacter} -> ${relationship.toCharacter}: ${relationship.relationshipType} (${relationship.valence}, ${relationship.numericValence})\n  History: ${relationship.history}\n  Current Tension: ${relationship.currentTension}\n  Leverage: ${relationship.leverage}`
    )
    .join('\n');
}

function buildPresentationConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use genre frame and tone to calibrate voice register and vocabulary profile. Use protagonist ghost to shape speech patterns that reveal or conceal trauma. Use setting axioms to ground appearance and knowledge boundaries in the world.'
  );
}

function buildPresentationKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use the dramatic stance to set the overall voice tone (comic, romantic, tragic, ironic). Use the value spectrum to inform what the character argues for in dialogue.'
  );
}

export function buildCharPresentationPrompt(
  context: CharPresentationPromptContext
): ChatMessage[] {
  const { webContext, characterKernel, tridimensionalProfile, agencyModel, deepRelationships } =
    context;
  const { assignment } = webContext;

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];
  const userSections: string[] = [
    `Generate textual presentation guidance for ${assignment.characterName}.`,
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
        (relationship) =>
          `- ${relationship.fromCharacter} -> ${relationship.toCharacter}: ${relationship.relationshipType} (${relationship.valence}) - ${relationship.essentialTension}`
      )
      .join('\n');
    userSections.push(`RELATIONSHIP ARCHETYPES:\n${relLines}`);
  }

  userSections.push(`CHARACTER KERNEL (from Stage 1):
- Super-Objective: ${characterKernel.superObjective}
- Immediate Objectives: ${formatStringList(characterKernel.immediateObjectives)}
- Primary Opposition: ${characterKernel.primaryOpposition}
- Stakes: ${formatStringList(characterKernel.stakes)}
- Constraints: ${formatStringList(characterKernel.constraints)}
- Pressure Point: ${characterKernel.pressurePoint}`);

  userSections.push(`TRIDIMENSIONAL PROFILE (from Stage 2):
- Physiology: ${tridimensionalProfile.physiology}
- Sociology: ${tridimensionalProfile.sociology}
- Psychology: ${tridimensionalProfile.psychology}
- Derivation Chain: ${tridimensionalProfile.derivationChain}
- Core Traits: ${formatStringList(tridimensionalProfile.coreTraits)}`);

  userSections.push(`AGENCY MODEL (from Stage 3):
- Replanning Policy: ${agencyModel.replanningPolicy}
- Emotion Salience: ${agencyModel.emotionSalience}
- Core Beliefs: ${formatStringList(agencyModel.coreBeliefs)}
- Desires: ${formatStringList(agencyModel.desires)}
- Current Intentions: ${formatStringList(agencyModel.currentIntentions)}
- False Beliefs: ${formatStringList(agencyModel.falseBeliefs)}
- Decision Pattern: ${agencyModel.decisionPattern}`);

  userSections.push(`DEEP RELATIONSHIPS (from Stage 4):
Relationships:
${formatRelationships(deepRelationships.relationships)}
Secrets: ${formatStringList(deepRelationships.secrets)}
Personal Dilemmas: ${formatStringList(deepRelationships.personalDilemmas)}`);

  const conceptSection = buildPresentationConceptSection(context.conceptSpec);
  const kernelSection = buildPresentationKernelSection(context.storyKernel);

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
    userSections.push(`WORLDBUILDING:\n${context.worldbuilding}\n\nCONSTRAINT: Ground speech patterns, vocabulary, and appearance in the world's cultures, languages, and aesthetic norms. Use worldbuilding to determine dialect, dress conventions, and knowledge boundaries.`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- characterName: Must be "${assignment.characterName}".
- voiceRegister: One of FORMAL, NEUTRAL, COLLOQUIAL, CEREMONIAL, TECHNICAL, VULGAR, POETIC.
- speechFingerprint.catchphrases: Array of signature repeated phrases.
- speechFingerprint.vocabularyProfile: The character's word-choice profile, level of formality, jargon, and diction habits.
- speechFingerprint.sentencePatterns: Typical sentence structure and cadence.
- speechFingerprint.verbalTics: Array of filler words, habitual interjections, or repeated speech markers.
- speechFingerprint.dialogueSamples: Array of 5-10 example lines that sound authentically like this character.
- speechFingerprint.metaphorFrames: The metaphor systems or conceptual frames this character uses.
- speechFingerprint.antiExamples: Array of 2-3 lines that define how this character does NOT sound.
- speechFingerprint.discourseMarkers: Array of turn openers, transitions, self-corrections, and closers.
- speechFingerprint.registerShifts: How the voice changes under stress, intimacy, public pressure, or status shifts.
- appearance: Brief physical presentation guidance grounded in prior stages.
- knowledgeBoundaries: What the character knows, suspects, misreads, and cannot know.
- conflictPriority: State what wins when the character's goals conflict.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
