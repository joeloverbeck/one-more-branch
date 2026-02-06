import { generateContinuationPage, generateOpeningPage } from '../../../src/llm';
import { createChoice, createPage, createStory, parsePageId, Story } from '../../../src/models';
import { storage } from '../../../src/persistence';
import { EngineError } from '../../../src/engine/types';
import { generateFirstPage, generateNextPage, getOrGeneratePage } from '../../../src/engine/page-service';

jest.mock('../../../src/llm', () => ({
  generateOpeningPage: jest.fn(),
  generateContinuationPage: jest.fn(),
}));

jest.mock('../../../src/persistence', () => ({
  storage: {
    getMaxPageId: jest.fn(),
    loadPage: jest.fn(),
    savePage: jest.fn(),
    updateChoiceLink: jest.fn(),
    updateStory: jest.fn(),
  },
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateContinuationPage = generateContinuationPage as jest.MockedFunction<
  typeof generateContinuationPage
>;

const mockedStorage = storage as {
  getMaxPageId: jest.Mock;
  loadPage: jest.Mock;
  savePage: jest.Mock;
  updateChoiceLink: jest.Mock;
  updateStory: jest.Mock;
};

function buildStory(overrides?: Partial<Story>): Story {
  return {
    ...createStory({
      characterConcept: 'A courier smuggling letters through occupied cities',
      worldbuilding: 'A fractured empire with watchtowers on every road',
      tone: 'tense espionage',
    }),
    ...overrides,
  };
}

describe('page-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFirstPage', () => {
    it('creates root page and updates story canon + arc from LLM output', async () => {
      const story = buildStory();

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: ['Hide in the print shop', 'Bribe a gate sergeant'],
        stateChangesAdded: ['Reached the capital at dusk'],
        stateChangesRemoved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
        storyArc: 'Deliver the decoded treaty to the resistance safely.',
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateFirstPage(story, 'test-key');

      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        {
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
        },
        { apiKey: 'test-key' },
      );
      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
      expect(page.choices.map(choice => choice.text)).toEqual([
        'Hide in the print shop',
        'Bribe a gate sergeant',
      ]);
      expect(updatedStory.globalCanon).toContain('The city enforces nightly curfew');
      expect(updatedStory.storyArc).toBe('Deliver the decoded treaty to the resistance safely.');
    });
  });

  describe('generateNextPage', () => {
    it('throws INVALID_CHOICE for out-of-bounds index', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: ['Started mission'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await expect(generateNextPage(story, parentPage, 3, 'test-key')).rejects.toMatchObject({
        name: 'EngineError',
        code: 'INVALID_CHOICE',
      });
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });

    it('creates child page with proper parent linkage and sequential id', async () => {
      const story = buildStory({
        globalCanon: ['The watch captain is corrupt'],
        storyArc: 'Survive the city and deliver the treaty.',
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You slip into an alley lit by furnace smoke.',
        choices: [createChoice('Take the rooftops'), createChoice('Use the sewer tunnels')],
        stateChanges: { added: ['Escaped the checkpoint'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: { changes: ['Reached the capital at dusk'] },
      });

      mockedStorage.getMaxPageId.mockResolvedValue(7);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You move across wet tiles while patrol torches sweep below.',
        choices: ['Leap to the clocktower', 'Drop into the market canopy'],
        stateChangesAdded: ['Gained rooftop position'],
        stateChangesRemoved: [],
        newCanonFacts: ['Clocktower guards rotate every ten minutes'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedStorage.getMaxPageId).toHaveBeenCalledWith(story.id);
      expect(mockedGenerateContinuationPage).toHaveBeenCalledWith(
        expect.objectContaining({
          previousNarrative: parentPage.narrativeText,
          selectedChoice: parentPage.choices[0]?.text,
          accumulatedState: parentPage.accumulatedState.changes,
        }),
        { apiKey: 'test-key' },
      );
      expect(page.id).toBe(8);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.parentChoiceIndex).toBe(0);
      expect(page.accumulatedState.changes).toEqual([
        ...parentPage.accumulatedState.changes,
        'Gained rooftop position',
      ]);
      expect(updatedStory.globalCanon).toContain('Clocktower guards rotate every ten minutes');
    });
  });

  describe('getOrGeneratePage', () => {
    it('returns existing page without regeneration when choice already linked', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A', parsePageId(2)), createChoice('B')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const existingPage = createPage({
        id: parsePageId(2),
        narrativeText: 'Existing',
        choices: [],
        stateChanges: { added: [], removed: [] },
        isEnding: true,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedState: parentPage.accumulatedState,
      });

      mockedStorage.loadPage.mockResolvedValue(existingPage);

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(false);
      expect(result.page).toBe(existingPage);
      expect(result.story).toBe(story);
      expect(mockedGenerateContinuationPage).not.toHaveBeenCalled();
      expect(mockedStorage.savePage).not.toHaveBeenCalled();
      expect(mockedStorage.updateChoiceLink).not.toHaveBeenCalled();
      expect(mockedStorage.updateStory).not.toHaveBeenCalled();
    });

    it('throws PAGE_NOT_FOUND when linked next page is missing', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A', parsePageId(3)), createChoice('B')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.loadPage.mockResolvedValue(null);

      await expect(getOrGeneratePage(story, parentPage, 0, 'test-key')).rejects.toMatchObject({
        name: 'EngineError',
        code: 'PAGE_NOT_FOUND',
      });
    });

    it('generates, saves, and links a new page for unexplored choices', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: ['Started mission'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'A coded anthem drifts from the tavern cellar.',
        choices: ['Signal the contact', 'Circle back to the docks'],
        stateChangesAdded: ['Located resistance contact point'],
        stateChangesRemoved: [],
        newCanonFacts: ['Resistance uses songs as ciphers'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(true);
      expect(result.page.id).toBe(2);
      expect(mockedStorage.savePage).toHaveBeenCalledWith(story.id, result.page);
      expect(mockedStorage.updateChoiceLink).toHaveBeenCalledWith(story.id, parentPage.id, 0, result.page.id);
      expect(mockedStorage.updateStory).toHaveBeenCalledWith(result.story);
      expect(mockedStorage.savePage.mock.invocationCallOrder[0]).toBeLessThan(
        mockedStorage.updateChoiceLink.mock.invocationCallOrder[0],
      );
    });

    it('does not persist story when generation produces no canon or arc updates', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You wait in silence until the patrol passes.',
        choices: ['Move now', 'Wait longer'],
        stateChangesAdded: ['Lost time while hiding'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      await getOrGeneratePage(story, parentPage, 1, 'test-key');

      expect(mockedStorage.updateStory).not.toHaveBeenCalled();
    });

    it('throws INVALID_CHOICE for invalid choice index', async () => {
      const story = buildStory();
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('A'), createChoice('B')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });

      await expect(getOrGeneratePage(story, parentPage, -1, 'test-key')).rejects.toEqual(
        expect.objectContaining({
          code: 'INVALID_CHOICE',
        } as Partial<EngineError>),
      );
      expect(mockedStorage.loadPage).not.toHaveBeenCalled();
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });
  });
});
