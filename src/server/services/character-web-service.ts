import { randomUUID } from 'node:crypto';
import { emitGenerationStage } from '../../engine/generation-pipeline-helpers.js';
import type { GenerationStageCallback } from '../../engine/types.js';
import { runCharacterStage } from '../../llm/character-stage-runner.js';
import { generateCharacterWeb } from '../../llm/character-web-generation.js';
import type {
  CastPipelineInputs,
  CharacterDevStage,
} from '../../models/character-pipeline-types.js';
import {
  toDecomposedCharacter,
  toDecomposedCharacterFromWeb,
} from '../../models/character-web-converter.js';
import type { DecomposedCharacter } from '../../models/decomposed-character.js';
import { normalizeForComparison } from '../../models/normalize.js';
import { getProtagonistAssignment, type SavedCharacterWeb } from '../../models/saved-character-web.js';
import {
  isCharacterFullyComplete,
  type SavedDevelopedCharacter,
} from '../../models/saved-developed-character.js';
import {
  deleteCharacterWeb,
  listCharacterWebs,
  loadCharacterWeb,
  saveCharacterWeb,
} from '../../persistence/character-web-repository.js';
import {
  deleteDevelopedCharacter,
  listDevelopedCharactersByWebId,
  loadDevelopedCharacter,
  saveDevelopedCharacter,
} from '../../persistence/developed-character-repository.js';

export interface CharacterWebService {
  createWeb(name: string, inputs: CastPipelineInputs): Promise<SavedCharacterWeb>;
  generateWeb(
    webId: string,
    apiKey: string,
    onStage?: GenerationStageCallback,
  ): Promise<SavedCharacterWeb>;
  regenerateWeb(
    webId: string,
    apiKey: string,
    onStage?: GenerationStageCallback,
  ): Promise<SavedCharacterWeb>;
  loadWeb(webId: string): Promise<SavedCharacterWeb | null>;
  listWebs(): Promise<SavedCharacterWeb[]>;
  deleteWeb(webId: string): Promise<void>;
  initializeCharacter(webId: string, characterName: string): Promise<SavedDevelopedCharacter>;
  generateCharacterStage(
    charId: string,
    stage: CharacterDevStage,
    apiKey: string,
    onStage?: GenerationStageCallback,
  ): Promise<SavedDevelopedCharacter>;
  regenerateCharacterStage(
    charId: string,
    stage: CharacterDevStage,
    apiKey: string,
    onStage?: GenerationStageCallback,
  ): Promise<SavedDevelopedCharacter>;
  loadCharacter(charId: string): Promise<SavedDevelopedCharacter | null>;
  listCharactersForWeb(webId: string): Promise<SavedDevelopedCharacter[]>;
  deleteCharacter(charId: string): Promise<void>;
  toDecomposedCharacters(webId: string): Promise<DecomposedCharacter[]>;
}

interface CharacterWebServiceDeps {
  readonly now: () => string;
  readonly createId: () => string;
  readonly saveCharacterWeb: typeof saveCharacterWeb;
  readonly loadCharacterWeb: typeof loadCharacterWeb;
  readonly listCharacterWebs: typeof listCharacterWebs;
  readonly deleteCharacterWeb: typeof deleteCharacterWeb;
  readonly saveDevelopedCharacter: typeof saveDevelopedCharacter;
  readonly loadDevelopedCharacter: typeof loadDevelopedCharacter;
  readonly listDevelopedCharactersByWebId: typeof listDevelopedCharactersByWebId;
  readonly deleteDevelopedCharacter: typeof deleteDevelopedCharacter;
  readonly generateCharacterWeb: typeof generateCharacterWeb;
  readonly runCharacterStage: typeof runCharacterStage;
  readonly toDecomposedCharacter: typeof toDecomposedCharacter;
  readonly toDecomposedCharacterFromWeb: typeof toDecomposedCharacterFromWeb;
}

const defaultDeps: CharacterWebServiceDeps = {
  now: () => new Date().toISOString(),
  createId: () => randomUUID(),
  saveCharacterWeb,
  loadCharacterWeb,
  listCharacterWebs,
  deleteCharacterWeb,
  saveDevelopedCharacter,
  loadDevelopedCharacter,
  listDevelopedCharactersByWebId,
  deleteDevelopedCharacter,
  generateCharacterWeb,
  runCharacterStage,
  toDecomposedCharacter,
  toDecomposedCharacterFromWeb,
};

function trimRequired(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${label} is required`);
  }

  return trimmed;
}

function trimApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new Error('OpenRouter API key is required');
  }

  return trimmed;
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeName(value: string): string {
  return normalizeForComparison(value);
}

function requireWeb(
  webId: string,
  web: SavedCharacterWeb | null,
): SavedCharacterWeb {
  if (web === null) {
    throw new Error(`Character web not found: ${webId}`);
  }

  return web;
}

function isMissingCharacterError(error: unknown, charId: string): boolean {
  return error instanceof Error && error.message === `Developed character not found: ${charId}`;
}

function resetCharacterFromStage(
  character: SavedDevelopedCharacter,
  stage: CharacterDevStage,
  updatedAt: string,
): SavedDevelopedCharacter {
  const completedStages = character.completedStages.filter((completedStage) => completedStage < stage);

  return {
    ...character,
    updatedAt,
    characterKernel: stage <= 1 ? null : character.characterKernel,
    tridimensionalProfile: stage <= 2 ? null : character.tridimensionalProfile,
    agencyModel: stage <= 3 ? null : character.agencyModel,
    deepRelationships: stage <= 4 ? null : character.deepRelationships,
    textualPresentation: stage <= 5 ? null : character.textualPresentation,
    completedStages,
  };
}

function sortAssignmentsForStoryPrep(web: SavedCharacterWeb): SavedCharacterWeb['assignments'] {
  return [...web.assignments].sort((left, right) => {
    const leftIsProtagonist = normalizeName(left.characterName) === normalizeName(web.protagonistName);
    const rightIsProtagonist = normalizeName(right.characterName) === normalizeName(web.protagonistName);

    if (leftIsProtagonist === rightIsProtagonist) {
      return 0;
    }

    return leftIsProtagonist ? -1 : 1;
  });
}

export function createCharacterWebService(
  deps: CharacterWebServiceDeps = defaultDeps,
): CharacterWebService {
  const generateWebInternal = async (
    webId: string,
    apiKey: string,
    onStage?: GenerationStageCallback,
  ): Promise<SavedCharacterWeb> => {
    const trimmedWebId = trimRequired('Character web id', webId);
    const web = requireWeb(trimmedWebId, await deps.loadCharacterWeb(trimmedWebId));
    const trimmedApiKey = trimApiKey(apiKey);
    const attempt = 1;

    emitGenerationStage(onStage, 'GENERATING_CHARACTER_WEB', 'started', attempt);
    const generation = await deps.generateCharacterWeb(web.inputs, trimmedApiKey);
    const protagonistAssignment = getProtagonistAssignment(generation.assignments);

    const updatedWeb: SavedCharacterWeb = {
      ...web,
      updatedAt: deps.now(),
      protagonistName: protagonistAssignment.characterName,
      assignments: generation.assignments,
      relationshipArchetypes: generation.relationshipArchetypes,
      castDynamicsSummary: generation.castDynamicsSummary,
    };

    await deps.saveCharacterWeb(updatedWeb);
    emitGenerationStage(onStage, 'GENERATING_CHARACTER_WEB', 'completed', attempt);
    return updatedWeb;
  };

  return {
    async createWeb(name: string, inputs: CastPipelineInputs): Promise<SavedCharacterWeb> {
      const now = deps.now();
      const web: SavedCharacterWeb = {
        id: deps.createId(),
        name: trimRequired('Character web name', name),
        createdAt: now,
        updatedAt: now,
        protagonistName: '',
        inputs: {
          kernelSummary: trimOptional(inputs.kernelSummary),
          conceptSummary: trimOptional(inputs.conceptSummary),
          userNotes: trimOptional(inputs.userNotes),
        },
        assignments: [],
        relationshipArchetypes: [],
        castDynamicsSummary: '',
      };

      await deps.saveCharacterWeb(web);
      return web;
    },

    async generateWeb(
      webId: string,
      apiKey: string,
      onStage?: GenerationStageCallback,
    ): Promise<SavedCharacterWeb> {
      return generateWebInternal(webId, apiKey, onStage);
    },

    async regenerateWeb(
      webId: string,
      apiKey: string,
      onStage?: GenerationStageCallback,
    ): Promise<SavedCharacterWeb> {
      return generateWebInternal(webId, apiKey, onStage);
    },

    async loadWeb(webId: string): Promise<SavedCharacterWeb | null> {
      const trimmedWebId = trimRequired('Character web id', webId);
      return deps.loadCharacterWeb(trimmedWebId);
    },

    async listWebs(): Promise<SavedCharacterWeb[]> {
      return deps.listCharacterWebs();
    },

    async deleteWeb(webId: string): Promise<void> {
      const trimmedWebId = trimRequired('Character web id', webId);
      const characters = await deps.listDevelopedCharactersByWebId(trimmedWebId);
      for (const character of characters) {
        await deps.deleteDevelopedCharacter(character.id);
      }

      await deps.deleteCharacterWeb(trimmedWebId);
    },

    async initializeCharacter(
      webId: string,
      characterName: string,
    ): Promise<SavedDevelopedCharacter> {
      const trimmedWebId = trimRequired('Character web id', webId);
      const trimmedCharacterName = trimRequired('Character name', characterName);
      const web = requireWeb(trimmedWebId, await deps.loadCharacterWeb(trimmedWebId));
      const assignment = web.assignments.find(
        (candidate) => normalizeName(candidate.characterName) === normalizeName(trimmedCharacterName),
      );

      if (assignment === undefined) {
        throw new Error(
          `Character ${trimmedCharacterName} is not assigned in character web ${trimmedWebId}`,
        );
      }

      const existingCharacters = await deps.listDevelopedCharactersByWebId(trimmedWebId);
      const duplicate = existingCharacters.find(
        (candidate) =>
          normalizeName(candidate.characterName) === normalizeName(assignment.characterName),
      );

      if (duplicate !== undefined) {
        throw new Error(
          `Developed character already exists for ${assignment.characterName} in character web ${trimmedWebId}`,
        );
      }

      const now = deps.now();
      const character: SavedDevelopedCharacter = {
        id: deps.createId(),
        characterName: assignment.characterName,
        createdAt: now,
        updatedAt: now,
        sourceWebId: web.id,
        sourceWebName: web.name,
        webContext: {
          assignment,
          protagonistName: web.protagonistName,
          relationshipArchetypes: web.relationshipArchetypes,
          castDynamicsSummary: web.castDynamicsSummary,
        },
        characterKernel: null,
        tridimensionalProfile: null,
        agencyModel: null,
        deepRelationships: null,
        textualPresentation: null,
        completedStages: [],
      };

      await deps.saveDevelopedCharacter(character);
      return character;
    },

    async generateCharacterStage(
      charId: string,
      stage: CharacterDevStage,
      apiKey: string,
      onStage?: GenerationStageCallback,
    ): Promise<SavedDevelopedCharacter> {
      const trimmedCharId = trimRequired('Character id', charId);
      const character = await deps.loadDevelopedCharacter(trimmedCharId);
      const web = requireWeb(
        character.sourceWebId,
        await deps.loadCharacterWeb(character.sourceWebId),
      );

      const otherDevelopedCharacters =
        stage === 4
          ? (await deps.listDevelopedCharactersByWebId(character.sourceWebId)).filter(
              (candidate) => candidate.id !== character.id,
            )
          : undefined;

      const result = await deps.runCharacterStage({
        character,
        stage,
        apiKey: trimApiKey(apiKey),
        inputs: web.inputs,
        otherDevelopedCharacters,
        onGenerationStage: onStage,
      });

      await deps.saveDevelopedCharacter(result.updatedCharacter);
      return result.updatedCharacter;
    },

    async regenerateCharacterStage(
      charId: string,
      stage: CharacterDevStage,
      apiKey: string,
      onStage?: GenerationStageCallback,
    ): Promise<SavedDevelopedCharacter> {
      const trimmedCharId = trimRequired('Character id', charId);
      const character = await deps.loadDevelopedCharacter(trimmedCharId);
      const web = requireWeb(
        character.sourceWebId,
        await deps.loadCharacterWeb(character.sourceWebId),
      );
      const resetCharacter = resetCharacterFromStage(character, stage, deps.now());
      const otherDevelopedCharacters =
        stage === 4
          ? (await deps.listDevelopedCharactersByWebId(character.sourceWebId)).filter(
              (candidate) => candidate.id !== character.id,
            )
          : undefined;

      const result = await deps.runCharacterStage({
        character: resetCharacter,
        stage,
        apiKey: trimApiKey(apiKey),
        inputs: web.inputs,
        otherDevelopedCharacters,
        onGenerationStage: onStage,
      });

      await deps.saveDevelopedCharacter(result.updatedCharacter);
      return result.updatedCharacter;
    },

    async loadCharacter(charId: string): Promise<SavedDevelopedCharacter | null> {
      const trimmedCharId = trimRequired('Character id', charId);

      try {
        return await deps.loadDevelopedCharacter(trimmedCharId);
      } catch (error) {
        if (isMissingCharacterError(error, trimmedCharId)) {
          return null;
        }

        throw error;
      }
    },

    async listCharactersForWeb(webId: string): Promise<SavedDevelopedCharacter[]> {
      const trimmedWebId = trimRequired('Character web id', webId);
      return deps.listDevelopedCharactersByWebId(trimmedWebId);
    },

    async deleteCharacter(charId: string): Promise<void> {
      const trimmedCharId = trimRequired('Character id', charId);
      await deps.deleteDevelopedCharacter(trimmedCharId);
    },

    async toDecomposedCharacters(webId: string): Promise<DecomposedCharacter[]> {
      const trimmedWebId = trimRequired('Character web id', webId);
      const web = requireWeb(trimmedWebId, await deps.loadCharacterWeb(trimmedWebId));
      const characters = await deps.listDevelopedCharactersByWebId(trimmedWebId);
      const charactersByName = new Map<string, SavedDevelopedCharacter>();

      for (const character of characters) {
        const key = normalizeName(character.characterName);
        if (!charactersByName.has(key)) {
          charactersByName.set(key, character);
        }
      }

      return sortAssignmentsForStoryPrep(web).map((assignment) => {
        const developedCharacter = charactersByName.get(normalizeName(assignment.characterName));

        if (developedCharacter !== undefined && isCharacterFullyComplete(developedCharacter)) {
          return deps.toDecomposedCharacter(developedCharacter);
        }

        return deps.toDecomposedCharacterFromWeb(
          assignment,
          web.relationshipArchetypes,
          web.protagonistName,
        );
      });
    },
  };
}

export const characterWebService = createCharacterWebService();
