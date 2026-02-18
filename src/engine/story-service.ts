import { decomposeEntities, generateStoryStructure } from '../llm';
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

async function buildPreparedStory(
  options: StartStoryOptions,
  onStoryCreated?: (story: Story) => void
): Promise<Story> {
  validateStartStoryOptions(options);

  let story: Story = {
    ...createStory({
      title: options.title.trim(),
      characterConcept: options.characterConcept.trim(),
      worldbuilding: options.worldbuilding,
      tone: options.tone,
      npcs: options.npcs,
      startingSituation: options.startingSituation,
      conceptSpec: options.conceptSpec,
    }),
    spine: options.spine,
    toneFeel: options.spine.toneFeel,
    toneAvoid: options.spine.toneAvoid,
  };

  onStoryCreated?.(story);

  await storage.saveStory(story);

  // Stage 1: Decompose entities (uses toneFeel from spine)
  options.onGenerationStage?.({
    stage: 'DECOMPOSING_ENTITIES',
    status: 'started',
    attempt: 1,
  });
  const decompositionResult = await decomposeEntities(
    {
      characterConcept: story.characterConcept,
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      toneFeel: story.toneFeel,
      toneAvoid: story.toneAvoid,
      npcs: story.npcs,
    },
    options.apiKey
  );
  options.onGenerationStage?.({
    stage: 'DECOMPOSING_ENTITIES',
    status: 'completed',
    attempt: 1,
  });
  const initialNpcRelationships = buildInitialNpcRelationships(
    decompositionResult.decomposedCharacters
  );
  story = {
    ...story,
    decomposedCharacters: decompositionResult.decomposedCharacters,
    decomposedWorld: decompositionResult.decomposedWorld,
    ...(initialNpcRelationships.length > 0 ? { initialNpcRelationships } : {}),
  };
  await storage.updateStory(story);

  // Stage 2: Generate structure (uses spine + decomposed data)
  options.onGenerationStage?.({
    stage: 'STRUCTURING_STORY',
    status: 'started',
    attempt: 1,
  });
  const structureResult = await generateStoryStructure(
    {
      worldbuilding: story.worldbuilding,
      tone: story.tone,
      npcs: story.npcs,
      startingSituation: story.startingSituation,
      spine: story.spine,
      decomposedCharacters: story.decomposedCharacters,
      decomposedWorld: story.decomposedWorld,
    },
    options.apiKey
  );
  options.onGenerationStage?.({
    stage: 'STRUCTURING_STORY',
    status: 'completed',
    attempt: 1,
  });

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
  onGenerationStage?: StartStoryOptions['onGenerationStage']
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

  const { page, updatedStory } = await generatePage('opening', story, apiKey, undefined, onGenerationStage);

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
