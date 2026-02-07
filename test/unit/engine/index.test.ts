import {
  StoryEngine,
  storyEngine,
  startNewStory,
  loadStory,
  getPage,
  getStartingPage,
  listAllStories,
  deleteStory,
  getStoryStats,
  generateFirstPage,
  generateNextPage,
  getOrGeneratePage,
  createStoryStructure,
  createInitialStructureState,
  advanceStructureState,
  applyStructureProgression,
  createStructureRewriter,
  mergePreservedWithRegenerated,
  computeAccumulatedState,
  getParentAccumulatedState,
  mergeStateChanges,
  formatStateForDisplay,
  getRecentChanges,
  updateStoryWithNewCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
  EngineError,
} from '../../../src/engine';
import * as engineBarrel from '../../../src/engine';
import type {
  StartStoryResult,
  MakeChoiceResult,
  PlaySession,
  StartStoryOptions,
  MakeChoiceOptions,
  EngineErrorCode,
} from '../../../src/engine';
import { createPage, createStory, parsePageId, parseStoryId } from '../../../src/models';

describe('engine barrel export', () => {
  it('exports runtime API surface', () => {
    expect(StoryEngine).toBeDefined();
    expect(storyEngine).toBeInstanceOf(StoryEngine);

    expect(startNewStory).toBeDefined();
    expect(loadStory).toBeDefined();
    expect(getPage).toBeDefined();
    expect(getStartingPage).toBeDefined();
    expect(listAllStories).toBeDefined();
    expect(deleteStory).toBeDefined();
    expect(getStoryStats).toBeDefined();

    expect(generateFirstPage).toBeDefined();
    expect(generateNextPage).toBeDefined();
    expect(getOrGeneratePage).toBeDefined();
    expect(createStoryStructure).toBeDefined();
    expect(createInitialStructureState).toBeDefined();
    expect(advanceStructureState).toBeDefined();
    expect(applyStructureProgression).toBeDefined();
    expect(createStructureRewriter).toBeDefined();
    expect(mergePreservedWithRegenerated).toBeDefined();

    expect(computeAccumulatedState).toBeDefined();
    expect(getParentAccumulatedState).toBeDefined();
    expect(mergeStateChanges).toBeDefined();
    expect(formatStateForDisplay).toBeDefined();
    expect(getRecentChanges).toBeDefined();

    expect(updateStoryWithNewCanon).toBeDefined();
    expect(formatCanonForPrompt).toBeDefined();
    expect(mightContradictCanon).toBeDefined();
    expect(validateNewFacts).toBeDefined();

    expect(EngineError).toBeDefined();
  });

  it('supports type exports for engine public contracts', () => {
    const story = createStory({ title: 'Test Story', characterConcept: 'A courier in a city of mirrored alleys' });
    const page = createPage({
      id: parsePageId(1),
      narrativeText: 'Night rain fractures every lantern into twins.',
      choices: [],
      stateChanges: { added: [], removed: [] },
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    const startResult: StartStoryResult = { story, page };
    const makeChoiceResult: MakeChoiceResult = { page, wasGenerated: false };
    const playSession: PlaySession = {
      storyId: parseStoryId('550e8400-e29b-41d4-a716-446655440000'),
      currentPageId: parsePageId(1),
      apiKey: 'test-key',
    };
    const startOptions: StartStoryOptions = {
      characterConcept: 'A mapmaker who can redraw yesterday',
      tone: 'mysterious',
      apiKey: 'test-key',
    };
    const makeChoiceOptions: MakeChoiceOptions = {
      storyId: playSession.storyId,
      pageId: playSession.currentPageId,
      choiceIndex: 0,
      apiKey: 'test-key',
    };
    const engineErrorCode: EngineErrorCode = 'INVALID_CHOICE';

    expect(startResult.story.id).toBe(story.id);
    expect(makeChoiceResult.wasGenerated).toBe(false);
    expect(playSession.storyId).toBe(makeChoiceOptions.storyId);
    expect(startOptions.characterConcept.length).toBeGreaterThan(10);
    expect(engineErrorCode).toBe('INVALID_CHOICE');
  });

  it('does not export internal canon helper utilities', () => {
    const barrel = engineBarrel as unknown as Record<string, unknown>;

    expect(barrel.hasNegationPattern).toBeUndefined();
    expect(barrel.extractEntityTokens).toBeUndefined();
  });
});
