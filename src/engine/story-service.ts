import { contextualizeCharacters } from '../llm/character-contextualizer.js';
import { decomposeEntities, generateStoryStructure } from '../llm';
import { decomposeWorldbuilding } from '../llm/worldbuilding-decomposer.js';
import type { SelectedSceneDirection } from '../models/scene-direction.js';
import type { StandaloneDecomposedCharacter } from '../models/standalone-decomposed-character.js';
import { buildInitialNpcRelationships } from '../models/state/npc-relationship';
import {
  createStory,
  Page,
  PageId,
  parsePageId,
  Story,
  StoryId,
  StoryMetadata,
  updateStoryStructure,
} from '../models';
import { loadCharacter } from '../persistence/character-repository.js';
import { storage } from '../persistence';
import { generatePage } from './page-service';
import { createStoryStructure } from './structure-factory';
import { EngineError, PrepareStoryResult, StartStoryOptions, StartStoryResult } from './types';

function validateStartStoryOptions(options: StartStoryOptions): void {
  const title = options.title.trim();
  if (title.length === 0) {
    throw new EngineError('Title is required', 'VALIDATION_FAILED');
  }

  const characterConcept = options.characterConcept.trim();
  if (characterConcept.length < 10) {
    throw new EngineError('Character concept must be at least 10 characters', 'VALIDATION_FAILED');
  }

  if (options.apiKey.trim().length === 0) {
    throw new EngineError('API key is required', 'VALIDATION_FAILED');
  }

  if (!options.spine) {
    throw new EngineError('Story spine is required', 'VALIDATION_FAILED');
  }
}

async function loadStandaloneCharacters(
  protagonistCharacterId: string,
  npcCharacterIds: readonly string[]
): Promise<StandaloneDecomposedCharacter[]> {
  const allIds = [protagonistCharacterId, ...npcCharacterIds];
  const characters = await Promise.all(allIds.map((id) => loadCharacter(id)));
  const missing = allIds.filter((id, i) => !characters[i]);
  if (missing.length > 0) {
    throw new EngineError(
      `Characters not found: ${missing.join(', ')}`,
      'VALIDATION_FAILED'
    );
  }
  return characters.map((c) => c!);
}

async function runNewDecompositionPipeline(
  story: Story,
  options: StartStoryOptions
): Promise<Story> {
  const standaloneCharacters = await loadStandaloneCharacters(
    options.protagonistCharacterId!,
    options.npcCharacterIds ?? []
  );

  // Run character contextualization and (optionally) worldbuilding decomposition in parallel
  options.onGenerationStage?.({
    stage: 'CONTEXTUALIZING_CHARACTERS',
    status: 'started',
    attempt: 1,
  });

  const worldAlreadyDecomposed = story.decomposedWorld && story.decomposedWorld.facts.length > 0;

  if (!worldAlreadyDecomposed) {
    options.onGenerationStage?.({
      stage: 'DECOMPOSING_WORLD',
      status: 'started',
      attempt: 1,
    });
  }

  const contextualizationPromise = contextualizeCharacters(
    {
      characters: standaloneCharacters,
      protagonistIndex: 0,
      spine: story.spine!,
      tone: story.tone,
      toneFeel: story.toneFeel,
      toneAvoid: story.toneAvoid,
      startingSituation: story.startingSituation,
      conceptSpec: story.conceptSpec,
      storyKernel: story.storyKernel,
    },
    options.apiKey
  );

  const worldbuildingPromise = worldAlreadyDecomposed
    ? Promise.resolve(null)
    : decomposeWorldbuilding(
        {
          worldbuilding: story.worldbuilding ?? '',
          tone: story.tone,
          toneFeel: story.toneFeel,
          toneAvoid: story.toneAvoid,
          spine: story.spine,
        },
        options.apiKey
      );

  const [contextualizationResult, worldbuildingResult] = await Promise.all([
    contextualizationPromise,
    worldbuildingPromise,
  ]);

  options.onGenerationStage?.({
    stage: 'CONTEXTUALIZING_CHARACTERS',
    status: 'completed',
    attempt: 1,
  });

  if (!worldAlreadyDecomposed) {
    options.onGenerationStage?.({
      stage: 'DECOMPOSING_WORLD',
      status: 'completed',
      attempt: 1,
    });
  }

  const initialNpcRelationships = buildInitialNpcRelationships(
    contextualizationResult.decomposedCharacters
  );

  const finalDecomposedWorld = worldAlreadyDecomposed
    ? story.decomposedWorld
    : worldbuildingResult!.decomposedWorld;

  return {
    ...story,
    decomposedCharacters: contextualizationResult.decomposedCharacters,
    decomposedWorld: finalDecomposedWorld,
    ...(initialNpcRelationships.length > 0 ? { initialNpcRelationships } : {}),
  };
}

async function runLegacyDecompositionPipeline(
  story: Story,
  options: StartStoryOptions
): Promise<Story> {
  options.onGenerationStage?.({
    stage: 'DECOMPOSING_ENTITIES',
    status: 'started',
    attempt: 1,
  });
  const decompositionContext = {
    characterConcept: story.characterConcept,
    worldbuilding: story.worldbuilding,
    tone: story.tone,
    toneFeel: story.toneFeel,
    toneAvoid: story.toneAvoid,
    npcs: story.npcs,
    spine: story.spine,
    conceptSpec: story.conceptSpec,
    storyKernel: story.storyKernel,
    startingSituation: story.startingSituation,
  };
  const decompositionResult = await decomposeEntities(decompositionContext, options.apiKey);
  options.onGenerationStage?.({
    stage: 'DECOMPOSING_ENTITIES',
    status: 'completed',
    attempt: 1,
  });

  const initialNpcRelationships = buildInitialNpcRelationships(
    decompositionResult.decomposedCharacters
  );

  return {
    ...story,
    decomposedCharacters: decompositionResult.decomposedCharacters,
    decomposedWorld: decompositionResult.decomposedWorld,
    ...(initialNpcRelationships.length > 0 ? { initialNpcRelationships } : {}),
  };
}

async function buildPreparedStory(
  options: StartStoryOptions,
  onStoryCreated?: (story: Story) => void
): Promise<Story> {
  validateStartStoryOptions(options);

  const premisePromises = (options.conceptVerification?.premisePromises ?? [])
    .map((promise) => promise.trim())
    .filter((promise) => promise.length > 0);
  const trimmedTitle = options.title.trim();
  const trimmedCharacterConcept = options.characterConcept.trim();

  let story: Story = {
    ...createStory({
      title: trimmedTitle,
      characterConcept: trimmedCharacterConcept,
      worldbuilding: options.worldbuilding,
      tone: options.tone,
      ...(options.npcs ? { npcs: options.npcs } : {}),
      ...(options.protagonistCharacterId
        ? { protagonistCharacterId: options.protagonistCharacterId }
        : {}),
      ...(options.npcCharacterIds && options.npcCharacterIds.length > 0
        ? { npcCharacterIds: options.npcCharacterIds }
        : {}),
      ...(options.startingSituation ? { startingSituation: options.startingSituation } : {}),
      ...(options.conceptSpec ? { conceptSpec: options.conceptSpec } : {}),
      ...(options.storyKernel ? { storyKernel: options.storyKernel } : {}),
      ...(premisePromises.length > 0 ? { premisePromises } : {}),
    }),
    spine: options.spine,
    toneFeel: options.spine.toneFeel,
    toneAvoid: options.spine.toneAvoid,
  };

  // Pre-load worldbuilding asset if worldbuildingId is provided
  if (options.worldbuildingId) {
    const { loadWorldbuildingById } = await import('../services/worldbuilding-service.js');
    const wb = await loadWorldbuildingById(options.worldbuildingId);
    if (wb?.decomposedWorld) {
      story = { ...story, decomposedWorld: wb.decomposedWorld };
    }
  }

  onStoryCreated?.(story);

  await storage.saveStory(story);

  // Stage 1: Decompose — new pipeline (character IDs) or legacy (raw NPCs)
  const useNewPipeline = Boolean(options.protagonistCharacterId);
  story = useNewPipeline
    ? await runNewDecompositionPipeline(story, options)
    : await runLegacyDecompositionPipeline(story, options);
  await storage.updateStory(story);

  const structureResult = await generateStoryStructure(
    {
      tone: story.tone,
      startingSituation: story.startingSituation,
      spine: story.spine,
      decomposedCharacters: story.decomposedCharacters!,
      decomposedWorld: story.decomposedWorld!,
      conceptSpec: story.conceptSpec,
      storyKernel: story.storyKernel,
      conceptVerification: options.conceptVerification,
    },
    options.apiKey,
    { onGenerationStage: options.onGenerationStage }
  );

  const structure = createStoryStructure(structureResult);
  story = updateStoryStructure(story, structure);

  if (structureResult.initialNpcAgendas && structureResult.initialNpcAgendas.length > 0) {
    story = {
      ...story,
      initialNpcAgendas: structureResult.initialNpcAgendas,
    };
  }

  await storage.updateStory(story);

  return story;
}

function assertStoryPrepared(story: Story): void {
  if (!story.structure || !story.decomposedCharacters) {
    throw new EngineError(`Story ${story.id} is not prepared`, 'STORY_NOT_PREPARED');
  }
}

export async function prepareStory(options: StartStoryOptions): Promise<PrepareStoryResult> {
  let storyId: StoryId | null = null;

  try {
    const preparedStory = await buildPreparedStory(options, (story) => {
      storyId = story.id;
    });
    return { story: preparedStory };
  } catch (error) {
    if (storyId) {
      try {
        await storage.deleteStory(storyId);
      } catch {
        // Preserve the original error from creation flow.
      }
    }

    throw error;
  }
}

export async function generateOpeningPage(
  storyId: StoryId,
  apiKey: string,
  onGenerationStage?: StartStoryOptions['onGenerationStage'],
  selectedSceneDirection?: SelectedSceneDirection
): Promise<StartStoryResult> {
  if (apiKey.trim().length === 0) {
    throw new EngineError('API key is required', 'VALIDATION_FAILED');
  }

  const story = await loadStory(storyId);
  if (!story) {
    throw new EngineError(`Story ${storyId} not found`, 'STORY_NOT_FOUND');
  }
  assertStoryPrepared(story);

  const existingPage = await getStartingPage(storyId);
  if (existingPage) {
    return { story, page: existingPage };
  }

  const { page, updatedStory } = await generatePage(
    'opening', story, apiKey, undefined, onGenerationStage, selectedSceneDirection
  );

  await storage.savePage(storyId, page);
  if (updatedStory !== story) {
    await storage.updateStory(updatedStory);
  }

  return { story: updatedStory, page };
}

export async function startNewStory(options: StartStoryOptions): Promise<StartStoryResult> {
  let storyId: StoryId | null = null;
  try {
    const prepared = await prepareStory(options);
    storyId = prepared.story.id;
    const { page, updatedStory } = await generatePage(
      'opening',
      prepared.story,
      options.apiKey,
      undefined,
      options.onGenerationStage
    );

    await storage.savePage(storyId, page);
    if (updatedStory !== prepared.story) {
      await storage.updateStory(updatedStory);
    }

    return { story: updatedStory, page };
  } catch (error) {
    if (storyId) {
      try {
        await storage.deleteStory(storyId);
      } catch {
        // Preserve the original error from creation flow.
      }
    }

    throw error;
  }
}

export async function loadStory(storyId: StoryId): Promise<Story | null> {
  return storage.loadStory(storyId);
}

export async function getPage(storyId: StoryId, pageId: PageId): Promise<Page | null> {
  return storage.loadPage(storyId, pageId);
}

export async function getStartingPage(storyId: StoryId): Promise<Page | null> {
  return storage.loadPage(storyId, parsePageId(1));
}

export async function listAllStories(): Promise<StoryMetadata[]> {
  return storage.listStories();
}

export async function deleteStory(storyId: StoryId): Promise<void> {
  return storage.deleteStory(storyId);
}

export async function getStoryStats(storyId: StoryId): Promise<{
  pageCount: number;
  exploredBranches: number;
  totalBranches: number;
  hasEnding: boolean;
}> {
  const pages = await storage.loadAllPages(storyId);

  let exploredBranches = 0;
  let totalBranches = 0;
  let hasEnding = false;

  for (const page of pages.values()) {
    if (page.isEnding) {
      hasEnding = true;
    }

    for (const choice of page.choices) {
      totalBranches += 1;
      if (choice.nextPageId !== null) {
        exploredBranches += 1;
      }
    }
  }

  return {
    pageCount: pages.size,
    exploredBranches,
    totalBranches,
    hasEnding,
  };
}
