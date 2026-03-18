import type { Request, Response } from 'express';
import * as engine from '@/engine';
import { StateReconciliationError, storyEngine } from '@/engine';
import { LLMError } from '@/llm';
import {
  CHOICE_SHAPE_LABELS,
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
  path: string
): (req: Request, res: Response) => Promise<void> | void {
  const layer = (playRoutes.stack as unknown as RouteLayer[]).find(
    (item) => item.route?.path === path && item.route?.methods?.[method]
  );
  const handler = layer?.route?.stack?.[0]?.handle;

  if (!handler) {
    throw new Error(`${method.toUpperCase()} ${path} handler not found on playRoutes`);
  }

  return handler;
}

// Helper to wait for async route handler to complete
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('playRoutes', () => {
  const storyId = parseStoryId('550e8400-e29b-41d4-a716-446655440000');

  beforeEach(() => {
    jest.spyOn(engine, 'collectRecapSummaries').mockResolvedValue([]);
    jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /:storyId', () => {
    it('renders pages/play with story, page, and pageId for valid inputs', async () => {
      const story = createStory({
        title: 'Epic Adventure',
        characterConcept:
          'A very long character concept that should be truncated for page title checks',
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
            {
              id: 'td-1',
              text: 'Medium urgency',
              threadType: ThreadType.QUEST,
              urgency: Urgency.MEDIUM,
            },
            {
              id: 'td-2',
              text: 'High urgency',
              threadType: ThreadType.MYSTERY,
              urgency: Urgency.HIGH,
            },
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
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(loadStorySpy).toHaveBeenCalledWith(storyId);
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 2);
      expect(engine.collectRecapSummaries).toHaveBeenCalledWith(storyId, page);
      expect(render).toHaveBeenCalledWith('pages/play', {
        title: `${story.title} - One More Branch`,
        story: { ...story, id: storyId },
        page,
        recapSummaries: [],
        pageId: 2,
        playStructureInfo: null,
        milestoneInfo: null,
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
        openThreadOverflowSummary: null,
        threatsPanelRows: [],
        threatsOverflowSummary: null,
        constraintsPanelRows: [],
        constraintsOverflowSummary: null,
        inventoryPanelRows: [],
        inventoryOverflowSummary: null,
        healthPanelRows: [],
        healthOverflowSummary: null,
        trackedPromisesPanelRows: [],
        trackedPromisesOverflowSummary: null,
        npcRelationshipRows: [],
        npcAgendaRows: [],
        knowledgeStateRows: [],
        insightsThreadMeta: {
          'td-1': { threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
          'td-2': { threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
        },
        insightsPromiseMeta: {},
        choiceTypeLabels: CHOICE_TYPE_COLORS,
        primaryDeltaLabels: PRIMARY_DELTA_LABELS,
        choiceShapeLabels: CHOICE_SHAPE_LABELS,
        isLatestStructureVersion: false,
      });
    });

    it('returns 404 when story is not found', async () => {
      const loadStorySpy = jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(null);
      const getPageSpy = jest.spyOn(storyEngine, 'getPage');
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render } as unknown as Response
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
      const pageOne = createPage({
        id: 1,
        narrativeText: 'Page one exists.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
      });
      const getPageSpy = jest
        .spyOn(storyEngine, 'getPage')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(pageOne);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '99' } } as unknown as Request,
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(getPageSpy).toHaveBeenCalledWith(storyId, 99);
      expect(status).toHaveBeenCalledWith(404);
      expect(render).toHaveBeenCalledWith('pages/error', {
        title: 'Not Found',
        message: 'Page not found',
      });
    });

    it('redirects to briefing when page 1 is missing', async () => {
      const story = createStory({
        title: 'Prepared Story',
        characterConcept: 'A capable rogue',
        worldbuilding: 'World',
        tone: 'Noir',
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      const getPageSpy = jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();
      const redirect = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '1' } } as unknown as Request,
        { status, render, redirect } as unknown as Response
      );
      await flushPromises();

      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(redirect).toHaveBeenCalledWith(`/play/${storyId}/briefing`);
      expect(status).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
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
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        })
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
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(getPageSpy).toHaveBeenCalledWith(storyId, 1);
      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          pageId: 1,
        })
      );
    });

    it('passes playStructureInfo when story has structure versions', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'The Beginning',
            objective: 'Start the journey',
            stakes: 'High',
            entryCondition: 'Always',
            actQuestion: 'Will the hero leave home behind?',
            exitReversal: 'The safe road collapses.',
            promiseTargets: ['The hero can still save the kingdom'],
            obligationTargets: ['call_to_adventure'],
            milestones: [
              {
                id: '1.1',
                name: 'The Setup',
                description: 'Introduce the journey.',
                objective: 'Start moving.',
                exitCondition: 'The hero commits to the road.',
                role: 'setup',
              },
            ],
          },
        ],
        overallTheme: 'Test theme',
        premise: 'Test premise',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
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
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          playStructureInfo: {
            pageStructure: {
              actNumber: 1,
              actName: 'The Beginning',
              milestoneId: '1.1',
              milestoneName: 'The Setup',
              displayString: 'Act 1: The Beginning - Milestone 1.1: The Setup',
              actObjective: 'Start the journey',
              actStakes: 'High',
              milestoneObjective: 'Start moving.',
              actQuestion: 'Will the hero leave home behind?',
              milestoneExitCriteria: 'The hero commits to the road.',
              actEndReversal: 'The safe road collapses.',
              promiseTargets: ['The hero can still save the kingdom'],
              obligationTargets: ['call_to_adventure'],
            },
            nextStructureTarget: {
              actNumber: 1,
              actName: 'The Beginning',
              milestoneId: '1.1',
              milestoneName: 'The Setup',
              displayString: 'Act 1: The Beginning - Milestone 1.1: The Setup',
              actObjective: 'Start the journey',
              actStakes: 'High',
              milestoneObjective: 'Start moving.',
              actQuestion: 'Will the hero leave home behind?',
              milestoneExitCriteria: 'The hero commits to the road.',
              actEndReversal: 'The safe road collapses.',
              promiseTargets: ['The hero can still save the kingdom'],
              obligationTargets: ['call_to_adventure'],
            },
          },
        })
      );
    });

    it('keeps page structure page-scoped when milestone progress has already advanced', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'The Beginning',
            objective: 'Steal the ledger',
            stakes: 'If they fail, the resistance is exposed.',
            entryCondition: 'The crew is assembled',
            actQuestion: 'Can the crew stay ahead of the crackdown?',
            exitReversal: 'The ledger implicates an ally.',
            promiseTargets: ['The job is bigger than the payout'],
            obligationTargets: ['inciting_incident'],
            milestones: [
              {
                id: '1.1',
                name: 'The Heist',
                description: 'Break into the archive.',
                objective: 'Take the ledger.',
                exitCondition: 'The crew gets out with proof.',
                role: 'setup',
              },
              {
                id: '1.2',
                name: 'The Lockdown',
                description: 'Escape the response.',
                objective: 'Survive the sweep.',
                exitCondition: 'The crew finds a route out.',
                role: 'escalation',
              },
            ],
          },
        ],
        overallTheme: 'Trust under fire',
        premise: 'A heist escalates into a citywide manhunt.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
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
        characterConcept: 'A rogue tactician',
        worldbuilding: 'Occupied city',
        tone: 'Thriller',
      });
      const page = createPage({
        id: 2,
        narrativeText: 'They slip out through the smoke tunnels.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Press onward'), createChoice('Hide')],
        isEnding: false,
        parentPageId: 1,
        parentChoiceIndex: 0,
        structureVersionId: versionId,
        pageActIndex: 0,
        pageMilestoneIndex: 0,
        analystResult: {
          milestoneConcluded: true,
          milestoneResolution: 'Milestone resolved',
          deviationDetected: false,
          deviationReason: '',
          invalidatedMilestoneIds: [],
          sceneSummary: '',
          pacingIssueDetected: false,
          pacingIssueReason: '',
          recommendedAction: 'none',
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
          structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
          entryConditionReadiness: 'READY',
          pacingDirective: '',
          objectiveAnchors: [],
          anchorEvidence: [],
          completionGateSatisfied: true,
          completionGateFailureReason: '',
          toneAdherent: true,
          toneDriftDescription: '',
          promisesDetected: [],
          promisesResolved: [],
          promisePayoffAssessments: [],
          threadPayoffAssessments: [],
          npcCoherenceAdherent: true,
          npcCoherenceIssues: '',
          relationshipShiftsDetected: [],
          spineDeviationDetected: false,
          spineDeviationReason: '',
          spineInvalidatedElement: null,
          alignedMilestoneId: null,
          milestoneAlignmentConfidence: 'LOW',
          milestoneAlignmentReason: '',
          rawResponse: '',
        },
        parentAccumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
          currentMilestoneIndex: 1,
          milestoneProgressions: [
            { milestoneId: '1.1', status: 'concluded', resolution: 'Ledger secured' },
            { milestoneId: '1.2', status: 'active' },
          ],
        },
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      });
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId')(
        { params: { storyId }, query: { page: '2' } } as unknown as Request,
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      const renderPayload = (render.mock.calls[0] as [string, Record<string, unknown>] | undefined)?.[1];
      expect(renderPayload).toBeDefined();
      const playStructureInfo = renderPayload?.['playStructureInfo'] as
        | {
            pageStructure?: Record<string, unknown>;
            nextStructureTarget?: Record<string, unknown>;
          }
        | undefined;
      expect(playStructureInfo?.pageStructure).toEqual(
        expect.objectContaining({
          milestoneId: '1.1',
          milestoneName: 'The Heist',
          displayString: 'Act 1: The Beginning - Milestone 1.1: The Heist',
        })
      );
      expect(playStructureInfo?.nextStructureTarget).toEqual(
        expect.objectContaining({
          milestoneId: '1.2',
          milestoneName: 'The Lockdown',
          displayString: 'Act 1: The Beginning - Milestone 1.2: The Lockdown',
        })
      );
      expect(renderPayload?.['milestoneInfo']).toEqual({
        type: 'milestone',
        milestoneName: 'The Heist',
      });
    });

    it('passes null playStructureInfo when page has no structure', async () => {
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
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(render).toHaveBeenCalledWith(
        'pages/play',
        expect.objectContaining({
          playStructureInfo: null,
        })
      );
    });
  });

  describe('GET /:storyId/briefing', () => {
    it('renders briefing template for prepared story without page 1', async () => {
      const story = {
        ...createStory({
          title: 'Prepared Story',
          characterConcept: 'A skilled diplomat with a hidden agenda',
          worldbuilding: 'A fractured kingdom',
          tone: 'Political intrigue',
        }),
        id: storyId,
        structure: {
          acts: [],
          overallTheme: 'Trust is a weapon',
          premise: 'Forge alliances before the summit collapses',
          openingImage: 'An opening image placeholder.',
          closingImage: 'A closing image placeholder.',
          pacingBudget: { targetPagesMin: 10, targetPagesMax: 20 },
          anchorMoments: {
            incitingIncident: { actIndex: 0, description: 'The treaty is stolen.' },
            midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
            climax: { actIndex: 2, description: 'The summit vote turns into open accusation.' },
            signatureScenarioPlacement: {
              actIndex: 1,
              description: 'A public negotiation becomes a trap.',
            },
          },
          generatedAt: new Date(),
        },
        decomposedCharacters: [
          {
            name: 'Aria',
            appearance: 'Tall with silver hair',
            coreTraits: ['Cautious', 'Empathetic'],
            superObjective: 'Keep the kingdom intact',
            relationships: ['Mentors Prince Oren'],
            speechFingerprint: {
              catchphrases: [],
              vocabularyProfile: 'formal',
              sentencePatterns: 'measured',
              verbalTics: [],
              dialogueSamples: [],
              metaphorFrames: '',
              antiExamples: [],
              discourseMarkers: [],
              registerShifts: '',
            },
            knowledgeBoundaries: 'Does not know who leaked the treaty',
            decisionPattern: '',
            coreBeliefs: [],
            conflictPriority: '',
            rawDescription: 'Aria description',
          },
        ],
      };

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(story);
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);
      const status = jest.fn().mockReturnThis();
      const render = jest.fn();

      void getRouteHandler('get', '/:storyId/briefing')(
        { params: { storyId } } as unknown as Request,
        { status, render } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(render).toHaveBeenCalledTimes(1);
      const [viewName, payload] = render.mock.calls[0] as [string, Record<string, unknown>];
      expect(viewName).toBe('pages/briefing');
      expect(payload['title']).toBe('Prepared Story - Mission Briefing');
      expect(payload['story']).toEqual(
        expect.objectContaining({ id: storyId, title: 'Prepared Story' })
      );
      expect(payload['briefing']).toEqual(
        expect.objectContaining({
          theme: 'Trust is a weapon',
          premise: 'Forge alliances before the summit collapses',
          anchorMoments: {
            incitingIncident: { actIndex: 0, description: 'The treaty is stolen.' },
            midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
            climax: {
              actIndex: 2,
              description: 'The summit vote turns into open accusation.',
            },
            signatureScenarioPlacement: {
              actIndex: 1,
              description: 'A public negotiation becomes a trap.',
            },
          },
        })
      );
    });
  });

  describe('POST /:storyId/begin', () => {
    it('calls generateOpeningPage and returns success JSON', async () => {
      const story = createStory({
        title: 'Begin Story',
        characterConcept: 'A strategist facing impossible odds',
        worldbuilding: '',
        tone: 'Adventure',
      });
      jest.spyOn(storyEngine, 'generateOpeningPage').mockResolvedValue({
        story: { ...story, id: storyId },
        page: createPage({
          id: 1,
          narrativeText: 'Opening page',
          sceneSummary: 'Test summary of the scene events and consequences.',
          choices: [],
          isEnding: true,
          parentPageId: null,
          parentChoiceIndex: null,
        }),
      });
      const progressStartSpy = jest.spyOn(generationProgressService, 'start');
      const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/begin')(
        {
          params: { storyId },
          body: { apiKey: 'valid-key-12345', progressId: ' begin-progress-1 ' },
        } as Request,
        { json } as unknown as Response
      );
      await flushPromises();

      expect(progressStartSpy).toHaveBeenCalledWith('begin-progress-1', 'begin-adventure');
      expect(progressCompleteSpy).toHaveBeenCalledWith('begin-progress-1');
      expect(json).toHaveBeenCalledWith({ success: true, storyId });
    });
  });

  describe('POST /:storyId/choice validation', () => {
    it('returns 400 JSON when pageId or choiceIndex is missing', async () => {
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      await getRouteHandler('post', '/:storyId/choice')(
        { params: { storyId }, body: { choiceIndex: 0, apiKey: 'valid-key-12345' } } as Request,
        { status, json } as unknown as Response
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
        { status, json } as unknown as Response
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
        })
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
          body: {
            choiceIndex: 0,
            apiKey: 'valid-key-12345',
            progressId: '  choice-validation-1  ',
          },
        } as Request,
        { status, json } as unknown as Response
      );

      expect(makeChoiceSpy).not.toHaveBeenCalled();
      expect(progressStartSpy).toHaveBeenCalledWith('choice-validation-1', 'choice');
      expect(progressFailSpy).toHaveBeenCalledWith(
        'choice-validation-1',
        'Missing pageId or choiceIndex'
      );
      expect(progressCompleteSpy).not.toHaveBeenCalled();
      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ error: 'Missing pageId or choiceIndex' });
    });

    it('truncates oversized protagonistGuidance fields before forwarding', async () => {
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
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: {
            pageId: 2,
            choiceIndex: 1,
            apiKey: 'valid-key-12345',
            protagonistGuidance: {
              suggestedSpeech: `  ${'a'.repeat(501)}  `,
            },
          },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      const makeChoiceArg = makeChoiceSpy.mock.calls[0]?.[0] as
        | { protagonistGuidance?: { suggestedSpeech?: string } }
        | undefined;
      expect(makeChoiceArg?.protagonistGuidance?.suggestedSpeech).toBe('a'.repeat(500));
      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('POST /:storyId/choice success', () => {
    it('trims and forwards protagonistGuidance when provided', async () => {
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
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: {
            pageId: 2,
            choiceIndex: 1,
            apiKey: 'valid-key-12345',
            protagonistGuidance: {
              suggestedEmotions: '  anxious  ',
              suggestedThoughts: '  this smells wrong  ',
              suggestedSpeech: '  We should not split up.  ',
            },
          },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      const makeChoiceArg = makeChoiceSpy.mock.calls[0]?.[0] as
        | {
            protagonistGuidance?: {
              suggestedEmotions?: string;
              suggestedThoughts?: string;
              suggestedSpeech?: string;
            };
          }
        | undefined;
      expect(makeChoiceArg?.protagonistGuidance).toEqual({
        suggestedEmotions: 'anxious',
        suggestedThoughts: 'this smells wrong',
        suggestedSpeech: 'We should not split up.',
      });
      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('normalizes blank protagonistGuidance fields to undefined', async () => {
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
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
      });
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: {
            pageId: 2,
            choiceIndex: 1,
            apiKey: 'valid-key-12345',
            protagonistGuidance: {
              suggestedEmotions: '   ',
              suggestedThoughts: '   ',
              suggestedSpeech: '   ',
            },
          },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      const makeChoiceArg = makeChoiceSpy.mock.calls[0]?.[0] as
        | { protagonistGuidance?: unknown }
        | undefined;
      expect(makeChoiceArg?.protagonistGuidance).toBeUndefined();
      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

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
            {
              id: 'td-1',
              text: 'Keep watch',
              threadType: ThreadType.INFORMATION,
              urgency: Urgency.LOW,
            },
            {
              id: 'td-2',
              text: 'Find the witness',
              threadType: ThreadType.MYSTERY,
              urgency: Urgency.HIGH,
            },
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(makeChoiceSpy).toHaveBeenCalledWith({
        storyId,
        pageId: 2,
        choiceIndex: 1,
        apiKey: 'valid-key-12345',
      });
      expect(engine.collectRecapSummaries).toHaveBeenCalledWith(storyId, resultPage);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          recapSummaries: [],
          page: {
            id: resultPage.id,
            narrativeText: resultPage.narrativeText,
            sceneSummary: resultPage.sceneSummary,
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
            openThreadOverflowSummary: null,
            activeThreats: [],
            threatsOverflowSummary: null,
            activeConstraints: [],
            constraintsOverflowSummary: null,
            inventory: [],
            inventoryOverflowSummary: null,
            health: [],
            healthOverflowSummary: null,
            protagonistAffect: resultPage.protagonistAffect,
            analystResult: resultPage.analystResult,
            resolvedThreadMeta: {
              'td-1': { threadType: 'INFORMATION', urgency: 'LOW' },
              'td-2': { threadType: 'MYSTERY', urgency: 'HIGH' },
            },
            resolvedPromiseMeta: {},
            trackedPromises: [],
            trackedPromisesOverflowSummary: null,
            npcRelationships: [],
            npcAgendas: [],
            knowledgeState: [],
          },
          wasGenerated: true,
        })
      );
    });

    it('includes global canon fields in choice response', async () => {
      const story = {
        ...createStory({
          title: 'Canon Story',
          characterConcept: 'A hero',
          worldbuilding: '',
          tone: 'Adventure',
        }),
        id: storyId,
        globalCanon: ['The citadel stands'],
        globalCharacterCanon: { 'Bobby Western': ['Bobby is in a coma'] },
      };
      const resultPage = createPage({
        id: 3,
        narrativeText: 'A new branch unfolds.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Investigate'), createChoice('Retreat')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 1,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(story);
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          globalCanon: ['The citadel stands'],
          globalCharacterCanon: { 'Bobby Western': ['Bobby is in a coma'] },
        })
      );
    });

    it('does not start or mutate progress lifecycle when progressId is absent', async () => {
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
      const makeChoiceSpy = jest.spyOn(storyEngine, 'makeChoice').mockResolvedValue({
        page: resultPage,
        wasGenerated: true,
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
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(makeChoiceSpy).toHaveBeenCalledWith({
        storyId,
        pageId: 2,
        choiceIndex: 1,
        apiKey: 'valid-key-12345',
        onGenerationStage: undefined,
      });
      expect(progressStartSpy).not.toHaveBeenCalled();
      expect(progressStageStartedSpy).not.toHaveBeenCalled();
      expect(progressStageCompletedSpy).not.toHaveBeenCalled();
      expect(progressCompleteSpy).not.toHaveBeenCalled();
      expect(progressFailSpy).not.toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('limits openThreads to six rows and includes overflow summary', async () => {
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
            { id: 'td-1', text: 'Low 1', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
            { id: 'td-2', text: 'High 1', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
            {
              id: 'td-3',
              text: 'Medium 1',
              threadType: ThreadType.INFORMATION,
              urgency: Urgency.MEDIUM,
            },
            { id: 'td-4', text: 'Low 2', threadType: ThreadType.RESOURCE, urgency: Urgency.LOW },
            { id: 'td-5', text: 'High 2', threadType: ThreadType.DANGER, urgency: Urgency.HIGH },
            { id: 'td-6', text: 'Medium 2', threadType: ThreadType.MORAL, urgency: Urgency.MEDIUM },
            {
              id: 'td-7',
              text: 'Low 3',
              threadType: ThreadType.RELATIONSHIP,
              urgency: Urgency.LOW,
            },
            { id: 'td-8', text: 'Low 4', threadType: ThreadType.QUEST, urgency: Urgency.LOW },
          ],
        },
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      const payload = (json.mock.calls[0] as unknown[] | undefined)?.[0] as
        | {
            page?: {
              openThreads?: Array<{ id: string }>;
              openThreadOverflowSummary?: string | null;
            };
          }
        | undefined;
      expect(payload?.page?.openThreads?.map((thread) => thread.id)).toEqual([
        'td-2',
        'td-5',
        'td-3',
        'td-6',
        'td-1',
        'td-4',
      ]);
      expect(payload?.page?.openThreadOverflowSummary).toBe('Not shown: 2 (low)');
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
        options.onGenerationStage?.({
          stage: 'WRITING_CONTINUING_PAGE',
          status: 'started',
          attempt: 1,
        });
        options.onGenerationStage?.({
          stage: 'WRITING_CONTINUING_PAGE',
          status: 'completed',
          attempt: 1,
        });
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
          body: {
            pageId: 2,
            choiceIndex: 1,
            apiKey: 'valid-key-12345',
            progressId: ' choice-success-1 ',
          },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(makeChoiceSpy).toHaveBeenCalled();
      const makeChoiceCallArg: unknown = makeChoiceSpy.mock.calls[0]?.[0];
      expect(
        typeof (makeChoiceCallArg as { onGenerationStage?: unknown } | undefined)?.onGenerationStage
      ).toBe('function');
      expect(progressStartSpy).toHaveBeenCalledWith('choice-success-1', 'choice');
      expect(progressStageStartedSpy).toHaveBeenCalledWith(
        'choice-success-1',
        'WRITING_CONTINUING_PAGE',
        1
      );
      expect(progressStageCompletedSpy).toHaveBeenCalledWith(
        'choice-success-1',
        'WRITING_CONTINUING_PAGE',
        1,
        undefined
      );
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
        { status, json } as unknown as Response
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
        reason: 'Player action invalidated planned story milestones.',
        milestonesInvalidated: 2,
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: {
            detected: true,
            reason: 'Player action invalidated planned story milestones.',
            milestonesInvalidated: 2,
          },
        })
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          deviationInfo: undefined,
        })
      );
    });

    it('includes analystResult in response page payload', async () => {
      const story = createStory({
        title: 'Test Story',
        characterConcept: 'A hero',
        worldbuilding: '',
        tone: 'Adventure',
      });
      const analystResult = {
        milestoneConcluded: false,
        milestoneResolution: '',
        deviationDetected: false,
        deviationReason: '',
        invalidatedMilestoneIds: [],
        sceneSummary: 'Summary.',
        pacingIssueDetected: false,
        pacingIssueReason: '',
        recommendedAction: 'none',
        sceneMomentum: 'MAJOR_PROGRESS',
        objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
        commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
        structuralPositionSignal: 'CLEARLY_IN_NEXT_BEAT',
        entryConditionReadiness: 'READY',
        pacingDirective: '',
        objectiveAnchors: [],
        anchorEvidence: [],
        completionGateSatisfied: true,
        completionGateFailureReason: '',
        toneAdherent: true,
        toneDriftDescription: '',
        npcCoherenceAdherent: true,
        npcCoherenceIssues: '',
        promisesDetected: [],
        promisesResolved: [],
        promisePayoffAssessments: [],
        threadPayoffAssessments: [],
        relationshipShiftsDetected: [],
        spineDeviationDetected: false,
        spineDeviationReason: '',
        spineInvalidatedElement: null,
        alignedMilestoneId: null,
        milestoneAlignmentConfidence: 'LOW',
        milestoneAlignmentReason: '',
        rawResponse: '{}',
      };
      const resultPage = createPage({
        id: 3,
        narrativeText: 'Story continues.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Continue'), createChoice('Wait')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
        analystResult,
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      const payload = (json.mock.calls[0] as unknown[] | undefined)?.[0] as
        | { success?: boolean; page?: { analystResult?: unknown } }
        | undefined;
      expect(payload?.success).toBe(true);
      expect(payload?.page?.analystResult).toEqual(analystResult);
    });

    it('includes playStructureInfo in response when page has structure state', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Act One',
            objective: 'Begin the journey',
            stakes: 'High',
            entryCondition: 'Always',
            actQuestion: 'Will the hero answer the call?',
            exitReversal: 'The mentor is taken off the board.',
            promiseTargets: ['The hero can still save the kingdom'],
            obligationTargets: ['call_to_adventure'],
            milestones: [
              {
                id: '1.1',
                name: 'Opening Move',
                description: 'Start the story.',
                objective: 'Launch act one.',
                exitCondition: 'The hero abandons the old routine.',
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
            actQuestion: 'Can the hero hold the alliance together?',
            exitReversal: 'The alliance fractures under pressure.',
            promiseTargets: ['The hero can still save the kingdom'],
            obligationTargets: ['midpoint_reversal'],
            milestones: [
              {
                id: '2.1',
                name: 'Rising Pressure',
                description: 'Pressure escalates.',
                objective: 'Force commitment.',
                exitCondition: 'The alliance chooses a side in public.',
                role: 'escalation',
              },
            ],
          },
        ],
        overallTheme: 'Test theme',
        premise: 'Test premise',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          playStructureInfo: {
            pageStructure: {
              actNumber: 2,
              actName: 'Act Two',
              milestoneId: '2.1',
              milestoneName: 'Rising Pressure',
              displayString: 'Act 2: Act Two - Milestone 2.1: Rising Pressure',
              actObjective: 'Face challenges',
              actStakes: 'Higher',
              milestoneObjective: 'Force commitment.',
              actQuestion: 'Can the hero hold the alliance together?',
              milestoneExitCriteria: 'The alliance chooses a side in public.',
              actEndReversal: 'The alliance fractures under pressure.',
              promiseTargets: ['The hero can still save the kingdom'],
              obligationTargets: ['midpoint_reversal'],
            },
            nextStructureTarget: {
              actNumber: 2,
              actName: 'Act Two',
              milestoneId: '2.1',
              milestoneName: 'Rising Pressure',
              displayString: 'Act 2: Act Two - Milestone 2.1: Rising Pressure',
              actObjective: 'Face challenges',
              actStakes: 'Higher',
              milestoneObjective: 'Force commitment.',
              actQuestion: 'Can the hero hold the alliance together?',
              milestoneExitCriteria: 'The alliance chooses a side in public.',
              actEndReversal: 'The alliance fractures under pressure.',
              promiseTargets: ['The hero can still save the kingdom'],
              obligationTargets: ['midpoint_reversal'],
            },
          },
        })
      );
    });

    it('preserves page history separately from the next target when choice result has already advanced', async () => {
      const structure: StoryStructure = {
        acts: [
          {
            id: 'act-1',
            name: 'Act One',
            objective: 'Take the archive ledger',
            stakes: 'Failure exposes the safehouse.',
            entryCondition: 'The crew is in position',
            actQuestion: 'Can they keep the initiative after the theft?',
            exitReversal: 'The ledger identifies their fence.',
            promiseTargets: ['The fence is compromised'],
            obligationTargets: ['inciting_incident'],
            milestones: [
              {
                id: '1.1',
                name: 'Archive Theft',
                description: 'The opening hit.',
                objective: 'Get the ledger.',
                exitCondition: 'The crew escapes with evidence.',
                role: 'setup',
              },
              {
                id: '1.2',
                name: 'Sweep Response',
                description: 'The city locks down.',
                objective: 'Stay ahead of the dragnet.',
                exitCondition: 'The crew secures a route through the district.',
                role: 'escalation',
              },
            ],
          },
        ],
        overallTheme: 'Pressure reveals loyalty',
        premise: 'A theft immediately turns into a manhunt.',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
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
        characterConcept: 'A resistance courier',
        worldbuilding: 'Occupied city',
        tone: 'Thriller',
      });
      const resultPage = createPage({
        id: 3,
        narrativeText: 'They vanish into the blackout district.',
        sceneSummary: 'Test summary of the scene events and consequences.',
        choices: [createChoice('Keep moving'), createChoice('Lay low')],
        isEnding: false,
        parentPageId: 2,
        parentChoiceIndex: 0,
        structureVersionId: versionId,
        pageActIndex: 0,
        pageMilestoneIndex: 0,
        analystResult: {
          milestoneConcluded: true,
          milestoneResolution: 'Milestone resolved',
          deviationDetected: false,
          deviationReason: '',
          invalidatedMilestoneIds: [],
          sceneSummary: '',
          pacingIssueDetected: false,
          pacingIssueReason: '',
          recommendedAction: 'none',
          sceneMomentum: 'MAJOR_PROGRESS',
          objectiveEvidenceStrength: 'CLEAR_EXPLICIT',
          commitmentStrength: 'EXPLICIT_IRREVERSIBLE',
          structuralPositionSignal: 'BRIDGING_TO_NEXT_BEAT',
          entryConditionReadiness: 'READY',
          pacingDirective: '',
          objectiveAnchors: [],
          anchorEvidence: [],
          completionGateSatisfied: true,
          completionGateFailureReason: '',
          toneAdherent: true,
          toneDriftDescription: '',
          promisesDetected: [],
          promisesResolved: [],
          promisePayoffAssessments: [],
          threadPayoffAssessments: [],
          npcCoherenceAdherent: true,
          npcCoherenceIssues: '',
          relationshipShiftsDetected: [],
          spineDeviationDetected: false,
          spineDeviationReason: '',
          spineInvalidatedElement: null,
          alignedMilestoneId: null,
          milestoneAlignmentConfidence: 'LOW',
          milestoneAlignmentReason: '',
          rawResponse: '',
        },
        parentAccumulatedStructureState: {
          ...createEmptyAccumulatedStructureState(),
          currentActIndex: 0,
          currentMilestoneIndex: 1,
          milestoneProgressions: [
            { milestoneId: '1.1', status: 'concluded', resolution: 'The ledger is in hand' },
            { milestoneId: '1.2', status: 'active' },
          ],
        },
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({
        ...story,
        id: storyId,
        structureVersions: [versionedStructure],
      });
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).not.toHaveBeenCalled();
      const jsonPayload = (json.mock.calls[0] as [Record<string, unknown>] | undefined)?.[0];
      expect(jsonPayload).toBeDefined();
      expect(jsonPayload?.['success']).toBe(true);
      const playStructureInfo = jsonPayload?.['playStructureInfo'] as
        | {
            pageStructure?: Record<string, unknown>;
            nextStructureTarget?: Record<string, unknown>;
          }
        | undefined;
      expect(playStructureInfo?.pageStructure).toEqual(
        expect.objectContaining({
          milestoneId: '1.1',
          milestoneName: 'Archive Theft',
          displayString: 'Act 1: Act One - Milestone 1.1: Archive Theft',
        })
      );
      expect(playStructureInfo?.nextStructureTarget).toEqual(
        expect.objectContaining({
          milestoneId: '1.2',
          milestoneName: 'Sweep Response',
          displayString: 'Act 1: Act One - Milestone 1.2: Sweep Response',
        })
      );
      expect(jsonPayload?.['milestoneInfo']).toEqual({
        type: 'milestone',
        milestoneName: 'Archive Theft',
      });
    });

    it('includes null playStructureInfo when page has no structure state', async () => {
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
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          playStructureInfo: null,
        })
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
        { status, json } as unknown as Response
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
            {
              code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
              field: 'openThreads',
              message: 'Missing resolve operation',
            },
            {
              code: 'UNKNOWN_STATE_ID',
              field: 'inventory',
              message: 'Unknown state ID "inv-999" in inventoryRemoved.',
            },
            {
              code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
              field: 'openThreads',
              message: 'Duplicate diagnostic code',
            },
          ],
          false
        )
      );
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({
        error: 'Generation failed due to reconciliation issues.',
        code: 'GENERATION_RECONCILIATION_FAILED',
        retryAttempted: true,
        reconciliationIssueCodes: ['THREAD_MISSING_EQUIVALENT_RESOLVE', 'UNKNOWN_STATE_ID'],
      });
    });

    it('fails progress with reconciliation public message when reconciliation fails', async () => {
      jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(
        new StateReconciliationError(
          'State reconciliation failed after retry',
          'RECONCILIATION_FAILED',
          [
            {
              code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
              field: 'openThreads',
              message: 'Missing resolve operation',
            },
          ],
          false
        )
      );
      const progressStartSpy = jest.spyOn(generationProgressService, 'start');
      const progressFailSpy = jest.spyOn(generationProgressService, 'fail');
      const progressCompleteSpy = jest.spyOn(generationProgressService, 'complete');
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      void getRouteHandler('post', '/:storyId/choice')(
        {
          params: { storyId },
          body: {
            pageId: 2,
            choiceIndex: 1,
            apiKey: 'valid-key-12345',
            progressId: 'choice-error-1',
          },
        } as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(progressStartSpy).toHaveBeenCalledWith('choice-error-1', 'choice');
      expect(progressFailSpy).toHaveBeenCalledWith(
        'choice-error-1',
        'Generation failed due to reconciliation issues.'
      );
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
        jest
          .spyOn(storyEngine, 'makeChoice')
          .mockRejectedValue(
            new LLMError('Provider timeout', 'HTTP_503', true, { httpStatus: 503 })
          );
        const status = jest.fn().mockReturnThis();
        const json = jest.fn();

        void getRouteHandler('post', '/:storyId/choice')(
          {
            params: { storyId },
            body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
          } as Request,
          { status, json } as unknown as Response
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

    it('includes repairSummary in debug payload for LLMError in non-production', async () => {
      const priorNodeEnv = process.env['NODE_ENV'];
      try {
        process.env['NODE_ENV'] = 'test';
        jest.spyOn(storyEngine, 'makeChoice').mockRejectedValue(
          new LLMError('Validation failed', 'VALIDATION_ERROR', false, {
            httpStatus: 400,
            model: 'test-model',
            rawErrorBody: '{"error":"bad output"}',
            repairSummary: {
              idRepairsApplied: 1,
              shapeRepairsApplied: 1,
              idFiltered: [{ field: 'threats.removeIds', value: 'cn-9', expectedPrefix: 'th-' }],
              shapeRepairedEntries: [{ index: 0, fromFields: ['character'] }],
            },
          })
        );

        const status = jest.fn().mockReturnThis();
        const json = jest.fn();

        void getRouteHandler('post', '/:storyId/choice')(
          {
            params: { storyId },
            body: { pageId: 2, choiceIndex: 1, apiKey: 'valid-key-12345' },
          } as Request,
          { status, json } as unknown as Response
        );
        await flushPromises();

        expect(status).toHaveBeenCalledWith(500);
        expect(json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'VALIDATION_ERROR',
            retryable: false,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            debug: expect.objectContaining({
              httpStatus: 400,
              model: 'test-model',
              rawError: '{"error":"bad output"}',
              repairSummary: {
                idRepairsApplied: 1,
                shapeRepairsApplied: 1,
                idFiltered: [{ field: 'threats.removeIds', value: 'cn-9', expectedPrefix: 'th-' }],
                shapeRepairedEntries: [{ index: 0, fromFields: ['character'] }],
              },
            }),
          })
        );
      } finally {
        process.env['NODE_ENV'] = priorNodeEnv;
      }
    });
  });

  describe('POST /:storyId/ideate-scene', () => {
    it('returns 400 when choice already has nextPageId set', async () => {
      const parentPage = createPage({
        id: 2,
        narrativeText: 'The story begins.',
        sceneSummary: 'Opening scene.',
        choices: [createChoice('Go left', 5), createChoice('Go right')],
        isEnding: false,
        parentPageId: 1,
        parentChoiceIndex: 0,
      });

      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({
        ...createStory({
          title: 'Test',
          characterConcept: 'Hero',
          worldbuilding: 'World',
          tone: 'Dark',
        }),
        id: storyId,
        decomposedCharacters: [],
        decomposedWorld: [],
      } as never);
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(parentPage);

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/ideate-scene');
      void handler(
        {
          params: { storyId },
          body: {
            apiKey: 'sk-or-test-key',
            mode: 'continuation',
            pageId: 1,
            choiceIndex: 0,
          },
        } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({
        success: false,
        error: 'Choice already explored; scene ideation is only available for unexplored choices',
      });
    });
  });

  describe('GET /:storyId/restart', () => {
    it('redirects to page 1 for that story', async () => {
      const status = jest.fn().mockReturnThis();
      const redirect = jest.fn();

      await getRouteHandler('get', '/:storyId/restart')(
        { params: { storyId } } as unknown as Request,
        { status, redirect } as unknown as Response
      );

      expect(status).not.toHaveBeenCalled();
      expect(redirect).toHaveBeenCalledWith(`/play/${storyId}?page=1`);
    });
  });

  describe('POST /:storyId/rewrite-structure', () => {
    it('returns 400 when API key is missing', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/rewrite-structure');
      void handler(
        { params: { storyId }, body: { pageId: 1 } } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'OpenRouter API key is required' })
      );
    });

    it('returns 400 when pageId is missing', async () => {
      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/rewrite-structure');
      void handler(
        { params: { storyId }, body: { apiKey: 'test-key' } } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Missing pageId' })
      );
    });

    it('returns 400 when page has no rewrite recommendation', async () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'Hero',
        worldbuilding: 'World',
        tone: 'epic',
      });
      const page = createPage({
        id: 1,
        narrativeText: 'Test.',
        sceneSummary: 'Test.',
        choices: [createChoice('Continue'), createChoice('Go back')],
        isEnding: false,
        parentPageId: null,
        parentChoiceIndex: null,
        analystResult: null,
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(page);

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/rewrite-structure');
      void handler(
        {
          params: { storyId },
          body: { pageId: 1, apiKey: 'test-key' },
        } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'This page does not have a pacing rewrite recommendation',
        })
      );
    });

    it('returns 404 when story is not found', async () => {
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue(null);

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/rewrite-structure');
      void handler(
        {
          params: { storyId },
          body: { pageId: 1, apiKey: 'test-key' },
        } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Story not found' })
      );
    });

    it('returns 404 when page is not found', async () => {
      const story = createStory({
        title: 'Test',
        characterConcept: 'Hero',
        worldbuilding: 'World',
        tone: 'epic',
      });
      jest.spyOn(storyEngine, 'loadStory').mockResolvedValue({ ...story, id: storyId });
      jest.spyOn(storyEngine, 'getPage').mockResolvedValue(null);

      const status = jest.fn().mockReturnThis();
      const json = jest.fn();

      const handler = getRouteHandler('post', '/:storyId/rewrite-structure');
      void handler(
        {
          params: { storyId },
          body: { pageId: 99, apiKey: 'test-key' },
        } as unknown as Request,
        { status, json } as unknown as Response
      );
      await flushPromises();

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: 'Page not found' })
      );
    });
  });
});
