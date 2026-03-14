import type { GenerationStageCallback, GenerationStage } from '../engine/types.js';
import { runGenerationStage } from '../engine/generation-pipeline-helpers.js';
import { EngineError } from '../engine/types.js';
import type {
  CastPipelineInputs,
  CharacterDevStage,
} from '../models/character-pipeline-types.js';
import type { CharacterWebContext } from '../models/saved-developed-character.js';
import {
  canGenerateCharacterStage,
  type SavedDevelopedCharacter,
} from '../models/saved-developed-character.js';
import { generateCharAgency } from './char-agency-generation.js';
import { generateCharKernel } from './char-kernel-generation.js';
import { generateCharPresentation } from './char-presentation-generation.js';
import { generateCharRelationships } from './char-relationships-generation.js';
import { generateCharTridimensional } from './char-tridimensional-generation.js';

export interface RunCharacterStageInput {
  readonly character: SavedDevelopedCharacter;
  readonly stage: CharacterDevStage;
  readonly apiKey: string;
  readonly inputs: CastPipelineInputs;
  readonly webContext: CharacterWebContext;
  readonly otherDevelopedCharacters?: readonly SavedDevelopedCharacter[];
  readonly onGenerationStage?: GenerationStageCallback;
}

export interface RunCharacterStageResult {
  readonly updatedCharacter: SavedDevelopedCharacter;
  readonly rawResponse: string;
}

export interface CharacterStageRunnerDeps {
  readonly generateCharKernel: typeof generateCharKernel;
  readonly generateCharTridimensional: typeof generateCharTridimensional;
  readonly generateCharAgency: typeof generateCharAgency;
  readonly generateCharRelationships: typeof generateCharRelationships;
  readonly generateCharPresentation: typeof generateCharPresentation;
}

const defaultDeps: CharacterStageRunnerDeps = {
  generateCharKernel,
  generateCharTridimensional,
  generateCharAgency,
  generateCharRelationships,
  generateCharPresentation,
};

const STAGE_EVENTS: Record<CharacterDevStage, GenerationStage> = {
  1: 'GENERATING_CHAR_KERNEL',
  2: 'GENERATING_CHAR_TRIDIMENSIONAL',
  3: 'GENERATING_CHAR_AGENCY',
  4: 'GENERATING_CHAR_RELATIONSHIPS',
  5: 'GENERATING_CHAR_PRESENTATION',
};

function requireApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length < 10) {
    throw new EngineError('API key is required', 'VALIDATION_FAILED');
  }

  return trimmed;
}

function requireStageData<T>(
  value: T | null,
  characterName: string,
  stageName: string,
): T {
  if (value === null) {
    throw new EngineError(
      `${characterName} is missing required ${stageName} data`,
      'VALIDATION_FAILED',
    );
  }

  return value;
}

function buildCompletedStages(
  completedStages: readonly CharacterDevStage[],
  stage: CharacterDevStage,
): CharacterDevStage[] {
  return Array.from(new Set([...completedStages, stage])).sort((left, right) => left - right);
}

function validateStagePreconditions(
  character: SavedDevelopedCharacter,
  stage: CharacterDevStage,
): void {
  if (!canGenerateCharacterStage(character, stage)) {
    const prerequisiteStage = stage - 1;
    throw new EngineError(
      `Cannot generate stage ${stage} for ${character.characterName} before stage ${prerequisiteStage} is complete`,
      'VALIDATION_FAILED',
    );
  }
}

export async function runCharacterStage(
  input: RunCharacterStageInput,
  deps: CharacterStageRunnerDeps = defaultDeps,
): Promise<RunCharacterStageResult> {
  const apiKey = requireApiKey(input.apiKey);
  const { character, stage, inputs, webContext, otherDevelopedCharacters, onGenerationStage } = input;

  validateStagePreconditions(character, stage);

  const stageEvent = STAGE_EVENTS[stage];

  switch (stage) {
    case 1: {
      const result = await runGenerationStage(onGenerationStage, stageEvent, () =>
        deps.generateCharKernel(
          {
            webContext,
            ...inputs,
          },
          apiKey,
        ),
      );

      return {
        updatedCharacter: {
          ...character,
          characterKernel: result.characterKernel,
          updatedAt: new Date().toISOString(),
          completedStages: buildCompletedStages(character.completedStages, stage),
        },
        rawResponse: result.rawResponse,
      };
    }

    case 2: {
      const characterKernel = requireStageData(
        character.characterKernel,
        character.characterName,
        'character kernel',
      );

      const result = await runGenerationStage(onGenerationStage, stageEvent, () =>
        deps.generateCharTridimensional(
          {
            webContext,
            characterKernel,
            ...inputs,
          },
          apiKey,
        ),
      );

      return {
        updatedCharacter: {
          ...character,
          tridimensionalProfile: result.tridimensionalProfile,
          updatedAt: new Date().toISOString(),
          completedStages: buildCompletedStages(character.completedStages, stage),
        },
        rawResponse: result.rawResponse,
      };
    }

    case 3: {
      const characterKernel = requireStageData(
        character.characterKernel,
        character.characterName,
        'character kernel',
      );
      const tridimensionalProfile = requireStageData(
        character.tridimensionalProfile,
        character.characterName,
        'tridimensional profile',
      );

      const result = await runGenerationStage(onGenerationStage, stageEvent, () =>
        deps.generateCharAgency(
          {
            webContext,
            characterKernel,
            tridimensionalProfile,
            ...inputs,
          },
          apiKey,
        ),
      );

      return {
        updatedCharacter: {
          ...character,
          agencyModel: result.agencyModel,
          updatedAt: new Date().toISOString(),
          completedStages: buildCompletedStages(character.completedStages, stage),
        },
        rawResponse: result.rawResponse,
      };
    }

    case 4: {
      const characterKernel = requireStageData(
        character.characterKernel,
        character.characterName,
        'character kernel',
      );
      const tridimensionalProfile = requireStageData(
        character.tridimensionalProfile,
        character.characterName,
        'tridimensional profile',
      );
      const agencyModel = requireStageData(
        character.agencyModel,
        character.characterName,
        'agency model',
      );

      const result = await runGenerationStage(onGenerationStage, stageEvent, () =>
        deps.generateCharRelationships(
          {
            webContext,
            characterKernel,
            tridimensionalProfile,
            agencyModel,
            otherDevelopedCharacters,
            ...inputs,
          },
          apiKey,
        ),
      );

      return {
        updatedCharacter: {
          ...character,
          deepRelationships: result.deepRelationships,
          updatedAt: new Date().toISOString(),
          completedStages: buildCompletedStages(character.completedStages, stage),
        },
        rawResponse: result.rawResponse,
      };
    }

    case 5: {
      const characterKernel = requireStageData(
        character.characterKernel,
        character.characterName,
        'character kernel',
      );
      const tridimensionalProfile = requireStageData(
        character.tridimensionalProfile,
        character.characterName,
        'tridimensional profile',
      );
      const agencyModel = requireStageData(
        character.agencyModel,
        character.characterName,
        'agency model',
      );
      const deepRelationships = requireStageData(
        character.deepRelationships,
        character.characterName,
        'deep relationships',
      );

      const result = await runGenerationStage(onGenerationStage, stageEvent, () =>
        deps.generateCharPresentation(
          {
            webContext,
            characterKernel,
            tridimensionalProfile,
            agencyModel,
            deepRelationships,
            ...inputs,
          },
          apiKey,
        ),
      );

      return {
        updatedCharacter: {
          ...character,
          textualPresentation: result.textualPresentation,
          updatedAt: new Date().toISOString(),
          completedStages: buildCompletedStages(character.completedStages, stage),
        },
        rawResponse: result.rawResponse,
      };
    }
  }
}
