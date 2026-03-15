import type { ConceptSpec } from '../../models/concept-generator.js';
import type {
  AgencyModel,
  CharacterKernel,
  TridimensionalProfile,
} from '../../models/character-pipeline-types.js';
import type { SavedDevelopedCharacter } from '../../models/saved-developed-character.js';
import type { StoryKernel } from '../../models/story-kernel.js';
import type { ChatMessage } from '../llm-client-types.js';
import type { CharacterDevPromptContext } from './char-kernel-prompt.js';
import { CONTENT_POLICY } from '../content-policy.js';
import {
  buildConceptAnalysisSection,
  buildKernelGroundingSection,
} from './sections/shared/concept-kernel-sections.js';
import { buildWorldSectionForCharacterDev } from './sections/shared/worldbuilding-sections.js';

export interface CharRelationshipsPromptContext extends CharacterDevPromptContext {
  readonly characterKernel: CharacterKernel;
  readonly tridimensionalProfile: TridimensionalProfile;
  readonly agencyModel: AgencyModel;
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[];
}

const ROLE_INTRO = `You are a character psychologist for interactive branching fiction. Your job is to deepen a character's social web into dramatic, story-usable relationships with history, tension, leverage, and pressure-bearing secrets.`;

const DESIGN_GUIDELINES = `DEEP RELATIONSHIPS DESIGN GUIDELINES:
- Start from the lightweight relationship archetypes, but do not stop at labels. Convert them into concrete, playable dynamics.
- Relationships should emerge from the character's kernel, tridimensional profile, and agency model. A character's goals, fears, blind spots, and decision habits should all affect how they relate to others.
- history should explain how the relationship became what it is now.
- currentTension should capture the present unstable pressure in the relationship.
- leverage should identify what one side can use against the other right now.
- numericValence must be between -5 and 5 and should match the stated valence.
- Secrets and personal dilemmas should belong to the focal character and intensify future scene possibilities.
- When counterpart characters have already been developed, use that information to keep cross-character dynamics coherent and specific.`;

function formatStringList(values: readonly string[]): string {
  return values.join('; ');
}

function formatOtherDevelopedCharacters(
  characters: readonly SavedDevelopedCharacter[],
  focalCharacterName: string,
): string {
  return characters
    .filter((character) => character.characterName !== focalCharacterName)
    .map((character) => {
      const sections = [
        `- ${character.characterName}`,
      ];

      if (character.characterKernel) {
        sections.push(`  Super-objective: ${character.characterKernel.superObjective}`);
      }

      if (character.tridimensionalProfile) {
        sections.push(`  Core traits: ${formatStringList(character.tridimensionalProfile.coreTraits)}`);
      }

      if (character.agencyModel) {
        sections.push(`  Core beliefs: ${formatStringList(character.agencyModel.coreBeliefs)}`);
        sections.push(`  False beliefs: ${formatStringList(character.agencyModel.falseBeliefs)}`);
      }

      return sections.join('\n');
    })
    .join('\n');
}

function buildRelationshipsConceptSection(conceptSpec?: ConceptSpec): string {
  const baseSection = buildConceptAnalysisSection(conceptSpec);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use conflict axis and protagonist arc to ensure every relationship carries thematic weight. Use protagonist ghost to inform what the focal character projects onto others. Use want-need collision to shape leverage dynamics.'
  );
}

function buildRelationshipsKernelSection(storyKernel?: StoryKernel): string {
  const baseSection = buildKernelGroundingSection(storyKernel);
  if (baseSection.length === 0) {
    return '';
  }

  return (
    baseSection +
    '\n\n' +
    'CONSTRAINT: Use the value spectrum to position each relationship at a distinct point of moral tension. Use the thematic question to seed secrets and dilemmas that force the character to confront the story\'s central argument.'
  );
}

export function buildCharRelationshipsPrompt(
  context: CharRelationshipsPromptContext
): ChatMessage[] {
  const { webContext, characterKernel, tridimensionalProfile, agencyModel } = context;
  const { assignment } = webContext;

  const systemSections: string[] = [ROLE_INTRO, CONTENT_POLICY, DESIGN_GUIDELINES];
  const userSections: string[] = [
    `Generate deep relationships for ${assignment.characterName}.`,
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
- Pressure Point: ${characterKernel.pressurePoint}
- Moral Line: ${characterKernel.moralLine}
- Worst Fear: ${characterKernel.worstFear}`);

  userSections.push(`TRIDIMENSIONAL PROFILE (from Stage 2):
- Physiology: ${tridimensionalProfile.physiology}
- Sociology: ${tridimensionalProfile.sociology}
- Psychology: ${tridimensionalProfile.psychology}
- Core Traits: ${formatStringList(tridimensionalProfile.coreTraits)}
- Formative Wound: ${tridimensionalProfile.formativeWound}
- Protective Mask: ${tridimensionalProfile.protectiveMask}
- Misbelief: ${tridimensionalProfile.misbelief}`);

  userSections.push(`AGENCY MODEL (from Stage 3):
- Emotion Salience: ${agencyModel.emotionSalience}
- Core Beliefs: ${formatStringList(agencyModel.coreBeliefs)}
- Desires: ${formatStringList(agencyModel.desires)}
- Current Intentions: ${formatStringList(agencyModel.currentIntentions)}
- False Beliefs: ${formatStringList(agencyModel.falseBeliefs)}
- Decision Pattern: ${agencyModel.decisionPattern}
- Focalization Filter: Notices first: ${agencyModel.focalizationFilter.noticesFirst}; Systematically misses: ${agencyModel.focalizationFilter.systematicallyMisses}; Misreads as: ${agencyModel.focalizationFilter.misreadsAs}
- Escalation Ladder: ${formatStringList(agencyModel.escalationLadder)}`);

  const counterpartSection = formatOtherDevelopedCharacters(
    context.otherDevelopedCharacters ?? [],
    assignment.characterName
  );
  if (counterpartSection.length > 0) {
    userSections.push(`OTHER DEVELOPED CHARACTERS:\n${counterpartSection}`);
  }

  const conceptSection = buildRelationshipsConceptSection(context.conceptSpec);
  const kernelSection = buildRelationshipsKernelSection(context.storyKernel);

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
    userSections.push(`${worldSection}\n\nCONSTRAINT: Ground relationship dynamics in the world's social structures, political factions, and cultural norms. Use worldbuilding to determine what alliances, hierarchies, and taboos shape how characters relate.`);
  }

  if (context.userNotes) {
    userSections.push(`USER NOTES:\n${context.userNotes}`);
  }

  userSections.push(`FIELD INSTRUCTIONS:
- relationships: Array of full CastRelationship entries for the focal character's most dramatically important ties.
- fromCharacter and toCharacter: Use character names exactly as established.
- relationshipType: One of KIN, ALLY, RIVAL, PATRON, CLIENT, MENTOR, SUBORDINATE, ROMANTIC, EX_ROMANTIC, INFORMANT.
- valence: One of POSITIVE, NEGATIVE, AMBIVALENT.
- numericValence: Number from -5 to 5 inclusive.
- history: Brief explanation of the relationship's past.
- currentTension: Brief explanation of the unstable present pressure in the relationship.
- leverage: What one side can currently use against the other.
- ruptureTriggers: Array of 1-3 specific events or revelations that would shatter this relationship.
- repairMoves: Array of 1-3 specific actions that could mend this relationship after damage.
- secrets: Array of secrets the focal character is keeping.
- personalDilemmas: Array of dramatic dilemmas the focal character is currently trapped in.
- Do not use alternate field names such as dilemmas.`);

  userSections.push(`GENERATION RULES:
- ruptureTriggers must be concrete events, not abstract conditions — things that could happen in a scene.
- repairMoves must be concrete actions available to the characters, not meta-descriptions.`);

  return [
    { role: 'system', content: systemSections.join('\n\n') },
    { role: 'user', content: userSections.join('\n\n') },
  ];
}
