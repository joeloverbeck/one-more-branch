import type { Request, Response, Router } from 'express';
import { storyEngine } from '@/engine';
import {
  generatePageWriterOutput,
  generateAnalystEvaluation,
  generateOpeningPage,
  generatePagePlan,
  generateStoryStructure,
} from '@/llm';
import { reconcileState } from '@/engine/state-reconciler';
import type { StateReconciliationResult } from '@/engine/state-reconciler-types';
import type { StoryId } from '@/models';
import type { WriterResult } from '@/llm/types';
import { playRoutes } from '@/server/routes/play';
import { storyRoutes } from '@/server/routes/stories';

jest.mock('@/llm', () => ({
  generateOpeningPage: jest.fn(),
  generatePageWriterOutput: jest.fn(),
  generateAnalystEvaluation: jest.fn(),
  generatePagePlan: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergeWriterAndAnalystResults: jest.requireActual('@/llm').mergeWriterAndAnalystResults,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
  mergePageWriterAndReconciledStateWithAnalystResults:
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    jest.requireActual('@/llm').mergePageWriterAndReconciledStateWithAnalystResults,
  generateStoryStructure: jest.fn(),
}));

jest.mock('@/logging/index', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), getEntries: jest.fn().mockReturnValue([]), clear: jest.fn() },
  logPrompt: jest.fn(),
}));

jest.mock('@/engine/state-reconciler', () => ({
  reconcileState: jest.fn(),
}));

const mockedGenerateOpeningPage = generateOpeningPage as jest.MockedFunction<typeof generateOpeningPage>;
const mockedGenerateWriterPage = generatePageWriterOutput as jest.MockedFunction<typeof generatePageWriterOutput>;
const mockedGenerateAnalystEvaluation = generateAnalystEvaluation as jest.MockedFunction<typeof generateAnalystEvaluation>;
const mockedGeneratePagePlan = generatePagePlan as jest.MockedFunction<typeof generatePagePlan>;
const mockedGenerateStoryStructure = generateStoryStructure as jest.MockedFunction<
  typeof generateStoryStructure
>;
const mockedReconcileState = reconcileState as jest.MockedFunction<typeof reconcileState>;

function passthroughReconciledState(
  writer: WriterResult,
  previousLocation: string,
): StateReconciliationResult {
  return {
    currentLocation: writer.currentLocation || previousLocation,
    threatsAdded: writer.threatsAdded,
    threatsRemoved: writer.threatsRemoved,
    constraintsAdded: writer.constraintsAdded,
    constraintsRemoved: writer.constraintsRemoved,
    threadsAdded: writer.threadsAdded,
    threadsResolved: writer.threadsResolved,
    inventoryAdded: writer.inventoryAdded,
    inventoryRemoved: writer.inventoryRemoved,
    healthAdded: writer.healthAdded,
    healthRemoved: writer.healthRemoved,
    characterStateChangesAdded: writer.characterStateChangesAdded,
    characterStateChangesRemoved: writer.characterStateChangesRemoved,
    newCanonFacts: writer.newCanonFacts,
    newCharacterCanonFacts: writer.newCharacterCanonFacts,
    reconciliationDiagnostics: [],
  };
}

const TEST_PREFIX = 'TEST USEINT-010 server integration';
const mockedStructureResult = {
  overallTheme: 'Survive and reveal hidden truths in a shifting world.',
  acts: [
    {
      name: 'Act I',
      objective: 'Establish immediate danger.',
      stakes: 'Failure traps the protagonist early.',
      entryCondition: 'A disruptive event forces movement.',
      beats: [
        { description: 'Assess first threat', objective: 'Avoid immediate collapse.' },
        { description: 'Choose initial direction', objective: 'Set investigation path.' },
      ],
    },
    {
      name: 'Act II',
      objective: 'Deepen conflict and gather leverage.',
      stakes: 'Failure empowers hostile forces.',
      entryCondition: 'The first choices expose broader conflict.',
      beats: [
        { description: 'Take a risky action', objective: 'Gain critical information.' },
        { description: 'Absorb consequences', objective: 'Preserve forward progress.' },
      ],
    },
    {
      name: 'Act III',
      objective: 'Reach final resolution.',
      stakes: 'Failure leaves permanent damage.',
      entryCondition: 'Enough information exists for decisive action.',
      beats: [
        { description: 'Commit final approach', objective: 'Align resources.' },
        { description: 'Deliver final move', objective: 'Resolve central conflict.' },
      ],
    },
  ],
  rawResponse: 'structure',
};

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

type ResMocks = {
  res: Response;
  status: jest.Mock;
  render: jest.Mock;
  redirect: jest.Mock;
  json: jest.Mock;
};

function getRouteHandler(
  router: Router,
  method: 'get' | 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (router.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found`);
  }

  return handler;
}

function createMockResponse(): ResMocks {
  const status = jest.fn().mockReturnThis();
  const render = jest.fn().mockReturnThis();
  const redirect = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();

  return {
    res: { status, render, redirect, json } as unknown as Response,
    status,
    render,
    redirect,
    json,
  };
}

function parseStoryIdFromRedirect(redirectCallArg: unknown): StoryId {
  const redirectLocation = String(redirectCallArg);
  const storyId = redirectLocation.match(/\/play\/([a-f0-9-]+)/)?.[1];
  if (!storyId) {
    throw new Error(`Could not parse story id from redirect location: ${redirectLocation}`);
  }

  return storyId as StoryId;
}

function getMockCallArg(mockFn: jest.Mock, callIndex: number, argIndex: number): unknown {
  const calls = mockFn.mock.calls as unknown[][];
  return calls[callIndex]?.[argIndex];
}

// Helper to wait for a mock function to be called with polling
async function waitForMock(mock: jest.Mock, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (mock.mock.calls.length === 0) {
    if (Date.now() - start > timeout) {
      throw new Error('Timed out waiting for mock to be called');
    }
    await new Promise((resolve) => setImmediate(resolve));
  }
}

describe('Play Flow Integration (Mocked LLM)', () => {
  const createdStoryIds = new Set<StoryId>();
  const createStoryHandler = getRouteHandler(storyRoutes, 'post', '/create');
  const getPlayHandler = getRouteHandler(playRoutes, 'get', '/:storyId');
  const chooseHandler = getRouteHandler(playRoutes, 'post', '/:storyId/choice');

  beforeEach(() => {
    jest.clearAllMocks();
    storyEngine.init();
    mockedGenerateStoryStructure.mockResolvedValue(mockedStructureResult);
    mockedGeneratePagePlan.mockResolvedValue({
      sceneIntent: 'Advance scene via immediate consequence.',
      continuityAnchors: [],
      stateIntents: {
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: { add: [], resolveIds: [] },
        inventory: { add: [], removeIds: [] },
        health: { add: [], removeIds: [] },
        characterState: { add: [], removeIds: [] },
        canon: { worldAdd: [], characterAdd: [] },
      },
      writerBrief: {
        openingLineDirective: 'Begin with action.',
        mustIncludeBeats: [],
        forbiddenRecaps: [],
      },
      rawResponse: 'page-plan',
    });
    mockedReconcileState.mockImplementation((_plan, writer, previousState) =>
      passthroughReconciledState(writer as WriterResult, previousState.currentLocation),
    );
  });

  afterEach(async () => {
    for (const storyId of createdStoryIds) {
      try {
        await storyEngine.deleteStory(storyId);
      } catch {
        // Ignore cleanup failures so assertion failures remain primary.
      }
    }

    createdStoryIds.clear();

    const stories = await storyEngine.listStories();
    for (const story of stories) {
      if (story.characterConcept.startsWith(TEST_PREFIX)) {
        try {
          await storyEngine.deleteStory(story.id);
        } catch {
          // Ignore stale fixture cleanup failures.
        }
      }
    }
  });

  it('creates a story through POST /stories/create with mocked LLM output', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'You find yourself in a dark forest...',
      choices: [
        { text: 'Enter the cave', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Follow the path', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
        { text: 'Climb a tree', choiceType: 'PATH_DIVERGENCE', primaryDelta: 'LOCATION_CHANGE' },
      ],
      currentLocation: 'Dark forest',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: ['The forest is ancient'],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'curious',
        primaryIntensity: 'moderate',
        primaryCause: 'Strange surroundings',
        secondaryEmotions: [],
        dominantMotivation: 'Explore',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
      rawResponse: 'opening',
    });

    const { res, status, render, redirect } = createMockResponse();

    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} create-story`,
          tone: 'fantasy',
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      res,
    );
    await waitForMock(redirect);

    expect(status).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledTimes(1);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(redirect, 0, 0));
    createdStoryIds.add(storyId);

    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateWriterPage).not.toHaveBeenCalled();
  });

  it('generates a continuation page through POST /play/:storyId/choice', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Initial narrative...',
      choices: [
        { text: 'Choice A', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Choice B', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Starting location',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'neutral',
        primaryIntensity: 'low',
        primaryCause: 'Beginning of journey',
        secondaryEmotions: [],
        dominantMotivation: 'Progress',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} make-choice`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );
    await waitForMock(createRes.redirect);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(createRes.redirect, 0, 0));
    createdStoryIds.add(storyId);

    mockedGenerateWriterPage.mockResolvedValueOnce({
      narrative: 'You chose wisely...',
      choices: [
        { text: 'Continue', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Inspect surroundings', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Next location',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'satisfied',
        primaryIntensity: 'moderate',
        primaryCause: 'Good choice',
        secondaryEmotions: [],
        dominantMotivation: 'Continue',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation',
    });
    mockedGenerateAnalystEvaluation.mockResolvedValueOnce({
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none' as const,
      rawResponse: 'analyst-raw',
    });

    const choiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
          suggestedProtagonistSpeech: '  I know a safer route.  ',
        },
      } as unknown as Request,
      choiceRes.res,
    );
    await waitForMock(choiceRes.json);

    expect(choiceRes.status).not.toHaveBeenCalled();
    const choicePayload = getMockCallArg(choiceRes.json, 0, 0) as
      | {
          success?: boolean;
          wasGenerated?: boolean;
          page?: { id?: number; narrativeText?: string };
        }
      | undefined;
    expect(choicePayload?.success).toBe(true);
    expect(choicePayload?.wasGenerated).toBe(true);
    expect(choicePayload?.page?.id).toBe(2);
    expect(choicePayload?.page?.narrativeText).toBe('You chose wisely...');
    expect(mockedGenerateOpeningPage).toHaveBeenCalledTimes(1);
    expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(1);
  });

  it('replays an existing branch without a second continuation generation', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Start...',
      choices: [
        { text: 'Go', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Wait', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Starting point',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'ready',
        primaryIntensity: 'moderate',
        primaryCause: 'Prepared to act',
        secondaryEmotions: [],
        dominantMotivation: 'Move forward',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Title`,
          characterConcept: `${TEST_PREFIX} replay`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );
    await waitForMock(createRes.redirect);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(createRes.redirect, 0, 0));
    createdStoryIds.add(storyId);

    mockedGenerateWriterPage.mockResolvedValueOnce({
      narrative: 'Page 2 content...',
      choices: [
        { text: 'Next', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Turn back', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Second location',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'determined',
        primaryIntensity: 'moderate',
        primaryCause: 'Progress made',
        secondaryEmotions: [],
        dominantMotivation: 'Keep going',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation',
    });
    mockedGenerateAnalystEvaluation.mockResolvedValueOnce({
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none' as const,
      rawResponse: 'analyst-raw',
    });

    const firstChoiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      firstChoiceRes.res,
    );
    await waitForMock(firstChoiceRes.json);

    const replayChoiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      replayChoiceRes.res,
    );
    await waitForMock(replayChoiceRes.json);

    expect(firstChoiceRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: true,
      }),
    );
    expect(replayChoiceRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        wasGenerated: false,
      }),
    );
    expect(mockedGenerateWriterPage).toHaveBeenCalledTimes(1);
  });

  it('returns sorted open threads limited to six with overflow summaries on initial render and in AJAX choice responses', async () => {
    mockedGenerateOpeningPage.mockResolvedValueOnce({
      narrative: 'Opening scene with multiple active threads.',
      choices: [
        { text: 'Advance', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Investigate', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'City outskirts',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [
        { text: 'Stop the imminent sabotage', threadType: 'DANGER', urgency: 'HIGH' },
        { text: 'Find the compromised courier', threadType: 'MYSTERY', urgency: 'HIGH' },
        { text: 'Secure comms fallback', threadType: 'INFORMATION', urgency: 'MEDIUM' },
        { text: 'Identify the planted observer', threadType: 'MYSTERY', urgency: 'MEDIUM' },
        { text: 'Check the abandoned supply route', threadType: 'QUEST', urgency: 'LOW' },
        { text: 'Collect reserve medkits', threadType: 'RESOURCE', urgency: 'LOW' },
        { text: 'Mark low-traffic alleys', threadType: 'QUEST', urgency: 'LOW' },
      ],
      threadsResolved: [],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'concerned',
        primaryIntensity: 'moderate',
        primaryCause: 'Conflicting priorities',
        secondaryEmotions: [],
        dominantMotivation: 'Prevent disaster',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      beatConcluded: false,
      beatResolution: '',
      rawResponse: 'opening',
    });

    const createRes = createMockResponse();
    void createStoryHandler(
      {
        body: {
          title: `${TEST_PREFIX} Threads`,
          characterConcept: `${TEST_PREFIX} open-thread-panel`,
          apiKey: 'mock-api-key-12345',
        },
      } as Request,
      createRes.res,
    );
    await waitForMock(createRes.redirect);

    const storyId = parseStoryIdFromRedirect(getMockCallArg(createRes.redirect, 0, 0));
    createdStoryIds.add(storyId);

    const playRes = createMockResponse();
    void getPlayHandler(
      {
        params: { storyId },
        query: { page: '1' },
      } as unknown as Request,
      playRes.res,
    );
    await waitForMock(playRes.render);

    const playPayload = getMockCallArg(playRes.render, 0, 1) as
      | {
          openThreadPanelRows?: Array<{ id: string; urgency: string; threadType: string }>;
          openThreadOverflowSummary?: string | null;
        }
      | undefined;
    expect(playPayload?.openThreadPanelRows?.map(row => row.id)).toEqual([
      'td-1',
      'td-2',
      'td-3',
      'td-4',
      'td-5',
      'td-6',
    ]);
    expect(playPayload?.openThreadPanelRows?.[0]).toMatchObject({
      id: 'td-1',
      threadType: 'DANGER',
      urgency: 'HIGH',
    });
    expect(playPayload?.openThreadOverflowSummary).toBe('Not shown: 1 (low)');

    mockedGenerateWriterPage.mockResolvedValueOnce({
      narrative: 'Continuation updates open threads.',
      choices: [
        { text: 'Press on', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
        { text: 'Reassess', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
      ],
      currentLocation: 'Inside the city',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [{ text: 'Interrogate the blackout source', threadType: 'DANGER', urgency: 'HIGH' }],
      threadsResolved: ['td-5'],
      newCanonFacts: [],
      newCharacterCanonFacts: {},
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'focused',
        primaryIntensity: 'moderate',
        primaryCause: 'A clear lead emerged',
        secondaryEmotions: [],
        dominantMotivation: 'Track the signal',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
      rawResponse: 'continuation',
    });
    mockedGenerateAnalystEvaluation.mockResolvedValueOnce({
      beatConcluded: false,
      beatResolution: '',
      deviationDetected: false,
      deviationReason: '',
      invalidatedBeatIds: [],
      narrativeSummary: '',
      pacingIssueDetected: false,
      pacingIssueReason: '',
      recommendedAction: 'none' as const,
      rawResponse: 'analyst-raw',
    });

    const choiceRes = createMockResponse();
    void chooseHandler(
      {
        params: { storyId },
        body: {
          pageId: 1,
          choiceIndex: 0,
          apiKey: 'mock-api-key-12345',
        },
      } as unknown as Request,
      choiceRes.res,
    );
    await waitForMock(choiceRes.json);

    const choicePayload = getMockCallArg(choiceRes.json, 0, 0) as
      | {
          success?: boolean;
          page?: {
            openThreads?: Array<{ id: string; threadType: string; urgency: string; text: string }>;
            openThreadOverflowSummary?: string | null;
          };
        }
      | undefined;
    expect(choicePayload?.success).toBe(true);
    expect(choicePayload?.page?.openThreads?.map(row => row.id)).toEqual([
      'td-1',
      'td-2',
      'td-8',
      'td-3',
      'td-4',
      'td-6',
    ]);
    expect(choicePayload?.page?.openThreads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'td-8',
          threadType: 'DANGER',
          urgency: 'HIGH',
          text: 'Interrogate the blackout source',
        }),
      ]),
    );
    expect(choicePayload?.page?.openThreadOverflowSummary).toBe('Not shown: 1 (low)');
  });
});
