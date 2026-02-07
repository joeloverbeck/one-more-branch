import { generateContinuationPage, generateOpeningPage } from '../../../src/llm';
import {
  createBeatDeviation,
  createChoice,
  createInitialVersionedStructure,
  createPage,
  createStory,
  parsePageId,
  Story,
} from '../../../src/models';
import { createInitialStructureState } from '../../../src/engine/structure-manager';
import { storage } from '../../../src/persistence';
import { EngineError } from '../../../src/engine/types';
import { generateFirstPage, generateNextPage, getOrGeneratePage } from '../../../src/engine/page-service';
import type { StoryStructure } from '../../../src/models/story-arc';

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
      title: 'Test Story',
      characterConcept: 'A courier smuggling letters through occupied cities',
      worldbuilding: 'A fractured empire with watchtowers on every road',
      tone: 'tense espionage',
    }),
    ...overrides,
  };
}

function buildStructure(): StoryStructure {
  return {
    overallTheme: 'Outmaneuver the imperial intelligence network.',
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Infiltration',
        objective: 'Get inside the censors bureau',
        stakes: 'All courier cells are exposed if you fail',
        entryCondition: 'Curfew patrols intensify',
        beats: [
          {
            id: '1.1',
            description: 'Secure a forged transit seal',
            objective: 'Gain access credentials',
          },
          {
            id: '1.2',
            description: 'Enter the records archive',
            objective: 'Reach the target ledgers',
          },
        ],
      },
    ],
  };
}

describe('page-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateFirstPage', () => {
    it('passes structure to opening context and uses initial structure state when present', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure });

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: ['Hide in the print shop', 'Bribe a gate sergeant'],
        stateChangesAdded: ['Reached the capital at dusk'],
        stateChangesRemoved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateFirstPage(story, 'test-key');

      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        {
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          structure,
        },
        { apiKey: 'test-key' },
      );
      expect(page.id).toBe(1);
      expect(page.parentPageId).toBeNull();
      expect(page.parentChoiceIndex).toBeNull();
      expect(page.accumulatedStructureState).toEqual(createInitialStructureState(structure));
      expect(page.choices.map(choice => choice.text)).toEqual([
        'Hide in the print shop',
        'Bribe a gate sergeant',
      ]);
      expect(updatedStory.globalCanon).toContain('The city enforces nightly curfew');
      expect(updatedStory.structure).toEqual(structure);
    });

    it('uses empty structure state and omits structure context when story has no structure', async () => {
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
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateFirstPage(story, 'test-key');

      expect(mockedGenerateOpeningPage).toHaveBeenCalledWith(
        {
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          structure: undefined,
        },
        { apiKey: 'test-key' },
      );
      expect(page.accumulatedStructureState).toEqual({
        currentActIndex: 0,
        currentBeatIndex: 0,
        beatProgressions: [],
      });
      expect(updatedStory.structure).toBeNull();
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
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        globalCanon: ['The watch captain is corrupt'],
        structure,
        structureVersions: [initialStructureVersion],
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
        parentAccumulatedStructureState: parentStructureState,
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
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedStorage.getMaxPageId).toHaveBeenCalledWith(story.id);
      expect(mockedGenerateContinuationPage).toHaveBeenCalledWith(
        expect.objectContaining({
          structure,
          accumulatedStructureState: parentStructureState,
          previousNarrative: parentPage.narrativeText,
          selectedChoice: parentPage.choices[0]?.text,
          accumulatedState: parentPage.accumulatedState.changes,
        }),
        { apiKey: 'test-key' },
      );
      expect(page.id).toBe(8);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.parentChoiceIndex).toBe(0);
      expect(page.structureVersionId).toBe(initialStructureVersion.id);
      expect(page.accumulatedState.changes).toEqual([
        ...parentPage.accumulatedState.changes,
        'Gained rooftop position',
      ]);
      expect(updatedStory.globalCanon).toContain('Clocktower guards rotate every ten minutes');
    });

    it('leaves structureVersionId null when no story structure versions exist', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You slip into the archive district after curfew.',
        choices: [createChoice('Scale the intake vent'), createChoice('Wait for guard change')],
        stateChanges: { added: ['Reached archive district'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: createInitialStructureState(structure),
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You keep to the shadows while patrols pass.',
        choices: ['Move to the vent', 'Retreat to safehouse'],
        stateChangesAdded: ['Stayed concealed'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.structureVersionId).toBeNull();
    });

    it('advances structure state when continuation result concludes the current beat', async () => {
      const structure = buildStructure();
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You secure forged papers in a shuttered print cellar.',
        choices: [createChoice('Approach the archive checkpoint'), createChoice('Scout the sewer hatch')],
        stateChanges: { added: ['Acquired forged transit seal'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'The checkpoint captain stamps your seal and waves you through.',
        choices: ['Enter the archive corridor', 'Detour to the guard locker'],
        stateChangesAdded: ['Entered censors bureau'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
        beatConcluded: true,
        beatResolution: 'The forged transit seal got you through the checkpoint.',
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState.currentActIndex).toBe(0);
      expect(page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.1',
        status: 'concluded',
        resolution: 'The forged transit seal got you through the checkpoint.',
      });
      expect(page.accumulatedStructureState.beatProgressions).toContainEqual({
        beatId: '1.2',
        status: 'active',
      });
    });

    it('keeps structure state unchanged when continuation result does not conclude the beat', async () => {
      const structure = buildStructure();
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You wait beside the archive gate until patrols shift.',
        choices: [createChoice('Slip in behind a clerk'), createChoice('Retreat before dawn')],
        stateChanges: { added: ['Observed patrol rotation'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You stay hidden and gather more intel from passing clerks.',
        choices: ['Keep watching', 'Create a distraction'],
        stateChangesAdded: ['Mapped sentry cadence'],
        stateChangesRemoved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState).toBe(parentPage.accumulatedStructureState);
    });

    it('keeps structure progression isolated per branch', async () => {
      const structure = buildStructure();
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'At the bureau wall, you choose speed or caution.',
        choices: [createChoice('Force a checkpoint pass'), createChoice('Gather more evidence first')],
        stateChanges: { added: ['Reached bureau perimeter'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(10);
      mockedGenerateContinuationPage
        .mockResolvedValueOnce({
          narrative: 'A forged seal gets you inside.',
          choices: ['Head for ledger room', 'Plant false records'],
          stateChangesAdded: ['Breached checkpoint'],
          stateChangesRemoved: [],
          newCanonFacts: [],
          newCharacterCanonFacts: {},
          inventoryAdded: [],
          inventoryRemoved: [],
          healthAdded: [],
          healthRemoved: [],
          characterStateChangesAdded: [],
          characterStateChangesRemoved: [],
          isEnding: false,
          rawResponse: 'raw',
          beatConcluded: true,
          beatResolution: 'Checkpoint breached with forged credentials.',
        } as Awaited<ReturnType<typeof generateContinuationPage>>)
        .mockResolvedValueOnce({
          narrative: 'You hold position and log patrol timing.',
          choices: ['Create diversion', 'Withdraw'],
          stateChangesAdded: ['Expanded patrol map'],
          stateChangesRemoved: [],
          newCanonFacts: [],
          newCharacterCanonFacts: {},
          inventoryAdded: [],
          inventoryRemoved: [],
          healthAdded: [],
          healthRemoved: [],
          characterStateChangesAdded: [],
          characterStateChangesRemoved: [],
          isEnding: false,
          rawResponse: 'raw',
        });

      const branchOne = await generateNextPage(story, parentPage, 0, 'test-key');
      const branchTwo = await generateNextPage(story, parentPage, 1, 'test-key');

      expect(branchOne.page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(branchTwo.page.accumulatedStructureState).toBe(parentPage.accumulatedStructureState);
      expect(parentPage.accumulatedStructureState.currentBeatIndex).toBe(0);
    });

    it('keeps generation behavior unchanged when deviation is present', async () => {
      const structure = buildStructure();
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider betraying your original mission.',
        choices: [createChoice('Join imperial command'), createChoice('Stay with resistance')],
        stateChanges: { added: ['Mission allegiance uncertain'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You publicly defect and swear service to the empire.',
        choices: ['Take command posting', 'Return as double agent'],
        stateChangesAdded: ['Aligned with imperial command'],
        stateChangesRemoved: [],
        newCanonFacts: ['Resistance branded you a traitor'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        isEnding: false,
        rawResponse: 'raw',
        deviation: createBeatDeviation(
          'Current infiltration beats are invalid after defection.',
          ['1.2'],
          'Protagonist joined imperial command hierarchy.',
        ),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.id).toBe(3);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.accumulatedStructureState).toBe(parentStructureState);
      expect(updatedStory.structure).toBe(story.structure);
      expect(updatedStory.globalCanon).toContain('Resistance branded you a traitor');
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
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
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
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
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
