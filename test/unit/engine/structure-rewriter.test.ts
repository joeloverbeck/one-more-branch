const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
  logResponse: jest.fn(),
}));

import {
  createStructureRewriter,
  mergePreservedWithRegenerated,
  StructureRewriteGenerator,
} from '../../../src/engine/structure-rewriter';
import { LLMError } from '../../../src/llm/llm-client-types';
import type { StructureRewriteContext } from '../../../src/llm/structure-rewrite-types';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import type { StoryStructure } from '../../../src/models/story-arc';
import {
  buildMinimalDecomposedCharacter,
  MINIMAL_DECOMPOSED_WORLD,
} from '../../fixtures/decomposed';

function createRewriteContext(
  overrides?: Partial<StructureRewriteContext>
): StructureRewriteContext {
  return {
    tone: 'dark nautical intrigue',
    decomposedCharacters: [
      buildMinimalDecomposedCharacter('A disgraced captain seeking absolution'),
    ],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    completedBeats: [
      {
        actIndex: 0,
        milestoneIndex: 0,
        milestoneId: '1.1',
        name: 'Mutiny escape',
        description: 'Survive the mutiny at Blackwake Harbor',
        objective: 'Escape with command logs',
        causalLink: 'Because the admiral frames the captain during tribunal.',
        exitCondition: 'The captain escapes with the logs intact.',
        role: 'setup',
        escalationType: null,
        secondaryEscalationType: null,
        crisisType: null,
        expectedGapMagnitude: null,
        isMidpoint: false,
        midpointType: null,
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        obligatorySceneTag: null,
        resolution: 'The captain escaped with proof of betrayal.',
      },
    ],
    plannedBeats: [],
    sceneSummary: 'The captain publicly allied with a former enemy admiral.',
    currentActIndex: 0,
    currentMilestoneIndex: 1,
    deviationReason: 'Prior rebellion milestones are no longer viable after alliance reversal.',
    originalTheme: 'Loyalty tested by survival',
    totalActCount: 3,
    ...overrides,
  };
}

function createGeneratedStructure(
  overrides?: Partial<StructureGenerationResult>
): StructureGenerationResult {
  return {
    overallTheme: 'Rewritten theme candidate',
    premise:
      'A disgraced captain must unite rival fleets before storm season destroys the archipelago.',
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The captain is framed in public.' },
      midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 2, description: 'The final harbor battle decides the fleet.' },
      signatureScenarioPlacement: null,
    },
    acts: [
      {
        name: 'Act One',
        objective: 'Stabilize the fragile alliance',
        stakes: 'The fleet fractures without trust',
        entryCondition: 'Alliance is announced in harbor council',
        actQuestion: 'Can the alliance survive its first test?',
        exitReversal: 'Neutral captains force the fleet into uneasy cooperation.',
        promiseTargets: ['Rival fleets can unite'],
        obligationTargets: ['alliance_test'],
        milestones: [
          {
            name: 'Mutiny escape',
            description: 'Survive the mutiny at Blackwake Harbor',
            objective: 'Escape with command logs',
            causalLink: 'Because the admiral frames the captain during tribunal.',
            exitCondition: 'The captain escapes with the command logs.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Neutral passage pact',
            description: 'Negotiate safe passage with neutral captains',
            objective: 'Secure routes to contested waters',
            causalLink: 'Because the surviving fleet is trapped by blockade tolls.',
            exitCondition: 'Neutral captains grant safe passage.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Outmaneuver guild loyalists',
        stakes: 'Civil war engulfs the isles',
        entryCondition: 'Alliance fleet enters blockade corridor',
        actQuestion: 'Can the fleet outmaneuver the loyalists before civil war ignites?',
        exitReversal: 'The war council fractures under exposed betrayal.',
        promiseTargets: ['Rival fleets can unite'],
        obligationTargets: ['betrayal_exposed'],
        milestones: [
          {
            name: 'Convoy interception',
            description: 'Intercept the sabotage convoy',
            objective: 'Protect alliance supply lines',
            causalLink: 'Because the neutral pact exposes a sabotage timetable.',
            exitCondition: 'The sabotage convoy is stopped.',
            role: 'escalation',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Council exposure',
            description: 'Expose the guild traitor on the war council',
            objective: 'Preserve command legitimacy',
            causalLink: 'Because the intercepted convoy carries council cipher seals.',
            exitCondition: 'The traitor is exposed before the council.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        name: 'Act Three',
        objective: 'Decide who rules the fleet',
        stakes: 'The archipelago falls into tyranny',
        entryCondition: 'Stormfront closes around final harbor',
        actQuestion: 'What order will replace the old regime?',
        exitReversal: '',
        promiseTargets: ['Rival fleets can unite'],
        obligationTargets: ['final_reckoning'],
        milestones: [
          {
            name: 'Maelstrom strike',
            description: 'Lead a final strike through the maelstrom',
            objective: 'Break the siege of the capital dock',
            causalLink: 'Because the traitor fortifies the capital before stormfall.',
            exitCondition: 'The siege is broken.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Judgment of rivals',
            description: 'Choose mercy or retribution for captured rivals',
            objective: 'Define the new political order',
            causalLink: 'Because the maelstrom strike captures the rival leadership.',
            exitCondition: 'A new order for the fleet is chosen.',
            role: 'resolution',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
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
    rawResponse: '{"mock":true}',
    ...overrides,
  };
}

function createStoryStructure(overrides?: Partial<StoryStructure>): StoryStructure {
  return {
    overallTheme: 'Generated structure theme',
    premise: 'A test premise for the generated structure.',
    openingImage: 'An opening image placeholder.',
    closingImage: 'A closing image placeholder.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'Initial disruption.' },
      midpoint: { actIndex: 1, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 2, description: 'Final confrontation.' },
      signatureScenarioPlacement: null,
    },
    generatedAt: new Date('2026-02-07T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Objective 1',
        stakes: 'Stakes 1',
        entryCondition: 'Entry 1',
        actQuestion: 'Question 1',
        exitReversal: 'Reversal 1',
        promiseTargets: ['promise-1'],
        obligationTargets: ['obligation-1'],
        milestones: [
          {
            id: '1.1',
            name: 'Milestone Name 1.1',
            description: 'Milestone 1.1',
            objective: 'Goal 1.1',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 1.1 is satisfied.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            id: '1.2',
            name: 'Milestone Name 1.2',
            description: 'Milestone 1.2',
            objective: 'Goal 1.2',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 1.2 is satisfied.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        id: '2',
        name: 'Act Two',
        objective: 'Objective 2',
        stakes: 'Stakes 2',
        entryCondition: 'Entry 2',
        actQuestion: 'Question 2',
        exitReversal: 'Reversal 2',
        promiseTargets: ['promise-2'],
        obligationTargets: ['obligation-2'],
        milestones: [
          {
            id: '2.1',
            name: 'Milestone Name 2.1',
            description: 'Milestone 2.1',
            objective: 'Goal 2.1',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 2.1 is satisfied.',
            role: 'escalation',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: true,
            midpointType: 'FALSE_DEFEAT',
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            id: '2.2',
            name: 'Milestone Name 2.2',
            description: 'Milestone 2.2',
            objective: 'Goal 2.2',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 2.2 is satisfied.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
      {
        id: '3',
        name: 'Act Three',
        objective: 'Objective 3',
        stakes: 'Stakes 3',
        entryCondition: 'Entry 3',
        actQuestion: 'Question 3',
        exitReversal: '',
        promiseTargets: ['promise-3'],
        obligationTargets: ['obligation-3'],
        milestones: [
          {
            id: '3.1',
            name: 'Milestone Name 3.1',
            description: 'Milestone 3.1',
            objective: 'Goal 3.1',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 3.1 is satisfied.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
          {
            id: '3.2',
            name: 'Milestone Name 3.2',
            description: 'Milestone 3.2',
            objective: 'Goal 3.2',
            causalLink: 'Because of prior events.',
            exitCondition: 'Goal 3.2 is satisfied.',
            role: 'resolution',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
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
    ...overrides,
  };
}

describe('structure-rewriter', () => {
  beforeEach(() => {
    mockLogPrompt.mockReset();
  });

  describe('createStructureRewriter', () => {
    it('builds prompt messages, calls generator, and returns merged rewrite result', async () => {
      const context = createRewriteContext();
      const generator: jest.MockedFunction<StructureRewriteGenerator> = jest
        .fn<ReturnType<StructureRewriteGenerator>, Parameters<StructureRewriteGenerator>>()
        .mockResolvedValue(createGeneratedStructure());

      const rewriter = createStructureRewriter(generator);

      const result = await rewriter.rewriteStructure(context, 'test-api-key');

      expect(generator).toHaveBeenCalledTimes(1);
      expect(generator).toHaveBeenCalledWith(
        [expect.objectContaining({ role: 'system' }), expect.objectContaining({ role: 'user' })],
        'test-api-key'
      );
      expect(mockLogPrompt).toHaveBeenCalledWith(
        mockLogger,
        'structureRewrite',
        expect.any(Array)
      );
      expect(mockLogPrompt).toHaveBeenCalledTimes(1);
      expect(result.preservedMilestoneIds).toEqual(['1.1']);
      expect(result.rawResponse).toBe('{"mock":true}');
      expect(result.structure.overallTheme).toBe(context.originalTheme);
      expect(result.structure.acts).toHaveLength(3);
      expect(result.structure.acts[0]?.milestones[0]).toEqual({
        id: '1.1',
        name: 'Mutiny escape',
        description: 'Survive the mutiny at Blackwake Harbor',
        objective: 'Escape with command logs',
        causalLink: 'Because the admiral frames the captain during tribunal.',
        exitCondition: 'The captain escapes with the logs intact.',
        role: 'setup',
        escalationType: null,
        secondaryEscalationType: null,
        crisisType: null,
        expectedGapMagnitude: null,
        isMidpoint: false,
        midpointType: null,
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        obligatorySceneTag: null,
      });
      expect(result.structure.acts[0]?.milestones[1]).toEqual({
        id: '1.2',
        name: 'Neutral passage pact',
        description: 'Negotiate safe passage with neutral captains',
        objective: 'Secure routes to contested waters',
        causalLink: 'Because the surviving fleet is trapped by blockade tolls.',
        exitCondition: 'Neutral captains grant safe passage.',
        role: 'turning_point',
        escalationType: null,
        secondaryEscalationType: null,
        crisisType: null,
        expectedGapMagnitude: null,
        isMidpoint: false,
        midpointType: null,
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        obligatorySceneTag: null,
      });
    });

    it('propagates STRUCTURE_PARSE_ERROR with rawContent when generator returns invalid structure', async () => {
      const context = createRewriteContext();
      const twoActPayload = {
        overallTheme: 'Some theme',
        premise: 'Some premise',
        openingImage: 'An opening image placeholder.',
        closingImage: 'A closing image placeholder.',
        pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
        acts: [
          {
            name: 'Act One',
            objective: 'Obj 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            milestones: [
              {
                name: 'Milestone 1',
                description: 'Desc 1',
                objective: 'Goal 1',
                role: 'setup',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
              },
              {
                name: 'Milestone 2',
                description: 'Desc 2',
                objective: 'Goal 2',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
              },
            ],
          },
          {
            name: 'Act Two',
            objective: 'Obj 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            milestones: [
              {
                name: 'Milestone 3',
                description: 'Desc 3',
                objective: 'Goal 3',
                role: 'escalation',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
              },
              {
                name: 'Milestone 4',
                description: 'Desc 4',
                objective: 'Goal 4',
                role: 'resolution',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
              },
            ],
          },
        ],
      };
      const rawContent = JSON.stringify(twoActPayload);

      const generator: jest.MockedFunction<StructureRewriteGenerator> = jest
        .fn<ReturnType<StructureRewriteGenerator>, Parameters<StructureRewriteGenerator>>()
        .mockRejectedValue(
          new LLMError(
            'Structure response must include 3-5 acts (received: 2)',
            'STRUCTURE_PARSE_ERROR',
            true,
            { rawContent }
          )
        );

      const rewriter = createStructureRewriter(generator);

      await expect(rewriter.rewriteStructure(context, 'test-api-key')).rejects.toMatchObject({
        code: 'STRUCTURE_PARSE_ERROR',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message: expect.stringContaining('received: 2'),
        context: { rawContent },
      });
    });
  });

  describe('mergePreservedWithRegenerated', () => {
    it('keeps preserved milestones unchanged and uses sequential hierarchical milestone IDs', () => {
      const regenerated = createStoryStructure();
      const merged = mergePreservedWithRegenerated(
        [
          {
            actIndex: 0,
            milestoneIndex: 0,
            milestoneId: '1.1',
            name: 'Preserved Milestone',
            description: 'Preserved 1.1',
            objective: 'Keep original objective',
            causalLink: 'Because this milestone is already canon.',
            exitCondition: 'The preserved milestone remains concluded.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
            resolution: 'Resolved already',
          },
        ],
        regenerated,
        'Original theme'
      );

      expect(merged.overallTheme).toBe('Original theme');
      expect(merged.acts).toHaveLength(3);
      expect(merged.acts[0]?.milestones[0]).toEqual({
        id: '1.1',
        name: 'Preserved Milestone',
        description: 'Preserved 1.1',
        objective: 'Keep original objective',
        causalLink: 'Because this milestone is already canon.',
        exitCondition: 'The preserved milestone remains concluded.',
        role: 'setup',
        escalationType: null,
        secondaryEscalationType: null,
        crisisType: null,
        expectedGapMagnitude: null,
        isMidpoint: false,
        midpointType: null,
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        obligatorySceneTag: null,
      });

      for (const [actIndex, act] of merged.acts.entries()) {
        for (const [milestoneIndex, milestone] of act.milestones.entries()) {
          expect(milestone.id).toBe(`${actIndex + 1}.${milestoneIndex + 1}`);
        }
      }
    });

    it('retains preserved milestone IDs and appends regenerated milestones after the highest preserved index', () => {
      const regenerated = createStoryStructure({
        acts: [
          {
            id: '1',
            name: 'Act One',
            objective: 'Objective 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            milestones: [
              {
                id: '1.1',
                name: 'Milestone Name 1.1',
                description: 'Milestone 1.1',
                objective: 'Goal 1.1',
                role: 'setup',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '1.2',
                name: 'Milestone Name 1.2',
                description: 'Milestone 1.2',
                objective: 'Goal 1.2',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '2',
            name: 'Act Two',
            objective: 'Objective 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            milestones: [
              {
                id: '2.1',
                name: 'Milestone Name 2.1',
                description: 'Milestone 2.1',
                objective: 'Goal 2.1',
                role: 'escalation',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '2.2',
                name: 'Milestone Name 2.2',
                description: 'Milestone 2.2',
                objective: 'Goal 2.2',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '3',
            name: 'Act Three',
            objective: 'Objective 3',
            stakes: 'Stakes 3',
            entryCondition: 'Entry 3',
            milestones: [
              {
                id: '3.1',
                name: 'Milestone Name 3.1',
                description: 'Milestone 3.1',
                objective: 'Goal 3.1',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '3.2',
                name: 'Milestone Name 3.2',
                description: 'Milestone 3.2',
                objective: 'Goal 3.2',
                role: 'resolution',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
        ],
      });

      const merged = mergePreservedWithRegenerated(
        [
          {
            actIndex: 0,
            milestoneIndex: 1,
            milestoneId: '1.2',
            name: 'Preserved Milestone 1.2',
            description: 'Preserved 1.2',
            objective: 'Keep original objective',
            causalLink: 'Because this milestone remains canon.',
            exitCondition: 'The preserved turning point remains concluded.',
            role: 'turning_point',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
            resolution: 'Resolved already',
          },
        ],
        regenerated,
        'Original theme'
      );

      expect(merged.acts[0]?.milestones[0]).toEqual({
        id: '1.2',
        name: 'Preserved Milestone 1.2',
        description: 'Preserved 1.2',
        objective: 'Keep original objective',
        causalLink: 'Because this milestone remains canon.',
        exitCondition: 'The preserved turning point remains concluded.',
        role: 'turning_point',
        escalationType: null,
        secondaryEscalationType: null,
        crisisType: null,
        expectedGapMagnitude: null,
        isMidpoint: false,
        midpointType: null,
        uniqueScenarioHook: null,
        approachVectors: null,
        setpieceSourceIndex: null,
        obligatorySceneTag: null,
      });
      expect(merged.acts[0]?.milestones[1]?.id).toBe('1.3');
    });

    it('throws when an act has neither preserved nor regenerated milestones', () => {
      const regenerated = createStoryStructure({
        acts: [
          {
            id: '1',
            name: 'Act One',
            objective: 'Objective 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            milestones: [
              {
                id: '1.1',
                name: 'Milestone Name 1.1',
                description: 'Milestone 1.1',
                objective: 'Goal 1.1',
                role: 'setup',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '1.2',
                name: 'Milestone Name 1.2',
                description: 'Milestone 1.2',
                objective: 'Goal 1.2',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '2',
            name: 'Act Two',
            objective: 'Objective 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            milestones: [],
          },
          {
            id: '3',
            name: 'Act Three',
            objective: 'Objective 3',
            stakes: 'Stakes 3',
            entryCondition: 'Entry 3',
            milestones: [
              {
                id: '3.1',
                name: 'Milestone Name 3.1',
                description: 'Milestone 3.1',
                objective: 'Goal 3.1',
                role: 'turning_point',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
              {
                id: '3.2',
                name: 'Milestone Name 3.2',
                description: 'Milestone 3.2',
                objective: 'Goal 3.2',
                role: 'resolution',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
        ],
      });

      expect(() => mergePreservedWithRegenerated([], regenerated, 'Original theme')).toThrow(
        'Merged structure is missing milestones for act 2'
      );
    });

    it('deduplicates regenerated milestones with whitespace-variant signatures', () => {
      const regenerated = createStoryStructure({
        acts: [
          {
            id: '1',
            name: 'Act One',
            objective: 'Objective 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            milestones: [
              {
                id: '1.1',
                name: 'New Milestone',
                description: 'Fight  the  villain ',
                objective: 'Defeat  evil ',
                role: 'escalation',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '2',
            name: 'Act Two',
            objective: 'Objective 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            milestones: [
              {
                id: '2.1',
                name: 'Milestone 2.1',
                description: 'Milestone 2.1',
                objective: 'Goal 2.1',
                role: 'escalation',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
          {
            id: '3',
            name: 'Act Three',
            objective: 'Objective 3',
            stakes: 'Stakes 3',
            entryCondition: 'Entry 3',
            milestones: [
              {
                id: '3.1',
                name: 'Milestone 3.1',
                description: 'Milestone 3.1',
                objective: 'Goal 3.1',
                role: 'resolution',
                escalationType: null,
                crisisType: null,
                expectedGapMagnitude: null,
                uniqueScenarioHook: null,
                approachVectors: null,
                setpieceSourceIndex: null,
                obligatorySceneTag: null,
              },
            ],
          },
        ],
      });

      const merged = mergePreservedWithRegenerated(
        [
          {
            actIndex: 0,
            milestoneIndex: 0,
            milestoneId: '1.1',
            name: 'Preserved Milestone',
            description: 'Fight the villain',
            objective: 'Defeat evil',
            causalLink: 'Because the climax has already been triggered.',
            exitCondition: 'The villain is defeated.',
            role: 'setup',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
            resolution: 'Villain was defeated',
          },
        ],
        regenerated,
        'Theme'
      );

      expect(merged.acts[0]?.milestones).toHaveLength(1);
      expect(merged.acts[0]?.milestones[0]?.name).toBe('Preserved Milestone');
    });
  });
});
