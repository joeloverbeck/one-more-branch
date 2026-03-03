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
}));

jest.mock('../../../src/config/stage-model', () => ({
  getStageModel: jest.fn().mockReturnValue('test-model/structure-rewrite-v1'),
  getStageMaxTokens: jest.fn().mockReturnValue(32768),
}));

jest.mock('../../../src/config', () => ({
  getConfig: jest.fn().mockReturnValue({
    llm: {
      temperature: 0.8,
    },
  }),
}));

import { createStructureRewriter } from '../../../src/engine/structure-rewriter';
import { getStageModel, getStageMaxTokens } from '../../../src/config/stage-model';
import type { StructureRewriteContext } from '../../../src/llm/structure-rewrite-types';
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
        beatIndex: 0,
        beatId: '1.1',
        name: 'Mutiny escape',
        description: 'Survive the mutiny at Blackwake Harbor',
        objective: 'Escape with command logs',
        causalLink: 'Because the admiral frames the captain during tribunal.',
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
    narrativeSummary: 'The captain publicly allied with a former enemy admiral.',
    currentActIndex: 0,
    currentBeatIndex: 1,
    deviationReason: 'Prior rebellion beats are no longer viable after alliance reversal.',
    originalTheme: 'Loyalty tested by survival',
    originalOpeningImage: 'A harbor at dawn.',
    originalClosingImage: 'A fleet sailing into sunset.',
    totalActCount: 3,
    ...overrides,
  };
}

function createValidStructureResponse(): Record<string, unknown> {
  return {
    overallTheme: 'Alliance forged in adversity',
    premise: 'A disgraced captain must unite rival fleets.',
    openingImage: 'Opening image.',
    closingImage: 'Closing image.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act One',
        objective: 'Stabilize the fragile alliance',
        stakes: 'The fleet fractures',
        entryCondition: 'Alliance is announced',
        beats: [
          {
            name: 'Mutiny escape',
            description: 'Survive the mutiny at Blackwake Harbor',
            objective: 'Escape with command logs',
            causalLink: 'Because the admiral frames the captain.',
            role: 'setup',
          },
          {
            name: 'Neutral passage pact',
            description: 'Negotiate safe passage',
            objective: 'Secure routes',
            causalLink: 'Because the fleet is trapped.',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Outmaneuver loyalists',
        stakes: 'Civil war',
        entryCondition: 'Fleet enters blockade',
        beats: [
          {
            name: 'Convoy interception',
            description: 'Intercept the sabotage convoy',
            objective: 'Protect supply lines',
            causalLink: 'Because the pact exposes a timetable.',
            role: 'escalation',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
          },
          {
            name: 'Council exposure',
            description: 'Expose the guild traitor',
            objective: 'Preserve legitimacy',
            causalLink: 'Because the convoy carries cipher seals.',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Three',
        objective: 'Decide who rules',
        stakes: 'Tyranny',
        entryCondition: 'Stormfront closes',
        beats: [
          {
            name: 'Maelstrom strike',
            description: 'Lead a final strike',
            objective: 'Break the siege',
            causalLink: 'Because the traitor fortifies before stormfall.',
            role: 'turning_point',
          },
          {
            name: 'Judgment of rivals',
            description: 'Choose mercy or retribution',
            objective: 'Define the new order',
            causalLink: 'Because the strike captures rival leadership.',
            role: 'resolution',
          },
        ],
      },
    ],
  };
}

describe('structure-rewriter default generator model selection', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    mockLogPrompt.mockReset();
    (getStageModel as jest.Mock).mockReturnValue('test-model/structure-rewrite-v1');
    (getStageMaxTokens as jest.Mock).mockReturnValue(32768);

    fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(createValidStructureResponse()),
            },
          },
        ],
      }),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('uses getStageModel("structureRewrite") for model selection', async () => {
    const rewriter = createStructureRewriter();
    const context = createRewriteContext();
    await rewriter.rewriteStructure(context, 'test-api-key');

    expect(getStageModel).toHaveBeenCalledWith('structureRewrite');
  });

  it('uses getStageMaxTokens("structureRewrite") for max tokens', async () => {
    const rewriter = createStructureRewriter();
    const context = createRewriteContext();
    await rewriter.rewriteStructure(context, 'test-api-key');

    expect(getStageMaxTokens).toHaveBeenCalledWith('structureRewrite');
  });

  it('passes stage model and max tokens in the fetch request body', async () => {
    const rewriter = createStructureRewriter();
    const context = createRewriteContext();
    await rewriter.rewriteStructure(context, 'test-api-key');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['model']).toBe('test-model/structure-rewrite-v1');
    expect(body['max_tokens']).toBe(32768);
  });

  it('uses a custom stage model when configured differently', async () => {
    (getStageModel as jest.Mock).mockReturnValue('custom/structure-model');
    (getStageMaxTokens as jest.Mock).mockReturnValue(16384);

    const rewriter = createStructureRewriter();
    const context = createRewriteContext();
    await rewriter.rewriteStructure(context, 'test-api-key');

    const fetchCall = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;
    expect(body['model']).toBe('custom/structure-model');
    expect(body['max_tokens']).toBe(16384);
  });
});
