import { randomUUID } from 'node:crypto';
import { emitGenerationStage } from '../engine/generation-pipeline-helpers.js';
import { EngineError, type GenerationStageCallback } from '../engine/types.js';
import { runCharacterStage } from '../llm/character-stage-runner.js';
import { generateCharacterWeb } from '../llm/character-web-generation.js';
import type {
  CastPipelineInputs,
  CharacterDevStage,
} from '../models/character-pipeline-types.js';
import {
  toDecomposedCharacter,
  toDecomposedCharacterFromWeb,
} from '../models/character-web-converter.js';
import type { DecomposedCharacter } from '../models/decomposed-character.js';
import { normalizeForComparison } from '../models/normalize.js';
import type { SavedConcept } from '../models/saved-concept.js';
import { getProtagonistAssignment, type SavedCharacterWeb } from '../models/saved-character-web.js';
import type { SavedKernel } from '../models/saved-kernel.js';
import {
  isCharacterFullyComplete,
  type CharacterWebContext,
  type SavedDevelopedCharacter,
} from '../models/saved-developed-character.js';
import { validateStagePayload } from './character-stage-validators.js';
import { validateWebPatchPayload } from './character-web-validators.js';
import {
  deleteCharacterWeb,
  listCharacterWebs,
  loadCharacterWeb,
  saveCharacterWeb,
} from '../persistence/character-web-repository.js';
import { loadConcept } from '../persistence/concept-repository.js';
import {
  deleteDevelopedCharacter,
  listDevelopedCharactersByWebId,
  loadDevelopedCharacter,
  saveDevelopedCharacter,
} from '../persistence/developed-character-repository.js';
import { loadKernel } from '../persistence/kernel-repository.js';

export interface CharacterWebService {
  createWeb(name: string, sourceConceptId: string, userNotes?: string): Promise<SavedCharacterWeb>;
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
  patchCharacterStage(
    charId: string,
    stage: CharacterDevStage,
    payload: unknown,
  ): Promise<SavedDevelopedCharacter>;
  patchWeb(webId: string, payload: unknown): Promise<SavedCharacterWeb>;
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
  readonly toDecomposedCharacter: (char: SavedDevelopedCharacter, webContext: CharacterWebContext) => DecomposedCharacter;
  readonly toDecomposedCharacterFromWeb: typeof toDecomposedCharacterFromWeb;
  readonly loadConcept: (conceptId: string) => Promise<SavedConcept | null>;
  readonly loadKernel: (kernelId: string) => Promise<SavedKernel | null>;
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
  loadConcept,
  loadKernel,
};

function trimRequired(label: string, value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new EngineError(`${label} is required`, 'VALIDATION_FAILED');
  }

  return trimmed;
}

function trimApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new EngineError('OpenRouter API key is required', 'VALIDATION_FAILED');
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
    throw new EngineError(`Character web not found: ${webId}`, 'RESOURCE_NOT_FOUND');
  }

  return web;
}

function buildWebContext(
  web: SavedCharacterWeb,
  characterName: string,
): CharacterWebContext {
  const assignment = web.assignments.find(
    (candidate) => normalizeName(candidate.characterName) === normalizeName(characterName),
  );

  if (assignment === undefined) {
    throw new EngineError(
      `Character ${characterName} not found in web ${web.id} assignments`,
      'VALIDATION_FAILED',
    );
  }

  return {
    assignment,
    protagonistName: web.protagonistName,
    relationshipArchetypes: web.relationshipArchetypes,
    castDynamicsSummary: web.castDynamicsSummary,
  };
}

function isMissingCharacterError(error: unknown, charId: string): boolean {
  return (
    error instanceof Error &&
    error.message === `Developed character not found: ${charId}`
  );
}

async function loadRequiredCharacter(
  deps: CharacterWebServiceDeps,
  charId: string,
): Promise<SavedDevelopedCharacter> {
  try {
    return await deps.loadDevelopedCharacter(charId);
  } catch (error) {
    if (isMissingCharacterError(error, charId)) {
      throw new EngineError(`Developed character not found: ${charId}`, 'RESOURCE_NOT_FOUND');
    }

    throw error;
  }
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

async function deriveInputsFromConcept(
  deps: CharacterWebServiceDeps,
  sourceConceptId: string,
  userNotes?: string,
): Promise<CastPipelineInputs> {
  const concept = await deps.loadConcept(sourceConceptId);
  if (concept === null) {
    throw new EngineError(`Concept not found: ${sourceConceptId}`, 'RESOURCE_NOT_FOUND');
  }

  const kernel = await deps.loadKernel(concept.sourceKernelId);
  if (kernel === null) {
    throw new EngineError(
      `Kernel not found: ${concept.sourceKernelId}`,
      'RESOURCE_NOT_FOUND',
    );
  }

  const k = kernel.evaluatedKernel.kernel;
  const kernelSummary =
    k.dramaticThesis +
    (k.opposingForce ? `\nOpposition: ${k.opposingForce}` : '') +
    (k.thematicQuestion ? `\nQuestion: ${k.thematicQuestion}` : '');

  const c = concept.evaluatedConcept.concept;
  const conceptSummary =
    (c.oneLineHook ?? '') +
    (c.elevatorParagraph ? `\n${c.elevatorParagraph}` : '');

  return {
    kernelSummary: kernelSummary.trim() || undefined,
    conceptSummary: conceptSummary.trim() || undefined,
    userNotes: userNotes?.trim() ?? undefined,
    storyKernel: kernel.evaluatedKernel.kernel,
    conceptSpec: concept.evaluatedConcept.concept,
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

    const derivedInputs = await deriveInputsFromConcept(
      deps,
      web.sourceConceptId,
      web.inputs.userNotes,
    );

    emitGenerationStage(onStage, 'GENERATING_CHARACTER_WEB', 'started', attempt);
    const generation = await deps.generateCharacterWeb(derivedInputs, trimmedApiKey);
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
    async createWeb(
      name: string,
      sourceConceptId: string,
      userNotes?: string,
    ): Promise<SavedCharacterWeb> {
      const trimmedConceptId = trimRequired('Source concept id', sourceConceptId);
      const now = deps.now();
      const web: SavedCharacterWeb = {
        id: deps.createId(),
        name: trimRequired('Character web name', name),
        createdAt: now,
        updatedAt: now,
        sourceConceptId: trimmedConceptId,
        protagonistName: '',
        inputs: {
          userNotes: trimOptional(userNotes),
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
      requireWeb(trimmedWebId, await deps.loadCharacterWeb(trimmedWebId));
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
        throw new EngineError(
          `Character ${trimmedCharacterName} is not assigned in character web ${trimmedWebId}`,
          'VALIDATION_FAILED',
        );
      }

      const existingCharacters = await deps.listDevelopedCharactersByWebId(trimmedWebId);
      const duplicate = existingCharacters.find(
        (candidate) =>
          normalizeName(candidate.characterName) === normalizeName(assignment.characterName),
      );

      if (duplicate !== undefined) {
        throw new EngineError(
          `Developed character already exists for ${assignment.characterName} in character web ${trimmedWebId}`,
          'RESOURCE_CONFLICT',
        );
      }

      const now = deps.now();
      const character: SavedDevelopedCharacter = {
        id: deps.createId(),
        characterName: assignment.characterName,
        createdAt: now,
        updatedAt: now,
        sourceWebId: web.id,
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
      const character = await loadRequiredCharacter(deps, trimmedCharId);
      const web = requireWeb(
        character.sourceWebId,
        await deps.loadCharacterWeb(character.sourceWebId),
      );

      const derivedInputs = await deriveInputsFromConcept(
        deps,
        web.sourceConceptId,
        web.inputs.userNotes,
      );

      const otherDevelopedCharacters =
        stage === 4
          ? (await deps.listDevelopedCharactersByWebId(character.sourceWebId)).filter(
              (candidate) => candidate.id !== character.id,
            )
          : undefined;

      const webContext = buildWebContext(web, character.characterName);

      const result = await deps.runCharacterStage({
        character,
        stage,
        apiKey: trimApiKey(apiKey),
        inputs: derivedInputs,
        webContext,
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
      const character = await loadRequiredCharacter(deps, trimmedCharId);
      const web = requireWeb(
        character.sourceWebId,
        await deps.loadCharacterWeb(character.sourceWebId),
      );

      const derivedInputs = await deriveInputsFromConcept(
        deps,
        web.sourceConceptId,
        web.inputs.userNotes,
      );

      const resetCharacter = resetCharacterFromStage(character, stage, deps.now());
      const otherDevelopedCharacters =
        stage === 4
          ? (await deps.listDevelopedCharactersByWebId(character.sourceWebId)).filter(
              (candidate) => candidate.id !== character.id,
            )
          : undefined;

      const webContext = buildWebContext(web, character.characterName);

      const result = await deps.runCharacterStage({
        character: resetCharacter,
        stage,
        apiKey: trimApiKey(apiKey),
        inputs: derivedInputs,
        webContext,
        otherDevelopedCharacters,
        onGenerationStage: onStage,
      });

      await deps.saveDevelopedCharacter(result.updatedCharacter);
      return result.updatedCharacter;
    },

    async loadCharacter(charId: string): Promise<SavedDevelopedCharacter | null> {
      const trimmedCharId = trimRequired('Character id', charId);

      try {
        return await loadRequiredCharacter(deps, trimmedCharId);
      } catch (error) {
        if (error instanceof EngineError && error.code === 'RESOURCE_NOT_FOUND') {
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
          const webCtx = buildWebContext(web, developedCharacter.characterName);
          return deps.toDecomposedCharacter(developedCharacter, webCtx);
        }

        return deps.toDecomposedCharacterFromWeb(
          assignment,
          web.relationshipArchetypes,
          web.protagonistName,
        );
      });
    },

    async patchCharacterStage(
      charId: string,
      stage: CharacterDevStage,
      payload: unknown,
    ): Promise<SavedDevelopedCharacter> {
      const trimmedCharId = trimRequired('Character id', charId);
      const character = await loadRequiredCharacter(deps, trimmedCharId);

      if (!character.completedStages.includes(stage)) {
        throw new EngineError(
          `Stage ${stage} has not been completed yet — cannot patch`,
          'VALIDATION_FAILED',
        );
      }

      validateStagePayload(stage, payload);

      const stageFieldMap: Record<CharacterDevStage, string> = {
        1: 'characterKernel',
        2: 'tridimensionalProfile',
        3: 'agencyModel',
        4: 'deepRelationships',
        5: 'textualPresentation',
      };

      const fieldName = stageFieldMap[stage];
      const existingData = character[fieldName as keyof typeof character] as unknown as Record<string, unknown>;
      const patchData = payload as Record<string, unknown>;
      const mergedData = { ...existingData, ...patchData };

      const updated: SavedDevelopedCharacter = {
        ...character,
        updatedAt: deps.now(),
        [fieldName]: mergedData,
      };

      await deps.saveDevelopedCharacter(updated);
      return updated;
    },

    async patchWeb(webId: string, payload: unknown): Promise<SavedCharacterWeb> {
      const trimmedWebId = trimRequired('Character web id', webId);
      const web = requireWeb(trimmedWebId, await deps.loadCharacterWeb(trimmedWebId));
      const validated = validateWebPatchPayload(payload);

      let updatedAssignments = web.assignments;
      if (validated.assignments !== undefined) {
        updatedAssignments = web.assignments.map((existing) => {
          const patch = validated.assignments!.find(
            (entry) => normalizeName(entry.characterName) === normalizeName(existing.characterName),
          );

          if (patch === undefined) {
            return existing;
          }

          return {
            ...existing,
            narrativeRole: patch.narrativeRole,
            conflictRelationship: patch.conflictRelationship,
          };
        });

        const unknownNames = validated.assignments.filter(
          (entry) =>
            !web.assignments.some(
              (existing) =>
                normalizeName(existing.characterName) === normalizeName(entry.characterName),
            ),
        );

        if (unknownNames.length > 0) {
          throw new EngineError(
            `Unknown character names: ${unknownNames.map((entry) => entry.characterName).join(', ')}`,
            'VALIDATION_FAILED',
          );
        }
      }

      let updatedRelationships = web.relationshipArchetypes;
      if (validated.relationshipArchetypes !== undefined) {
        updatedRelationships = web.relationshipArchetypes.map((existing) => {
          const patch = validated.relationshipArchetypes!.find(
            (entry) =>
              normalizeName(entry.fromCharacter) === normalizeName(existing.fromCharacter) &&
              normalizeName(entry.toCharacter) === normalizeName(existing.toCharacter),
          );

          if (patch === undefined) {
            return existing;
          }

          return {
            ...existing,
            essentialTension: patch.essentialTension,
          };
        });

        const unknownPairs = validated.relationshipArchetypes.filter(
          (entry) =>
            !web.relationshipArchetypes.some(
              (existing) =>
                normalizeName(existing.fromCharacter) === normalizeName(entry.fromCharacter) &&
                normalizeName(existing.toCharacter) === normalizeName(entry.toCharacter),
            ),
        );

        if (unknownPairs.length > 0) {
          throw new EngineError(
            `Unknown relationship pairs: ${unknownPairs.map((entry) => `${entry.fromCharacter} → ${entry.toCharacter}`).join(', ')}`,
            'VALIDATION_FAILED',
          );
        }
      }

      const updatedWeb: SavedCharacterWeb = {
        ...web,
        updatedAt: deps.now(),
        castDynamicsSummary: validated.castDynamicsSummary ?? web.castDynamicsSummary,
        assignments: updatedAssignments,
        relationshipArchetypes: updatedRelationships,
      };

      await deps.saveCharacterWeb(updatedWeb);
      return updatedWeb;
    },
  };
}

export const characterWebService = createCharacterWebService();
