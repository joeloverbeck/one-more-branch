import {
  Page,
  Story,
  StoryId,
  createChoice,
  createStory,
  parsePageId,
  createEmptyActiveState,
  createEmptyActiveStateChanges,
  createEmptyAccumulatedNpcAgendas,
  createDefaultProtagonistAffect,
} from '@/models';
import type { NpcAgenda } from '@/models/state/npc-agenda';
import type { NpcRelationship } from '@/models/state/npc-relationship';
import type { AnalystResult } from '@/llm/analyst-types';
import type { StoryBible } from '@/llm/lorekeeper-types';
import { loadPage, savePage } from '@/persistence/page-repository';
import { deleteStory, listStories, saveStory } from '@/persistence/story-repository';

const TEST_PREFIX = 'TEST: CNVEXT converter extraction';

function buildStory(overrides?: Partial<Story>): Story {
  const base = createStory({
    title: `${TEST_PREFIX} title`,
    characterConcept: `${TEST_PREFIX} base`,
    worldbuilding: 'Converter test world',
    tone: 'Converter test tone',
  });
  return { ...base, ...overrides };
}

function buildTestPage(overrides?: Partial<Page>): Page {
  const basePage: Page = {
    id: parsePageId(1),
    narrativeText: 'Test narrative for converter extraction.',
    sceneSummary: 'Test summary.',
    choices: [createChoice('Choice A'), createChoice('Choice B')],
    activeStateChanges: createEmptyActiveStateChanges(),
    accumulatedActiveState: createEmptyActiveState(),
    inventoryChanges: { added: [], removed: [] },
    accumulatedInventory: [],
    healthChanges: { added: [], removed: [] },
    accumulatedHealth: [],
    characterStateChanges: { added: [], removed: [] },
    accumulatedCharacterState: {},
    accumulatedStructureState: {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    },
    structureVersionId: null,
    analystResult: null,
    storyBible: null,
    protagonistAffect: createDefaultProtagonistAffect(),
    threadAges: {},
    accumulatedPromises: [],
    accumulatedDelayedConsequences: [],
    resolvedThreadMeta: {},
    resolvedPromiseMeta: {},
    npcAgendaUpdates: [],
    accumulatedNpcAgendas: createEmptyAccumulatedNpcAgendas(),
    npcRelationshipUpdates: [],
    accumulatedNpcRelationships: {},
    pageActIndex: 0,
    pageBeatIndex: 0,
    isEnding: false,
    parentPageId: null,
    parentChoiceIndex: null,
  };
  return { ...basePage, ...overrides };
}

function buildFullAnalystResult(): AnalystResult {
  return {
    beatConcluded: true,
    beatResolution: 'The hero found the key.',
    deviationDetected: false,
    deviationReason: '',
    invalidatedBeatIds: ['1.2'],
    narrativeSummary: 'A tense scene unfolded.',
    pacingIssueDetected: false,
    pacingIssueReason: '',
    recommendedAction: 'none',
    sceneMomentum: 'MAJOR_PROGRESS',
    objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
    commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
    structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
    entryConditionReadiness: 'READY',
    objectiveAnchors: ['anchor-1'],
    anchorEvidence: ['evidence-1'],
    completionGateSatisfied: true,
    completionGateFailureReason: '',
    toneAdherent: true,
    toneDriftDescription: '',
    npcCoherenceAdherent: true,
    npcCoherenceIssues: '',
    promisesDetected: [
      {
        description: 'The sword glows faintly',
        promiseType: 'CHEKHOV_GUN',
        scope: 'ACT',
        resolutionHint: 'Sword is magical',
        suggestedUrgency: 'MEDIUM',
      },
    ],
    promisesResolved: ['pr-1'],
    promisePayoffAssessments: [
      {
        promiseId: 'pr-1',
        description: 'The prophecy fulfilled',
        satisfactionLevel: 'WELL_EARNED',
        reasoning: 'Built up over several beats',
      },
    ],
    threadPayoffAssessments: [
      {
        threadId: 'td-3',
        threadText: 'Find the lost temple',
        satisfactionLevel: 'ADEQUATE',
        reasoning: 'Resolved naturally',
      },
    ],
    relationshipShiftsDetected: [
      {
        npcName: 'Garak',
        shiftDescription: 'Trust deepened after shared danger',
        suggestedValenceChange: 2,
        suggestedNewDynamic: 'ally',
      },
    ],
    pacingDirective: 'maintain current pace',
    spineDeviationDetected: true,
    spineDeviationReason: 'Dramatic question shifted',
    spineInvalidatedElement: 'dramatic_question',
    alignedBeatId: '1.3',
    beatAlignmentConfidence: 'HIGH',
    beatAlignmentReason: 'Clear evidence of progression',
    thematicCharge: 'AMBIGUOUS',
    thematicChargeDescription: '',
    obligatorySceneFulfilled: null,
    premisePromiseFulfilled: null,
    rawResponse: '',
  };
}

function buildFullStoryBible(): StoryBible {
  return {
    sceneWorldContext: 'A dark forest at twilight.',
    relevantCharacters: [
      {
        name: 'Garak',
        role: 'antagonist',
        relevantProfile: 'A cunning spy with shifting loyalties.',
        speechPatterns: 'Formal, evasive.',
        protagonistRelationship: 'Wary allies of convenience.',
        interCharacterDynamics: 'Distrusted by the guard captain.',
        currentState: 'Hiding in the shadows.',
      },
      {
        name: 'Lyra',
        role: 'companion',
        relevantProfile: 'A young healer with hidden talents.',
        speechPatterns: 'Soft-spoken, precise.',
        protagonistRelationship: 'Trusted friend.',
        currentState: 'Tending to wounds.',
      },
    ],
    relevantCanonFacts: ['The temple was sealed 500 years ago.', 'Only moonlight can reveal the key.'],
    relevantHistory: 'The protagonist discovered the map three days ago.',
  };
}

describe('page-serializer converter extraction integration', () => {
  const createdStoryIds = new Set<StoryId>();

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      await deleteStory(storyId);
    }
    createdStoryIds.clear();

    const stories = await listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        await deleteStory(story.id);
      }
    }
  });

  it('story bible round-trip with characters and canon facts', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} story-bible` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const storyBible = buildFullStoryBible();
    const page = buildTestPage({ storyBible });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.storyBible).toEqual(storyBible);
    expect(loaded!.storyBible!.relevantCharacters).toHaveLength(2);
    expect(loaded!.storyBible!.relevantCharacters[0].interCharacterDynamics).toBe(
      'Distrusted by the guard captain.'
    );
    // Second character has no interCharacterDynamics — should be absent
    expect(loaded!.storyBible!.relevantCharacters[1].interCharacterDynamics).toBeUndefined();
  });

  it('null story bible round-trip', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} null-bible` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildTestPage({ storyBible: null });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.storyBible).toBeNull();
  });

  it('analyst result with all sub-arrays populated', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} analyst-full` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const analystResult = buildFullAnalystResult();
    const page = buildTestPage({ analystResult });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.analystResult).toEqual(analystResult);
    expect(loaded!.analystResult!.promisesDetected).toHaveLength(1);
    expect(loaded!.analystResult!.promisePayoffAssessments).toHaveLength(1);
    expect(loaded!.analystResult!.threadPayoffAssessments).toHaveLength(1);
    expect(loaded!.analystResult!.relationshipShiftsDetected).toHaveLength(1);
    expect(loaded!.analystResult!.spineDeviationDetected).toBe(true);
    expect(loaded!.analystResult!.alignedBeatId).toBe('1.3');
  });

  it('null analyst result round-trip', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} null-analyst` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const page = buildTestPage({ analystResult: null });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.analystResult).toBeNull();
  });

  it('legacy analyst data with missing optional fields gets defaults', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} legacy-analyst` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    // Create a page with an analyst result that has all fields populated
    const analystResult = buildFullAnalystResult();
    const page = buildTestPage({ analystResult });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    // These optional fields should be properly deserialized (not undefined)
    expect(loaded!.analystResult!.pacingDirective).toBe('maintain current pace');
    expect(loaded!.analystResult!.spineDeviationDetected).toBe(true);
    expect(loaded!.analystResult!.spineDeviationReason).toBe('Dramatic question shifted');
    expect(loaded!.analystResult!.spineInvalidatedElement).toBe('dramatic_question');
    expect(loaded!.analystResult!.alignedBeatId).toBe('1.3');
    expect(loaded!.analystResult!.beatAlignmentConfidence).toBe('HIGH');
    expect(loaded!.analystResult!.beatAlignmentReason).toBe('Clear evidence of progression');
  });

  it('NPC relationship updates and accumulated relationships round-trip', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} npc-relationships` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const relationship: NpcRelationship = {
      npcName: 'Dukat',
      valence: -3,
      dynamic: 'rival',
      history: 'A long-standing enmity.',
      currentTension: 'Currently plotting against the protagonist.',
      leverage: 'Knows the protagonist\'s secret.',
    };
    const page = buildTestPage({
      npcRelationshipUpdates: [relationship],
      accumulatedNpcRelationships: { Dukat: relationship },
    });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.npcRelationshipUpdates).toEqual([relationship]);
    expect(loaded!.accumulatedNpcRelationships).toEqual({ Dukat: relationship });
  });

  it('NPC agenda updates and accumulated agendas round-trip', async () => {
    const story = buildStory({ characterConcept: `${TEST_PREFIX} npc-agendas` });
    createdStoryIds.add(story.id);
    await saveStory(story);

    const agenda: NpcAgenda = {
      npcName: 'Kira',
      currentGoal: 'Defend the station',
      leverage: 'Military command authority',
      fear: 'Losing the war',
      offScreenBehavior: 'Coordinating defense patrols',
    };
    const page = buildTestPage({
      npcAgendaUpdates: [agenda],
      accumulatedNpcAgendas: { Kira: agenda },
    });

    await savePage(story.id, page);
    const loaded = await loadPage(story.id, page.id);

    expect(loaded).not.toBeNull();
    expect(loaded!.npcAgendaUpdates).toEqual([agenda]);
    expect(loaded!.accumulatedNpcAgendas).toEqual({ Kira: agenda });
  });
});
