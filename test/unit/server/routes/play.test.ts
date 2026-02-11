import type { Request, Response } from 'express';
import { StateReconciliationError, storyEngine } from '@/engine';
import { LLMError } from '@/llm';
import {
  CHOICE_TYPE_COLORS,
  createChoice,
  createPage,
  createStory,
  parseStoryId,
  createEmptyAccumulatedStructureState,
  createStructureVersionId,
  PRIMARY_DELTA_LABELS,
  ThreadType,
  Urgency,
} from '@/models';
import type { VersionedStoryStructure, StoryStructure } from '@/models';
import { playRoutes } from '@/server/routes/play';
import { generationProgressService } from '@/server/services';

type RouteLayer = {
  route?: {
    path?: string;
    methods?: Record<string, boolean>;
    stack?: Array<{ handle: (req: Request, res: Response) => Promise<void> | void }>;
  };
};

function getRouteHandler(
  method: 'get' | 'post',
  path: string,
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (playRoutes.stack as unknown as RouteLayer[]).find(
    item => item.route?.path === path && item.route?.methods?.[method],
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on playRoutes`);
  }

  return handler;
}

// Helper to wait for async route handler to complete
function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

describe('playRoutes', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /:storyId', () => {
    it('renders pages/play with story, page, and pageId for valid inputs', async () => {
      const story = createStory({
        title: 'Epic Adventure',
        characterConcept: 'A very long character concept that should be truncated for page title checks',
        worldbuilding: 'World',
        tone: 'Epic',
      });
      const page = createPage({
        id: 2,
        narrativeText: 'You stand at a fork in the road.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Take left path'), createChoice('Take right path')],
        isEnding: false,
        parentPageId: 1,
        parentChoiceIndex: 0,
        parentAccumulatedActiveState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { id: 'td-1', text: 'Medium urgency', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
            { id: 'td-2', text: 'High urgency', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
          ],
        },
      });
      const loadStorySpy = jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({
        ...story,
        id: storyId,
      });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '2' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(loadStorySpy).toHaveBeenCalledWith(storyId);
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 2);
      expect(render).toHaveBeenCalledWith('pages/play', {
        title: `${story.title} - One More Branch`,
        story: { ...story, id: storyId },
        page,
        pageId: 2,
        actDisplayInfo: null,
        openThreadPanelRows: [
          {
            id: 'td-2',
            text: 'High urgency',
            threadType: ThreadType.MYSTERY,
            urgency: Urgency.HIGH,
            displayLabel: '(MYSTERY/HIGH) High urgency',
          },
          {
            id: 'td-1',
            text: 'Medium urgency',
            threadType: ThreadType.QUEST,
            urgency: Urgency.MEDIUM,
            displayLabel: '(QUEST/MEDIUM) Medium urgency',
          },
        ],
        choiceTypeLabels: CHOICE_TYPE_COLORS,
        primaryDeltaLabels: PRIMARY_DELTA_LABELS,
      });
    });

    it('returns 404 when story is not found', async () => {
      const loadStorySpy = jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(null);
      const getPageSpy = jest.spyOn(storyEngine, 'getPage');
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(loadStorySpy).toHaveBeenCalledWith(storyId);
      expect(getPageSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith('pages/error', {
        title: 'Not Found',
        message: 'Story not found',
      });
    });

    it('returns 404 when page is not found', async () => {
      const story = createStory({
        title: 'Noir Mystery',
        characterConcept: 'A capable rogue',
        worldbuilding: 'World',
        tone: 'Noir',
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '99' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(getPageSpy).toHaveBeenCalledWith(storyId, 99);
      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    });

    it('defaults to page 1 when page query is missing', async () => {
      const story = createStory({
        title: 'Explorer Quest',
        characterConcept: 'An explorer',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'The first page',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go north'), createChoice('Go south')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: {} } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        }),
      );
    });

    it('defaults to page 1 when page query is non-positive', async () => {
      const story = createStory({
        title: 'Starship Command',
        characterConcept: 'A pilot',
        worldbuilding: '',
        tone: 'Sci-fi',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'The launch pad',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Launch'), createChoice('Abort')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '0' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        }),
      );
    });

    it('passes actDisplayInfo when story has structure versions', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'The Beginning',
            objective: 'Start the journey',
            stakes: 'High',
            entryCondition: 'Always',
            beats: [
              {
                id: '1.1',
                name: 'The Setup',
                description: 'Introduce the journey.',
                objective: 'Start moving.',
                role: 'setup',
              },
            ],
          },
        ],
        overallTheme: 'Test theme',
        premise: 'Test premise',
        pacingBudget: {
          targetPagesMin: 1,
          targetPagesMax: 3,
        },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const versionId = createStructureVersionId('version-1');
      const versionedStructure: VersionedStoryStructure = {
        id: versionId,
        createdAt: new Date().toISOString(),
        createdAtPageId: 1,
        parentVersionId: null,
        rewriteReason: null,
        structure,
      };
      const story = createStory({
        title: 'Structured Story',
        characterConcept: 'A hero',
        worldbuilding: 'Fantasy world',
        tone: 'Epic',
      });
      const storyWithVersions = {
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      };
      const page = createPage({
        id: 1,
        narrativeText: 'The beginning',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Go north'), createChoice('Go south')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        structureVersionId: versionId,
        accumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
        },
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(storyWithVersions);
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          actDisplayInfo: {
            actNumber: 1,
            actName: 'The Beginning',
            beatId: '1.1',
            beatName: 'The Setup',
            displayString: 'Act 1: The Beginning - Beat 1.1: The Setup',
          },
        }),
      );
    });

    it('passes null actDisplayInfo when page has no structure', async () => {
      const story = createStory({
        title: 'Simple Story',
        characterConcept: 'A hero',
        worldbuilding: 'World',
        tone: 'Adventure',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'A simple story',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Turn back')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response,
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          actDisplayInfo: null,
        }),
      );
    });
  });

  describe('POST /:storyId/choice validation', () => {
    it('returns 400 JSON when pageId or choiceIndex is missing', async () => {
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        { params: { storyId }, body: { choiceIndex: 0, apiKey: 'valid-key-12345' } } as Request,
        { status, json } as unknown as Response,
      );

      expect(makeChoiceSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceIndex' });
    });

    it('passes request to makeChoice when apiKey is missing (explored choices do not need it)', async () => {
      const resultPage = createPage({
        id: 2,
        narrativeText: 'Existing page.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [],
        isEnding: true,
        parentPageId: 1,
        parentChoiceIndex: 0,
      });
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: false,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        { params: { storyId }, body: { pageId: 1, choiceIndex: 0 } } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(makeChoiceSpy).toHaveBeenCalledWith({
        storyId,
        pageId: 1,
        choiceIndex: 0,
        apiKey: undefined,
      });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          wasGenerated: false,
        }),
      );
    });

    it('starts and fails progress when required choice fields are missing', async () => {
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice');
      const progressStartSpy = jest.spyOn(generationProgressService, 'start');
      const progressFailSpy = jest.spyOn(generationProgressService, 'fail');
      const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { choiceIndex: 0, apiKey: 'valid-key-12345', progressId: '  choice-validation-1  ' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(makeChoiceSpy).not.toHaveBeenCalled();
      expect(progressStartSpy).toHaveBeenCalledWith('choice-validation-1', 'choice');
      expect(progressFailSpy).toHaveBeenCalledWith('choice-validation-1', 'Missing pageId or choiceIndex');
      expect(progressCompleteSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceIndex' });
    });
  });

  describe('POST /:storyId/choice success', () => {
    it('calls makeChoice with expected params and returns page payload', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A new branch unfolds.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Investigate'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
        parentAccumulatedActiveState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { id: 'td-1', text: 'Keep watch', threadType: ThreadType.INFORMATION, urgency: Urgency.LOW },
            { id: 'td-2', text: 'Find the witness', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
          ],
        },
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(makeChoiceSpy).toHaveBeenCalledWith({
        storyId,
        pageId: 2,
        choiceIndex: 1,
        apiKey: 'valid-key-12345',
      });
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          page: {
            id: resultPage.id,
            narrativeText: resultPage.narrativeText,
            choices: resultPage.choices,
            isEnding: resultPage.isEnding,
            openThreads: [
              {
                id: 'td-2',
                text: 'Find the witness',
                threadType: ThreadType.MYSTERY,
                urgency: Urgency.HIGH,
                displayLabel: '(MYSTERY/HIGH) Find the witness',
              },
              {
                id: 'td-1',
                text: 'Keep watch',
                threadType: ThreadType.INFORMATION,
                urgency: Urgency.LOW,
                displayLabel: '(INFORMATION/LOW) Keep watch',
              },
            ],
          },
          wasGenerated: true,
        }),
      );
    });

    it('starts, updates, and completes progress when progressId is provided', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A new branch unfolds.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Investigate'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockImplementation((options) => {
        options.onGenerationStage?.({ stage: 'WRITING_CONTINUING_PAGE', status: 'started', attempt: 1 });
        options.onGenerationStage?.({ stage: 'WRITING_CONTINUING_PAGE', status: 'completed', attempt: 1 });
        return Promise.resolve({
          page: resultPage,
          wasGenerated: true,
        });
      });

      const progressStartSpy = jest.spyOn(generationProgressService, 'start');
      const progressStageStartedSpy = jest.spyOn(generationProgressService, 'markStageStarted');
      const progressStageCompletedSpy = jest.spyOn(generationProgressService, 'markStageCompleted');
      const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');
      const progressFailSpy = jest.spyOn(generationProgressService, 'fail');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345', progressId: ' choice-success-1 ' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(makeChoiceSpy).toHaveBeenCalled();
      const makeChoiceCallArg: unknown = makeChoiceSpy.mock.calls[0]?.[0];
      expect(
        typeof (makeChoiceCallArg as { onGenerationStage?: unknown } | undefined)?.onGenerationStage,
      ).toBe('function');
      expect(progressStartSpy).toHaveBeenCalledWith('choice-success-1', 'choice');
      expect(progressStageStartedSpy).toHaveBeenCalledWith('choice-success-1', 'WRITING_CONTINUING_PAGE', 1);
      expect(progressStageCompletedSpy).toHaveBeenCalledWith('choice-success-1', 'WRITING_CONTINUING_PAGE', 1);
      expect(progressCompleteSpy).toHaveBeenCalledWith('choice-success-1');
      expect(progressFailSpy).not.toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('returns empty openThreads for pages with no active threads', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A quiet moment.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Observe')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
      const payload = (json.mock.calls[0] as unknown[] | undefined)?.[0] as
        | { page?: { openThreads?: unknown[] } }
        | undefined;
      expect(payload?.page?.openThreads).toEqual([]);
    });

    it('includes deviationInfo in response when deviation occurred', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'The story path shifted.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('New path A'), createChoice('New path B')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });
      const deviationInfo = {
        detected: true,
        reason: 'Player action invalidated planned story beats.',
        beatsInvalidated: 2,
      };
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
        deviationInfo,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: {
            detected: true,
            reason: 'Player action invalidated planned story beats.',
            beatsInvalidated: 2,
          },
        }),
      );
    });

    it('includes undefined deviationInfo when no deviation occurred', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'Story continues normally.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
        deviationInfo: undefined,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: undefined,
        }),
      );
    });

    it('includes actDisplayInfo in response when page has structure state', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Act One',
            objective: 'Begin the journey',
            stakes: 'High',
            entryCondition: 'Always',
            beats: [
              {
                id: '1.1',
                name: 'Opening Move',
                description: 'Start the story.',
                objective: 'Launch act one.',
                role: 'setup',
              },
            ],
          },
          {
            id: 'act-2',
            name: 'Act Two',
            objective: 'Face challenges',
            stakes: 'Higher',
            entryCondition: 'After act one',
            beats: [
              {
                id: '2.1',
                name: 'Rising Pressure',
                description: 'Pressure escalates.',
                objective: 'Force commitment.',
                role: 'escalation',
              },
            ],
          },
        ],
        overallTheme: 'Test theme',
        premise: 'Test premise',
        pacingBudget: {
          targetPagesMin: 2,
          targetPagesMax: 4,
        },
        generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      const versionId = createStructureVersionId('version-1');
      const versionedStructure: VersionedStoryStructure = {
        id: versionId,
        createdAt: new Date().toISOString(),
        createdAtPageId: 1,
        parentVersionId: null,
        rewriteReason: null,
        structure,
      };
      const story = createStory({
        title: 'Structured Story',
        characterConcept: 'A hero',
        worldbuilding: 'Fantasy world',
        tone: 'Epic',
      });
      const storyWithVersions = {
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      };
      const resultPage = createPage({
        id: 3,
        narrativeText: 'You entered Act Two.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
        structureVersionId: versionId,
        parentAccumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 1,
        },
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(storyWithVersions);
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          actDisplayInfo: {
            actNumber: 2,
            actName: 'Act Two',
            beatId: '2.1',
            beatName: 'Rising Pressure',
            displayString: 'Act 2: Act Two - Beat 2.1: Rising Pressure',
          },
        }),
      );
    });

    it('includes null actDisplayInfo when page has no structure state', async () => {
      const story = createStory({
        title: 'Simple Story',
        characterConcept: 'A hero',
        worldbuilding: 'World',
        tone: 'Adventure',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A simple continuation.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 0, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          actDisplayInfo: null,
        }),
      );
    });
  });

  describe('POST /:storyId/choice error', () => {
    it('returns 500 JSON with Error message when engine throws', async () => {
      jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(new Error('choice failed'));
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ error: 'choice failed' });
    });

    it('returns deterministic reconciliation hard error contract', async () => {
      jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(
        new StateReconciliationError(
          'State reconciliation failed after retry',
          'RECONCILIATION_FAILED',
          [
            { code: 'THREAD_MISSING_EQUIVALENT_RESOLVE', field: 'openThreads', message: 'Missing resolve operation' },
            { code: 'MISSING_NARRATIVE_EVIDENCE', field: 'inventory', message: 'No evidence for item add' },
            { code: 'THREAD_MISSING_EQUIVALENT_RESOLVE', field: 'openThreads', message: 'Duplicate diagnostic code' },
          ],
          false,
        ),
      );
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Generation failed due to reconciliation issues.',
        code: 'GENERATION_RECONCILIATION_FAILED',
        retryAttempted: true,
        reconciliationIssueCodes: [
          'THREAD_MISSING_EQUIVALENT_RESOLVE',
          'MISSING_NARRATIVE_EVIDENCE',
        ],
      });
    });

    it('fails progress with reconciliation public message when reconciliation fails', async () => {
      jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(
        new StateReconciliationError(
          'State reconciliation failed after retry',
          'RECONCILIATION_FAILED',
          [{ code: 'THREAD_MISSING_EQUIVALENT_RESOLVE', field: 'openThreads', message: 'Missing resolve operation' }],
          false,
        ),
      );
      const progressStartSpy = jest.spyOn(generationProgressService, 'start');
      const progressFailSpy = jest.spyOn(generationProgressService, 'fail');
      const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345', progressId: 'choice-error-1' },
        } as Request,
        { status, json } as unknown as Response,
      );
      await flushPromises();

      expect(progressStartSpy).toHaveBeenCalledWith('choice-error-1', 'choice');
      expect(progressFailSpy).toHaveBeenCalledWith('choice-error-1', 'Generation failed due to reconciliation issues.');
      expect(progressCompleteSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Generation failed due to reconciliation issues.',
        code: 'GENERATION_RECONCILIATION_FAILED',
        retryAttempted: true,
        reconciliationIssueCodes: ['THREAD_MISSING_EQUIVALENT_RESOLVE'],
      });
    });

    it('preserves LLMError response contract', async () => {
      const priorNodeEnv = process.env['NODE_ENV'];
      try {
        process.env['NODE_ENV'] = 'production';
        jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(
          new LLMError('Provider timeout', 'HTTP_503', true, { httpStatus: 503 }),
        );
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();

        void getRouteHandler('post', '/:storyId/choice')(
          {
            params: { storyId },
            body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
          } as Request,
          { status, json } as unknown as Response,
        );
        await flushPromises();

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith({
          error: 'OpenRouter service is temporarily unavailable. Please try again later.',
          code: 'HTTP_503',
          retryable: true,
        });
      } finally {
        process.env['NODE_ENV'] = priorNodeEnv;
      }
    });
  });

  describe('GET /:storyId/restart', () => {
    it('redirects to page 1 for that story', async () => {
      const status = jest.fn().mockReturnThis();
      const redirect = jest.fn();

      await getRouteHandler('get', '/:storyId/restart')(
        { params: { storyId } } as unknown as Request,
        { status, redirect } as unknown as Response,
      );

      expect(status).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(`/play/${storyId}?page=1`);
    });
  });
});
