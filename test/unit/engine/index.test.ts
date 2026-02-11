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
  collectParentState,
  updateStoryWithNewCanon,
  formatCanonForPrompt,
  mightContradictCanon,
  validateNewFacts,
  StateReconciliationError,
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
  StateReconciliationResult,
  StateReconciliationFailure,
} from '../../../src/engine';
import { ThreadType, Urgency } from '../../../src/models/state/index';
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

    expect(collectParentState).toBeDefined();

    expect(updateStoryWithNewCanon).toBeDefined();
    expect(formatCanonForPrompt).toBeDefined();
    expect(mightContradictCanon).toBeDefined();
    expect(validateNewFacts).toBeDefined();
    expect(StateReconciliationError).toBeDefined();

    expect(EngineError).toBeDefined();
  });

  it('supports type exports for engine public contracts', () => {
    const story = createStory({ title: 'Test Story', characterConcept: 'A courier in a city of mirrored alleys' });
    const page = createPage({
      id: parsePageId(1),
      narrativeText: 'Night rain fractures every lantern into twins.',
      sceneSummary: 'Test summary of the scene events and consequences.',
      choices: [],
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
    const reconciliationResult: StateReconciliationResult = {
      currentLocation: 'Collapsed bridge',
      threatsAdded: ['Aftershock tremors'],
      threatsRemoved: ['Unstable planks'],
      constraintsAdded: ['Limited visibility from dust'],
      constraintsRemoved: [],
      threadsAdded: [{ text: 'Find stable route', threadType: ThreadType.MYSTERY, urgency: Urgency.MEDIUM }],
      threadsResolved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [{ characterName: 'Scout', states: ['focused'] }],
      characterStateChangesRemoved: [],
      newCanonFacts: ['The bridge collapsed after the crossing.'],
      newCharacterCanonFacts: {},
      reconciliationDiagnostics: [],
    };
    const reconciliationFailure: StateReconciliationFailure = {
      code: 'RECONCILIATION_FAILED',
      message: 'Missing evidence for thread resolution',
      diagnostics: [{ code: 'MISSING_EVIDENCE', message: 'No lexical evidence found', field: 'threadsResolved' }],
      retryable: true,
    };

    expect(startResult.story.id).toBe(story.id);
    expect(makeChoiceResult.wasGenerated).toBe(false);
    expect(playSession.storyId).toBe(makeChoiceOptions.storyId);
    expect(startOptions.characterConcept.length).toBeGreaterThan(10);
    expect(engineErrorCode).toBe('INVALID_CHOICE');
    expect(reconciliationResult.threadsAdded[0].urgency).toBe(Urgency.MEDIUM);
    expect(reconciliationFailure.retryable).toBe(true);
  });

  it('exposes StateReconciliationError failure serialization', () => {
    const error = new StateReconciliationError(
      'Evidence gate failed',
      'EVIDENCE_GATE_FAILED',
      [{ code: 'MISSING_EVIDENCE', message: 'Scene summary lacks thread anchor', field: 'threadsResolved' }],
      true,
    );

    expect(error.name).toBe('StateReconciliationError');
    expect(error.toFailure()).toEqual({
      code: 'EVIDENCE_GATE_FAILED',
      message: 'Evidence gate failed',
      diagnostics: [{ code: 'MISSING_EVIDENCE', message: 'Scene summary lacks thread anchor', field: 'threadsResolved' }],
      retryable: true,
    });
  });

  it('does not export internal canon helper utilities', () => {
    const barrel = engineBarrel as unknown as Record<string, unknown>;

    expect(barrel.hasNegationPattern).toBeUndefined();
    expect(barrel.extractEntityTokens).toBeUndefined();
  });
});
