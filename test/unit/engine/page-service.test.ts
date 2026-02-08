import { generateContinuationPage, generateOpeningPage } from '../../../src/llm';
import {
  createBeatDeviation,
  createChoice,
  createInitialVersionedStructure,
  createNoDeviation,
  createPage,
  createStory,
  parsePageId,
  Story,
  StructureVersionId,
  VersionedStoryStructure,
} from '../../../src/models';
import { createInitialStructureState } from '../../../src/engine/structure-state';
import { createStructureRewriter } from '../../../src/engine/structure-rewriter';
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

jest.mock('../../../src/engine/structure-rewriter', () => ({
  createStructureRewriter: jest.fn(),
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

const mockedCreateStructureRewriter = createStructureRewriter as jest.MockedFunction<typeof createStructureRewriter>;

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
      const initialVersion = createInitialVersionedStructure(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: ['Hide in the print shop', 'Bribe a gate sergeant'],
        currentLocation: 'The capital square at dusk',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Curfew in effect'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'caution',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'arriving during curfew',
          secondaryEmotions: [],
          dominantMotivation: 'find safe passage',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
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
      expect(page.structureVersionId).toBe(initialVersion.id);
      expect(page.choices.map(choice => choice.text)).toEqual([
        'Hide in the print shop',
        'Bribe a gate sergeant',
      ]);
      expect(updatedStory.globalCanon).toContain('The city enforces nightly curfew');
      expect(updatedStory.structure).toEqual(structure);
    });

    it('throws INVALID_STRUCTURE_VERSION when story has structure but no versions', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure }); // Has structure but no structureVersions

      let error: unknown;
      try {
        await generateFirstPage(story, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('no structure versions');
      expect(mockedGenerateOpeningPage).not.toHaveBeenCalled();
    });

    it('uses empty structure state and omits structure context when story has no structure', async () => {
      const story = buildStory();

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You arrive under curfew bells as paper ash drifts across the square.',
        choices: ['Hide in the print shop', 'Bribe a gate sergeant'],
        currentLocation: 'The capital square at dusk',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Curfew in effect'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['The city enforces nightly curfew'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'caution',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'arriving during curfew',
          secondaryEmotions: [],
          dominantMotivation: 'find safe passage',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
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

    it('assigns structureVersionId to first page when story has structure versions', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialVersion],
      });

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You slip through the checkpoint as dusk falls.',
        choices: ['Head to the safe house', 'Scout the perimeter'],
        currentLocation: 'Inside the city walls',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'relief',
          primaryIntensity: 'mild' as const,
          primaryCause: 'successfully entering the city',
          secondaryEmotions: [],
          dominantMotivation: 'find safe shelter',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
      });

      const { page } = await generateFirstPage(story, 'test-key');

      // First page should have the initial structure version ID for branch isolation
      expect(page.structureVersionId).toBe(initialVersion.id);
    });

    it('leaves structureVersionId null when story has no structure versions', async () => {
      const story = buildStory(); // No structure, no versions

      mockedGenerateOpeningPage.mockResolvedValue({
        narrative: 'You begin your journey.',
        choices: ['Go north', 'Go south'],
        currentLocation: 'The starting point',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'anticipation',
          primaryIntensity: 'mild' as const,
          primaryCause: 'beginning the journey',
          secondaryEmotions: [],
          dominantMotivation: 'explore the world',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
      });

      const { page } = await generateFirstPage(story, 'test-key');

      expect(page.structureVersionId).toBeNull();
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
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(7);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You move across wet tiles while patrol torches sweep below.',
        choices: ['Leap to the clocktower', 'Drop into the market canopy'],
        currentLocation: 'Rooftops above the market district',
        threatsAdded: ['THREAT_patrol: Patrol torches scanning below'],
        threatsRemoved: [],
        constraintsAdded: ['CONSTRAINT_stealth: Must move quietly'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: ['Clocktower guards rotate every ten minutes'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'focus',
          primaryIntensity: 'strong' as const,
          primaryCause: 'navigating the rooftops',
          secondaryEmotions: [],
          dominantMotivation: 'reach the clocktower unseen',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
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
      // With new active state fields, old accumulatedState.changes only contains parent state (no new additions)
      expect(page.accumulatedState.changes).toEqual(parentPage.accumulatedState.changes);
      // New active state is in accumulatedActiveState
      expect(page.accumulatedActiveState.currentLocation).toBe('Rooftops above the market district');
      // Active state uses tagged entries with prefix/description/raw structure
      expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
      expect(page.accumulatedActiveState.activeConstraints).toHaveLength(1);
      expect(updatedStory.globalCanon).toContain('Clocktower guards rotate every ten minutes');
    });

    it('throws INVALID_STRUCTURE_VERSION when story has structure but no versions', async () => {
      const structure = buildStructure();
      const story = buildStory({ structure }); // Has structure but no structureVersions
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

      let error: unknown;
      try {
        await generateNextPage(story, parentPage, 0, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('no structure versions');
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
    });

    it('advances structure state when continuation result concludes the current beat', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You secure forged papers in a shuttered print cellar.',
        choices: [createChoice('Approach the archive checkpoint'), createChoice('Scout the sewer hatch')],
        stateChanges: { added: ['Acquired forged transit seal'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'The checkpoint captain stamps your seal and waves you through.',
        choices: ['Enter the archive corridor', 'Detour to the guard locker'],
        currentLocation: 'Inside the censors bureau',
        threatsAdded: [],
        threatsRemoved: ['Checkpoint security'],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['Access the records archive'],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'satisfaction',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'passing the checkpoint successfully',
          secondaryEmotions: [],
          dominantMotivation: 'reach the target ledgers',
        },
        isEnding: false,
        beatConcluded: true,
        beatResolution: 'The forged transit seal got you through the checkpoint.',
        rawResponse: 'raw',
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
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You wait beside the archive gate until patrols shift.',
        choices: [createChoice('Slip in behind a clerk'), createChoice('Retreat before dawn')],
        stateChanges: { added: ['Observed patrol rotation'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You stay hidden and gather more intel from passing clerks.',
        choices: ['Keep watching', 'Create a distraction'],
        currentLocation: 'Hidden near the archive gate',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['Mapped sentry rotation patterns'],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'patience',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'gathering intel carefully',
          secondaryEmotions: [],
          dominantMotivation: 'find the right moment',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(page.accumulatedStructureState).toBe(parentPage.accumulatedStructureState);
    });

    it('keeps structure progression isolated per branch', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({ structure, structureVersions: [initialVersion] });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'At the bureau wall, you choose speed or caution.',
        choices: [createChoice('Force a checkpoint pass'), createChoice('Gather more evidence first')],
        stateChanges: { added: ['Reached bureau perimeter'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(10);
      mockedGenerateContinuationPage
        .mockResolvedValueOnce({
          narrative: 'A forged seal gets you inside.',
          choices: ['Head for ledger room', 'Plant false records'],
          currentLocation: 'Inside the bureau',
          threatsAdded: [],
          threatsRemoved: ['Checkpoint guards'],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: [],
          threadsResolved: [],
          newCanonFacts: [],
          newCharacterCanonFacts: {},
          inventoryAdded: [],
          inventoryRemoved: [],
          healthAdded: [],
          healthRemoved: [],
          characterStateChangesAdded: [],
          characterStateChangesRemoved: [],
          protagonistAffect: {
            primaryEmotion: 'triumph',
            primaryIntensity: 'moderate' as const,
            primaryCause: 'breaching the checkpoint',
            secondaryEmotions: [],
            dominantMotivation: 'reach the ledger room',
          },
          isEnding: false,
          beatConcluded: true,
          beatResolution: 'Checkpoint breached with forged credentials.',
          rawResponse: 'raw',
        } as Awaited<ReturnType<typeof generateContinuationPage>>)
        .mockResolvedValueOnce({
          narrative: 'You hold position and log patrol timing.',
          choices: ['Create diversion', 'Withdraw'],
          currentLocation: 'Hidden observation post',
          threatsAdded: [],
          threatsRemoved: [],
          constraintsAdded: [],
          constraintsRemoved: [],
          threadsAdded: ['Patrol schedule documented'],
          threadsResolved: [],
          newCanonFacts: [],
          newCharacterCanonFacts: {},
          inventoryAdded: [],
          inventoryRemoved: [],
          healthAdded: [],
          healthRemoved: [],
          characterStateChangesAdded: [],
          characterStateChangesRemoved: [],
          protagonistAffect: {
            primaryEmotion: 'patience',
            primaryIntensity: 'moderate' as const,
            primaryCause: 'gathering critical intel',
            secondaryEmotions: [],
            dominantMotivation: 'find the right moment',
          },
          isEnding: false,
          beatConcluded: false,
          beatResolution: '',
          rawResponse: 'raw',
        });

      const branchOne = await generateNextPage(story, parentPage, 0, 'test-key');
      const branchTwo = await generateNextPage(story, parentPage, 1, 'test-key');

      expect(branchOne.page.accumulatedStructureState.currentBeatIndex).toBe(1);
      expect(branchTwo.page.accumulatedStructureState).toBe(parentPage.accumulatedStructureState);
      expect(parentPage.accumulatedStructureState.currentBeatIndex).toBe(0);
    });

    it('does not trigger structure rewrite when deviation is not detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider your next move.',
        choices: [createChoice('Proceed carefully'), createChoice('Rush ahead')],
        stateChanges: { added: ['Assessed situation'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You move carefully through the shadows.',
        choices: ['Continue forward', 'Take alternate route'],
        currentLocation: 'Shadow corridor',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'stealth',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'moving unseen',
          secondaryEmotions: [],
          dominantMotivation: 'remain undetected',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createNoDeviation(),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
      expect(page.structureVersionId).toBe(initialStructureVersion.id);
      expect(updatedStory.structureVersions).toHaveLength(1);
      expect(updatedStory.structureVersions?.[0]?.id).toBe(initialStructureVersion.id);
    });

    it('triggers structure rewrite and creates new version when deviation is detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider betraying your original mission.',
        choices: [createChoice('Join imperial command'), createChoice('Stay with resistance')],
        stateChanges: { added: ['Mission allegiance uncertain'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'Outmaneuver the imperial intelligence network.',
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Imperial Service',
            objective: 'Prove loyalty to the empire',
            stakes: 'Discovery means execution',
            entryCondition: 'After defection',
            beats: [
              {
                id: '1.1',
                description: 'Accept imperial posting',
                objective: 'Gain trust within command structure',
              },
              {
                id: '1.2',
                description: 'First loyalty test',
                objective: 'Prove allegiance to new masters',
              },
            ],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You publicly defect and swear service to the empire.',
        choices: ['Take command posting', 'Return as double agent'],
        currentLocation: 'Imperial command hall',
        threatsAdded: ['Resistance hunting you'],
        threatsRemoved: ['Imperial suspicion'],
        constraintsAdded: ['Must prove loyalty'],
        constraintsRemoved: [],
        threadsAdded: ['Serve imperial command'],
        threadsResolved: ['Infiltrate the empire'],
        newCanonFacts: ['Resistance branded you a traitor'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'determination',
          primaryIntensity: 'strong' as const,
          primaryCause: 'committing to the new path',
          secondaryEmotions: [],
          dominantMotivation: 'prove worth to new masters',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createBeatDeviation(
          'Current infiltration beats are invalid after defection.',
          ['1.2'],
          'Protagonist joined imperial command hierarchy.',
        ),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedCreateStructureRewriter).toHaveBeenCalled();
      expect(mockRewriter.rewriteStructure).toHaveBeenCalledWith(
        expect.objectContaining({
          characterConcept: story.characterConcept,
          worldbuilding: story.worldbuilding,
          tone: story.tone,
          deviationReason: 'Current infiltration beats are invalid after defection.',
          narrativeSummary: 'Protagonist joined imperial command hierarchy.',
        }),
        'test-key',
      );

      expect(page.id).toBe(3);
      expect(page.parentPageId).toBe(parentPage.id);
      expect(page.structureVersionId).not.toBe(initialStructureVersion.id);
      expect(page.structureVersionId).not.toBeNull();

      expect(updatedStory.structureVersions).toHaveLength(2);
      expect(updatedStory.structureVersions?.[1]?.previousVersionId).toBe(initialStructureVersion.id);
      expect(updatedStory.structureVersions?.[1]?.rewriteReason).toBe(
        'Current infiltration beats are invalid after defection.',
      );
      expect(updatedStory.structureVersions?.[1]?.createdAtPageId).toBe(page.id);
      expect(updatedStory.globalCanon).toContain('Resistance branded you a traitor');
    });

    it('uses parent page structureVersionId for branch isolation instead of latest version', async () => {
      // Setup: Create v1 structure and parent page using v1
      const structureV1 = buildStructure();
      const versionV1 = createInitialVersionedStructure(structureV1);
      const parentStructureState = createInitialStructureState(structureV1);

      // Create a rewritten structure v2 (simulating another branch caused a rewrite)
      const structureV2: StoryStructure = {
        overallTheme: 'Rewritten theme from another branch.',
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Different Path',
            objective: 'Different objective',
            stakes: 'Different stakes',
            entryCondition: 'Different entry',
            beats: [
              { id: '1.1', description: 'Different beat 1', objective: 'Different obj 1' },
              { id: '1.2', description: 'Different beat 2', objective: 'Different obj 2' },
            ],
          },
        ],
      };
      const versionV2: VersionedStoryStructure = {
        id: 'sv-9999999999999-v2v2' as StructureVersionId,
        structure: structureV2,
        previousVersionId: versionV1.id,
        createdAtPageId: parsePageId(99),
        rewriteReason: 'Another branch caused this rewrite',
        preservedBeatIds: [],
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      };

      // Story has BOTH versions (v1 is original, v2 was created by another branch)
      // story.structure points to v2 (the "latest")
      const story = buildStory({
        structure: structureV2, // Latest structure is v2
        structureVersions: [versionV1, versionV2], // Both versions exist
      });

      // Parent page was created with v1 (before the rewrite in another branch)
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You stand at a crossroads in the archive.',
        choices: [createChoice('Take the left passage'), createChoice('Take the right passage')],
        stateChanges: { added: ['Reached crossroads'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: versionV1.id, // Parent was created with v1!
      });

      mockedStorage.getMaxPageId.mockResolvedValue(100);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You proceed down the left passage.',
        choices: ['Continue forward', 'Turn back'],
        currentLocation: 'Left passage in the archive',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'curiosity',
          primaryIntensity: 'mild' as const,
          primaryCause: 'exploring the archive',
          secondaryEmotions: [],
          dominantMotivation: 'find the records',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
      });

      const { page } = await generateNextPage(story, parentPage, 0, 'test-key');

      // CRITICAL: The new page should use v1 (parent's version), NOT v2 (latest)
      expect(page.structureVersionId).toBe(versionV1.id);

      // The LLM should have been called with v1's structure, not v2's
      expect(mockedGenerateContinuationPage).toHaveBeenCalledWith(
        expect.objectContaining({
          structure: structureV1, // Should be v1, not v2!
        }),
        { apiKey: 'test-key' },
      );
    });

    it('throws INVALID_STRUCTURE_VERSION when parent page has null structureVersionId but story has structure', async () => {
      const structure = buildStructure();
      const initialVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);

      const story = buildStory({
        structure,
        structureVersions: [initialVersion],
      });

      // Parent page has null structureVersionId - this is now invalid for structured stories
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Legacy page without version tracking.',
        choices: [createChoice('Proceed'), createChoice('Stay back')],
        stateChanges: { added: ['Started'], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: null, // No version ID - invalid for structured stories
      });

      let error: unknown;
      try {
        await generateNextPage(story, parentPage, 0, 'test-key');
      } catch (e) {
        error = e;
      }

      expect(error).toMatchObject({
        name: 'EngineError',
        code: 'INVALID_STRUCTURE_VERSION',
      });
      expect((error as Error).message).toContain('null structureVersionId');
      expect(mockedStorage.getMaxPageId).not.toHaveBeenCalled();
      expect(mockedGenerateContinuationPage).not.toHaveBeenCalled();
    });

    it('does not trigger rewrite when story has no structure', async () => {
      // Story without structure at all - no rewrite should occur
      const story = buildStory(); // No structure, no versions
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider betraying your original mission.',
        choices: [createChoice('Join imperial command'), createChoice('Stay with resistance')],
        stateChanges: { added: ['Mission allegiance uncertain'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You publicly defect and swear service to the empire.',
        choices: ['Take command posting', 'Return as double agent'],
        currentLocation: 'Imperial command hall',
        threatsAdded: ['Resistance hunters'],
        threatsRemoved: [],
        constraintsAdded: ['Prove loyalty'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'resolve',
          primaryIntensity: 'strong' as const,
          primaryCause: 'choosing a new path',
          secondaryEmotions: [],
          dominantMotivation: 'survive the transition',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createBeatDeviation(
          'Deviation reason.',
          ['1.2'],
          'Narrative summary.',
        ),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { page, updatedStory } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(mockedCreateStructureRewriter).not.toHaveBeenCalled();
      expect(page.structureVersionId).toBeNull();
      // Story without structure has no structureVersions
      expect(updatedStory.structureVersions).toHaveLength(0);
    });

    it('returns deviationInfo when deviation is detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You consider a dramatic change of course.',
        choices: [createChoice('Betray allies'), createChoice('Stay loyal')],
        stateChanges: { added: ['At crossroads'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'New path theme.',
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'New Path',
            objective: 'Follow new direction',
            stakes: 'Everything',
            entryCondition: 'After betrayal',
            beats: [
              { id: '1.1', description: 'Accept new role', objective: 'Establish new identity' },
            ],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You betray your allies.',
        choices: ['Embrace new life', 'Second thoughts'],
        currentLocation: 'The aftermath of betrayal',
        threatsAdded: ['Former allies seek revenge'],
        threatsRemoved: [],
        constraintsAdded: ['Trust broken'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: ['Alliance with companions'],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'guilt',
          primaryIntensity: 'strong' as const,
          primaryCause: 'betraying trusted allies',
          secondaryEmotions: [],
          dominantMotivation: 'justify the betrayal',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createBeatDeviation(
          'Player chose to betray allies, invalidating trust-based beats.',
          ['1.1', '1.2'],
          'Alliance shattered after betrayal.',
        ),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { deviationInfo } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(deviationInfo).toBeDefined();
      expect(deviationInfo?.detected).toBe(true);
      expect(deviationInfo?.reason).toBe('Player chose to betray allies, invalidating trust-based beats.');
      expect(deviationInfo?.beatsInvalidated).toBe(2);
    });

    it('returns undefined deviationInfo when no deviation detected', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(2),
        narrativeText: 'You proceed normally.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        stateChanges: { added: ['Proceeding'], removed: [] },
        isEnding: false,
        parentPageId: parsePageId(1),
        parentChoiceIndex: 0,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      mockedStorage.getMaxPageId.mockResolvedValue(2);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You continue on your path.',
        choices: ['Keep going', 'Rest'],
        currentLocation: 'The road ahead',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'determination',
          primaryIntensity: 'mild' as const,
          primaryCause: 'steady progress',
          secondaryEmotions: [],
          dominantMotivation: 'keep moving forward',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createNoDeviation(),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const { deviationInfo } = await generateNextPage(story, parentPage, 0, 'test-key');

      expect(deviationInfo).toBeUndefined();
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
        currentLocation: 'The tavern cellar entrance',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: ['Contact the resistance'],
        threadsResolved: [],
        newCanonFacts: ['Resistance uses songs as ciphers'],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'hope',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'finding resistance allies',
          secondaryEmotions: [],
          dominantMotivation: 'make contact',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
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
        currentLocation: 'Hidden in the shadows',
        threatsAdded: [],
        threatsRemoved: [],
        constraintsAdded: ['Time pressure'],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'tension',
          primaryIntensity: 'moderate' as const,
          primaryCause: 'waiting for patrol to pass',
          secondaryEmotions: [],
          dominantMotivation: 'remain undetected',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
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

    it('returns undefined deviationInfo when loading cached page', async () => {
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
        narrativeText: 'Cached page',
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
      expect(result.deviationInfo).toBeUndefined();
    });

    it('passes through deviationInfo when generating new page with deviation', async () => {
      const structure = buildStructure();
      const initialStructureVersion = createInitialVersionedStructure(structure);
      const parentStructureState = createInitialStructureState(structure);
      const story = buildStory({
        structure,
        structureVersions: [initialStructureVersion],
      });
      const parentPage = createPage({
        id: parsePageId(1),
        narrativeText: 'Root',
        choices: [createChoice('Deviate'), createChoice('Normal')],
        stateChanges: { added: [], removed: [] },
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        parentAccumulatedStructureState: parentStructureState,
        structureVersionId: initialStructureVersion.id,
      });

      const rewrittenStructure: StoryStructure = {
        overallTheme: 'Rewritten after deviation.',
        generatedAt: new Date('2026-01-02T00:00:00.000Z'),
        acts: [
          {
            id: '1',
            name: 'Deviated Path',
            objective: 'New direction',
            stakes: 'High',
            entryCondition: 'After deviation',
            beats: [{ id: '1.1', description: 'New beat', objective: 'New objective' }],
          },
        ],
      };

      const mockRewriter = {
        rewriteStructure: jest.fn().mockResolvedValue({
          structure: rewrittenStructure,
          preservedBeatIds: [],
          rawResponse: 'rewritten',
        }),
      };
      mockedCreateStructureRewriter.mockReturnValue(mockRewriter);

      mockedStorage.getMaxPageId.mockResolvedValue(1);
      mockedGenerateContinuationPage.mockResolvedValue({
        narrative: 'You deviate from the plan.',
        choices: ['New choice 1', 'New choice 2'],
        currentLocation: 'An unexpected path',
        threatsAdded: ['Unknown consequences'],
        threatsRemoved: [],
        constraintsAdded: [],
        constraintsRemoved: [],
        threadsAdded: [],
        threadsResolved: [],
        newCanonFacts: [],
        newCharacterCanonFacts: {},
        inventoryAdded: [],
        inventoryRemoved: [],
        healthAdded: [],
        healthRemoved: [],
        characterStateChangesAdded: [],
        characterStateChangesRemoved: [],
        protagonistAffect: {
          primaryEmotion: 'uncertainty',
          primaryIntensity: 'strong' as const,
          primaryCause: 'choosing an unexpected path',
          secondaryEmotions: [],
          dominantMotivation: 'explore new possibilities',
        },
        isEnding: false,
        beatConcluded: false,
        beatResolution: '',
        rawResponse: 'raw',
        deviation: createBeatDeviation(
          'Story deviated from planned beats.',
          ['1.1'],
          'Player chose unexpected path.',
        ),
      } as Awaited<ReturnType<typeof generateContinuationPage>>);

      const result = await getOrGeneratePage(story, parentPage, 0, 'test-key');

      expect(result.wasGenerated).toBe(true);
      expect(result.deviationInfo).toBeDefined();
      expect(result.deviationInfo?.detected).toBe(true);
      expect(result.deviationInfo?.reason).toBe('Story deviated from planned beats.');
      expect(result.deviationInfo?.beatsInvalidated).toBe(1);
    });
  });
});
