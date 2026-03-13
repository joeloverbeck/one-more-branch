import type {
  CastRelationship,
  CastRoleAssignment,
  DeepRelationshipResult,
  RelationshipArchetype,
} from './character-pipeline-types.js';
import {
  CharacterDepth,
  RelationshipValence,
  StoryFunction,
} from './character-enums.js';
import type {
  DecomposedCharacter,
  DecomposedRelationship,
  SpeechFingerprint,
} from './decomposed-character.js';
import type { CharacterWebContext, SavedDevelopedCharacter } from './saved-developed-character.js';
import { isCharacterFullyComplete } from './saved-developed-character.js';
import { normalizeForComparison } from './normalize.js';

const LIGHTWEIGHT_SPEECH_FINGERPRINT: SpeechFingerprint = {
  catchphrases: [],
  vocabularyProfile: 'Concrete, role-shaped language with no established signature yet.',
  sentencePatterns: 'Direct sentences that reflect function before nuance.',
  verbalTics: [],
  dialogueSamples: [],
  metaphorFrames: '',
  antiExamples: [],
  discourseMarkers: [],
  registerShifts: '',
};

function requireNonEmptyName(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}

function sameCharacter(left: string, right: string): boolean {
  return normalizeForComparison(left) === normalizeForComparison(right);
}

function formatStoryFunction(storyFunction: StoryFunction): string {
  return storyFunction.toLowerCase().replace(/_/g, ' ');
}

function formatCharacterDepth(characterDepth: CharacterDepth): string {
  return characterDepth.toLowerCase();
}

function trimTerminalPunctuation(value: string): string {
  return value.trim().replace(/[.!?]+$/g, '');
}

function mapArchetypeValenceToNumber(
  valence: RelationshipArchetype['valence'],
): DecomposedRelationship['valence'] {
  switch (valence) {
    case RelationshipValence.POSITIVE:
      return 3;
    case RelationshipValence.NEGATIVE:
      return -3;
    case RelationshipValence.AMBIVALENT:
      return 0;
  }

  return 0;
}

function mapRelationshipToDecomposed(
  relationship: CastRelationship,
): DecomposedRelationship {
  return {
    valence: relationship.numericValence,
    dynamic: relationship.relationshipType,
    history: relationship.history,
    currentTension: relationship.currentTension,
    leverage: relationship.leverage,
  };
}

function findRelationshipWithProtagonist(
  relationships: DeepRelationshipResult['relationships'],
  characterName: string,
  protagonistName: string,
): CastRelationship | null {
  const protagonistRelationship =
    relationships.find(
      (relationship) =>
        sameCharacter(relationship.fromCharacter, characterName) &&
        sameCharacter(relationship.toCharacter, protagonistName),
    ) ??
    relationships.find(
      (relationship) =>
        sameCharacter(relationship.fromCharacter, protagonistName) &&
        sameCharacter(relationship.toCharacter, characterName),
    );

  return protagonistRelationship ?? null;
}

function findArchetypeWithProtagonist(
  archetypes: readonly RelationshipArchetype[],
  characterName: string,
  protagonistName: string,
): RelationshipArchetype | null {
  const protagonistArchetype =
    archetypes.find(
      (archetype) =>
        sameCharacter(archetype.fromCharacter, characterName) &&
        sameCharacter(archetype.toCharacter, protagonistName),
    ) ??
    archetypes.find(
      (archetype) =>
        sameCharacter(archetype.fromCharacter, protagonistName) &&
        sameCharacter(archetype.toCharacter, characterName),
    );

  return protagonistArchetype ?? null;
}

function buildFullRawDescription(
  char: SavedDevelopedCharacter,
  webContext: CharacterWebContext,
): string {
  const characterKernel = char.characterKernel;
  const tridimensionalProfile = char.tridimensionalProfile;

  if (characterKernel === null || tridimensionalProfile === null) {
    throw new Error(`Character ${char.characterName} is missing data for rawDescription`);
  }

  return [
    `${webContext.assignment.characterName} is driven by ${trimTerminalPunctuation(characterKernel.superObjective)}.`,
    `${trimTerminalPunctuation(tridimensionalProfile.physiology)}.`,
    `${trimTerminalPunctuation(tridimensionalProfile.sociology)}.`,
    `${trimTerminalPunctuation(tridimensionalProfile.psychology)}.`,
  ].join(' ');
}

function buildFullThematicStance(char: SavedDevelopedCharacter): string {
  const characterKernel = char.characterKernel;

  if (characterKernel === null) {
    throw new Error(`Character ${char.characterName} is missing data for thematicStance`);
  }

  return `${characterKernel.primaryOpposition} turns ${characterKernel.stakes.join(', ')} into a personal test.`;
}

function buildLightweightRawDescription(
  assignment: CastRoleAssignment,
  protagonistArchetype: RelationshipArchetype | null,
): string {
  const relationshipClause =
    protagonistArchetype === null
      ? assignment.conflictRelationship
      : `${assignment.conflictRelationship} Their defining protagonist-facing tension is ${protagonistArchetype.essentialTension}.`;

  return `${assignment.characterName} is the ${formatCharacterDepth(assignment.characterDepth)} ${formatStoryFunction(assignment.storyFunction)} of the cast: ${trimTerminalPunctuation(assignment.narrativeRole)}. ${trimTerminalPunctuation(relationshipClause)}.`.trim();
}

function buildLightweightThematicStance(
  assignment: CastRoleAssignment,
  protagonistArchetype: RelationshipArchetype | null,
): string {
  if (protagonistArchetype === null) {
    return `${trimTerminalPunctuation(assignment.conflictRelationship)}. This defines how this ${formatStoryFunction(assignment.storyFunction)} pressures the story.`;
  }

  return `${trimTerminalPunctuation(protagonistArchetype.essentialTension)}. This defines how this ${formatStoryFunction(assignment.storyFunction)} pressures the protagonist.`;
}

function buildLightweightMotivations(
  assignment: CastRoleAssignment,
): string {
  return `${trimTerminalPunctuation(assignment.narrativeRole)}. ${trimTerminalPunctuation(assignment.conflictRelationship)}.`;
}

function buildLightweightDecisionPattern(
  assignment: CastRoleAssignment,
): string {
  return `Acts according to a ${formatCharacterDepth(assignment.characterDepth)} ${formatStoryFunction(assignment.storyFunction)} role, pushing through ${trimTerminalPunctuation(assignment.conflictRelationship).toLowerCase()}.`;
}

function buildLightweightCoreBeliefs(
  assignment: CastRoleAssignment,
): readonly string[] {
  return [
    `${trimTerminalPunctuation(assignment.narrativeRole)}.`,
    `${trimTerminalPunctuation(assignment.conflictRelationship)}.`,
  ];
}

function buildLightweightCoreTraits(
  assignment: CastRoleAssignment,
): readonly string[] {
  return [
    formatStoryFunction(assignment.storyFunction),
    formatCharacterDepth(assignment.characterDepth),
  ];
}

function buildLightweightAppearance(
  assignment: CastRoleAssignment,
): string {
  return `No dedicated presentation yet; presence should read as ${trimTerminalPunctuation(assignment.narrativeRole).toLowerCase()}.`;
}

function buildLightweightKnowledgeBoundaries(
  assignment: CastRoleAssignment,
): string {
  return `Only web-level role knowledge is established so far: ${trimTerminalPunctuation(assignment.narrativeRole)}.`;
}

function buildLightweightConflictPriority(
  assignment: CastRoleAssignment,
): string {
  return assignment.conflictRelationship;
}

function mapArchetypeToDecomposedRelationship(
  archetype: RelationshipArchetype,
): DecomposedRelationship {
  return {
    valence: mapArchetypeValenceToNumber(archetype.valence),
    dynamic: archetype.relationshipType,
    history: archetype.essentialTension,
    currentTension: archetype.essentialTension,
    leverage: archetype.essentialTension,
  };
}

function assertFullCharacterReady(char: SavedDevelopedCharacter): asserts char is SavedDevelopedCharacter & {
  readonly characterKernel: NonNullable<SavedDevelopedCharacter['characterKernel']>;
  readonly tridimensionalProfile: NonNullable<SavedDevelopedCharacter['tridimensionalProfile']>;
  readonly agencyModel: NonNullable<SavedDevelopedCharacter['agencyModel']>;
  readonly deepRelationships: NonNullable<SavedDevelopedCharacter['deepRelationships']>;
  readonly textualPresentation: NonNullable<SavedDevelopedCharacter['textualPresentation']>;
} {
  if (!isCharacterFullyComplete(char)) {
    throw new Error(`Character ${char.characterName} is not fully complete`);
  }

  if (
    char.characterKernel === null ||
    char.tridimensionalProfile === null ||
    char.agencyModel === null ||
    char.deepRelationships === null ||
    char.textualPresentation === null
  ) {
    throw new Error(`Character ${char.characterName} is missing completed stage data`);
  }
}

export function toDecomposedCharacter(
  char: SavedDevelopedCharacter,
  webContext: CharacterWebContext,
): DecomposedCharacter {
  const resolvedProtagonistName = requireNonEmptyName(
    'protagonistName',
    webContext.protagonistName,
  );
  assertFullCharacterReady(char);

  const protagonistRelationship = webContext.assignment.isProtagonist
    ? null
    : findRelationshipWithProtagonist(
        char.deepRelationships.relationships,
        char.characterName,
        resolvedProtagonistName,
      );

  return {
    name: webContext.assignment.characterName,
    speechFingerprint: char.textualPresentation.speechFingerprint,
    coreTraits: char.tridimensionalProfile.coreTraits,
    superObjective: char.characterKernel.superObjective,
    thematicStance: buildFullThematicStance(char),
    protagonistRelationship:
      protagonistRelationship === null
        ? null
        : mapRelationshipToDecomposed(protagonistRelationship),
    knowledgeBoundaries: char.textualPresentation.knowledgeBoundaries,
    falseBeliefs: char.agencyModel.falseBeliefs,
    secretsKept: char.deepRelationships.secrets,
    decisionPattern: char.agencyModel.decisionPattern,
    coreBeliefs: char.agencyModel.coreBeliefs,
    conflictPriority: char.textualPresentation.conflictPriority,
    appearance: char.textualPresentation.appearance,
    rawDescription: buildFullRawDescription(char, webContext),
  };
}

export function toDecomposedCharacterFromWeb(
  assignment: CastRoleAssignment,
  archetypes: readonly RelationshipArchetype[],
  protagonistName: string,
): DecomposedCharacter {
  const resolvedProtagonistName = requireNonEmptyName('protagonistName', protagonistName);
  const protagonistArchetype = assignment.isProtagonist
    ? null
    : findArchetypeWithProtagonist(archetypes, assignment.characterName, resolvedProtagonistName);

  return {
    name: assignment.characterName,
    speechFingerprint: LIGHTWEIGHT_SPEECH_FINGERPRINT,
    coreTraits: buildLightweightCoreTraits(assignment),
    superObjective: buildLightweightMotivations(assignment),
    thematicStance: buildLightweightThematicStance(assignment, protagonistArchetype),
    protagonistRelationship:
      protagonistArchetype === null ? null : mapArchetypeToDecomposedRelationship(protagonistArchetype),
    knowledgeBoundaries: buildLightweightKnowledgeBoundaries(assignment),
    decisionPattern: buildLightweightDecisionPattern(assignment),
    coreBeliefs: buildLightweightCoreBeliefs(assignment),
    conflictPriority: buildLightweightConflictPriority(assignment),
    appearance: buildLightweightAppearance(assignment),
    rawDescription: buildLightweightRawDescription(assignment, protagonistArchetype),
  };
}
