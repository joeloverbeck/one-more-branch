import type {
  CastRoleAssignment,
  RelationshipArchetype,
  CharacterKernel,
  TridimensionalProfile,
  AgencyModel,
  DeepRelationshipResult,
  TextualPresentation,
  CharacterDevStage,
} from './character-pipeline-types.js';

export interface CharacterWebContext {
  readonly assignment: CastRoleAssignment;
  readonly protagonistName: string;
  readonly relationshipArchetypes: readonly RelationshipArchetype[];
  readonly castDynamicsSummary: string;
}

export interface SavedDevelopedCharacter {
  readonly id: string;
  readonly characterName: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly sourceWebId: string;
  readonly characterKernel: CharacterKernel | null;
  readonly tridimensionalProfile: TridimensionalProfile | null;
  readonly agencyModel: AgencyModel | null;
  readonly deepRelationships: DeepRelationshipResult | null;
  readonly textualPresentation: TextualPresentation | null;
  readonly completedStages: readonly CharacterDevStage[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isSavedDevelopedCharacter(
  value: unknown,
): value is SavedDevelopedCharacter {
  if (!isObjectRecord(value)) {
    return false;
  }

  return (
    typeof value['id'] === 'string' &&
    typeof value['characterName'] === 'string' &&
    typeof value['createdAt'] === 'string' &&
    typeof value['updatedAt'] === 'string' &&
    typeof value['sourceWebId'] === 'string' &&
    (value['characterKernel'] === null || isObjectRecord(value['characterKernel'])) &&
    (value['tridimensionalProfile'] === null || isObjectRecord(value['tridimensionalProfile'])) &&
    (value['agencyModel'] === null || isObjectRecord(value['agencyModel'])) &&
    (value['deepRelationships'] === null || isObjectRecord(value['deepRelationships'])) &&
    (value['textualPresentation'] === null || isObjectRecord(value['textualPresentation'])) &&
    Array.isArray(value['completedStages'])
  );
}

export function isCharacterStageComplete(
  char: SavedDevelopedCharacter,
  stage: CharacterDevStage,
): boolean {
  return char.completedStages.includes(stage);
}

export function canGenerateCharacterStage(
  char: SavedDevelopedCharacter,
  stage: CharacterDevStage,
): boolean {
  if (stage === 1) {
    return true;
  }
  const previousStage = (stage - 1) as CharacterDevStage;
  return char.completedStages.includes(previousStage);
}

export function isCharacterFullyComplete(char: SavedDevelopedCharacter): boolean {
  const allStages: readonly CharacterDevStage[] = [1, 2, 3, 4, 5];
  return allStages.every((stage) => char.completedStages.includes(stage));
}
