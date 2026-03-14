import { rewriteStructureForPacing } from '../../../src/engine/pacing-rewrite';
import * as structureRewriter from '../../../src/engine/structure-rewriter';
import * as persistence from '../../../src/persistence/story-repository';
import { createStoryStructure } from '../../../src/engine/structure-factory';
import { createStory } from '../../../src/models/story';
import { createChoice, createPage } from '../../../src/models';
import type { PageId } from '../../../src/models/id';
import {
  createInitialVersionedStructure,
  VersionedStoryStructure,
} from '../../../src/models/structure-version';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import type { StructureRewriteResult } from '../../../src/llm/structure-rewrite-types';
import type { AnalystResult } from '../../../src/llm/analyst-types';
import {
  buildMinimalDecomposedCharacter,
  MINIMAL_DECOMPOSED_WORLD,
} from '../../fixtures/decomposed';

function createTestStructure(): StoryStructure {
  return createStoryStructure({
    overallTheme: 'Resilience',
    premise: 'A test story.',
    openingImage: 'A quiet village.',
    closingImage: 'A changed world.',
    pacingBudget: { targetPagesMin: 10, targetPagesMax: 30 },
    acts: [
      {
        name: 'Act One',
        objective: 'Begin',
        stakes: 'Everything',
        entryCondition: 'Start',
        milestones: [
          {
            name: 'Setup',
            description: 'Initial setup',
            objective: 'Establish the world',
            causalLink: 'Because this is the beginning.',
            role: 'setup',
            escalationType: null,
            crisisType: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Rising',
            description: 'Rising tension',
            objective: 'Build momentum',
            causalLink: 'Because the setup demands escalation.',
            role: 'escalation',
            escalationType: null,
            crisisType: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
    ],
    rawResponse: '{}',
  });
}

function createMinimalAnalystResult(overrides: Partial<AnalystResult> = {}): AnalystResult {
  return {
    milestoneConcluded: false,
    milestoneResolution: '',
    deviation: { detected: false, reason: '', invalidatedMilestoneIds: [], sceneSummary: '' },
    spineDeviation: {
      detected: false,
      reason: '',
      thematicDrift: '',
      suggestedCourseCorrection: '',
    },
    pacingIssueDetected: true,
    pacingIssueReason: 'Milestone stalling after many pages',
    recommendedAction: 'rewrite' as const,
    sceneMomentum: 'dragging' as const,
    sceneSummary: 'The hero is stuck.',
    milestoneAlignmentConfidence: 'high' as const,
    objectiveEvidenceStrength: 'moderate' as const,
    commitmentStrength: 'moderate' as const,
    structuralPositionSignal: 'on_track' as const,
    entryConditionReadiness: null,
    promisesDetected: [],
    promisesResolved: [],
    promisePayoffAssessments: [],
    threadPayoffAssessments: [],
    thematicCharge: 'rising' as const,
    narrativeFocus: 'character' as const,
    proseAudit: null,
    detectedRelationshipShifts: [],
    rawResponse: '{}',
    ...overrides,
  } as AnalystResult;
}

describe('rewriteStructureForPacing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a new structure version and persists the updated story', async () => {
    const structure = createTestStructure();
    const version = createInitialVersionedStructure(structure);
    const story = {
      ...createStory({
        title: 'Pacing Test',
        characterConcept: 'Hero',
        worldbuilding: 'World',
        tone: 'epic',
      }),
      structureVersions: [version] as readonly VersionedStoryStructure[],
      structure,
      decomposedCharacters: [buildMinimalDecomposedCharacter('Hero')],
      decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    };

    const structureState: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 1,
      milestoneProgressions: [
        { milestoneId: '1.1', status: 'concluded', resolution: 'Done.' },
        { milestoneId: '1.2', status: 'active' },
      ],
      pagesInCurrentMilestone: 5,
      pacingNudge: null,
    };

    const analystResult = createMinimalAnalystResult();

    const page = createPage({
      id: 3 as PageId,
      narrativeText: 'The hero waits.',
      sceneSummary: 'Waiting scene.',
      choices: [createChoice('Continue'), createChoice('Retreat')],
      isEnding: false,
      parentPageId: 2 as PageId,
      parentChoiceIndex: 0,
      analystResult,
      parentAccumulatedStructureState: structureState,
      structureVersionId: version.id,
    });

    const rewriteResult: StructureRewriteResult = {
      structure: createTestStructure(),
      preservedMilestoneIds: ['1.1'],
      rawResponse: '{}',
    };

    const mockRewriter = {
      rewriteStructure: jest.fn().mockResolvedValue(rewriteResult),
    };
    jest.spyOn(structureRewriter, 'createStructureRewriter').mockReturnValue(mockRewriter);
    jest.spyOn(persistence, 'updateStory').mockResolvedValue(undefined);

    const result = await rewriteStructureForPacing(story, page, 'test-api-key');

    expect(mockRewriter.rewriteStructure).toHaveBeenCalledTimes(1);
    expect(persistence.updateStory).toHaveBeenCalledTimes(1);
    expect(result.newVersion.previousVersionId).toBe(version.id);
    expect(result.newVersion.rewriteReason).toBe(
      'Pacing issue: Milestone stalling after many pages'
    );
    expect(result.updatedStory.structureVersions).toHaveLength(2);
  });

  it('throws when story has no structure versions', async () => {
    const story = createStory({
      title: 'No Versions',
      characterConcept: 'Hero',
      worldbuilding: 'World',
      tone: 'epic',
    });

    const page = createPage({
      id: 1 as PageId,
      narrativeText: 'Test.',
      sceneSummary: 'Test.',
      choices: [],
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
    });

    await expect(rewriteStructureForPacing(story, page, 'key')).rejects.toThrow(
      'Story has no structure versions'
    );
  });

  it('throws when page has no rewrite recommendation', async () => {
    const structure = createTestStructure();
    const version = createInitialVersionedStructure(structure);
    const story = {
      ...createStory({
        title: 'No Rewrite',
        characterConcept: 'Hero',
        worldbuilding: 'World',
        tone: 'epic',
      }),
      structureVersions: [version] as readonly VersionedStoryStructure[],
      structure,
    };

    const page = createPage({
      id: 1 as PageId,
      narrativeText: 'Test.',
      sceneSummary: 'Test.',
      choices: [],
      isEnding: true,
      parentPageId: null,
      parentChoiceIndex: null,
      analystResult: createMinimalAnalystResult({ recommendedAction: 'none' as const }),
    });

    await expect(rewriteStructureForPacing(story, page, 'key')).rejects.toThrow(
      'Page does not have a pacing rewrite recommendation'
    );
  });
});
