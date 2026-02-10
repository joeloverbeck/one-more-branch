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

import {
  createStructureRewriter,
  mergePreservedWithRegenerated,
  StructureRewriteGenerator,
} from '../../../src/engine/structure-rewriter';
import type { StructureRewriteContext } from '../../../src/llm/types';
import type { StructureGenerationResult } from '../../../src/engine/structure-types';
import type { StoryStructure } from '../../../src/models/story-arc';

function createRewriteContext(overrides?: Partial<StructureRewriteContext>): StructureRewriteContext {
  return {
    characterConcept: 'A disgraced captain seeking absolution',
    worldbuilding: 'A chain of storm-bound islands governed by rival guilds',
    tone: 'dark nautical intrigue',
    completedBeats: [
      {
        actIndex: 0,
        beatIndex: 0,
        beatId: '1.1',
        name: 'Mutiny escape',
        description: 'Survive the mutiny at Blackwake Harbor',
        objective: 'Escape with command logs',
        role: 'setup',
        resolution: 'The captain escaped with proof of betrayal.',
      },
    ],
    narrativeSummary: 'The captain publicly allied with a former enemy admiral.',
    currentActIndex: 0,
    currentBeatIndex: 1,
    deviationReason: 'Prior rebellion beats are no longer viable after alliance reversal.',
    originalTheme: 'Loyalty tested by survival',
    ...overrides,
  };
}

function createGeneratedStructure(overrides?: Partial<StructureGenerationResult>): StructureGenerationResult {
  return {
    overallTheme: 'Rewritten theme candidate',
    premise: 'A disgraced captain must unite rival fleets before storm season destroys the archipelago.',
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    acts: [
      {
        name: 'Act One',
        objective: 'Stabilize the fragile alliance',
        stakes: 'The fleet fractures without trust',
        entryCondition: 'Alliance is announced in harbor council',
        beats: [
          {
            name: 'Mutiny escape',
            description: 'Survive the mutiny at Blackwake Harbor',
            objective: 'Escape with command logs',
            role: 'setup',
          },
          {
            name: 'Neutral passage pact',
            description: 'Negotiate safe passage with neutral captains',
            objective: 'Secure routes to contested waters',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Two',
        objective: 'Outmaneuver guild loyalists',
        stakes: 'Civil war engulfs the isles',
        entryCondition: 'Alliance fleet enters blockade corridor',
        beats: [
          {
            name: 'Convoy interception',
            description: 'Intercept the sabotage convoy',
            objective: 'Protect alliance supply lines',
            role: 'escalation',
          },
          {
            name: 'Council exposure',
            description: 'Expose the guild traitor on the war council',
            objective: 'Preserve command legitimacy',
            role: 'turning_point',
          },
        ],
      },
      {
        name: 'Act Three',
        objective: 'Decide who rules the fleet',
        stakes: 'The archipelago falls into tyranny',
        entryCondition: 'Stormfront closes around final harbor',
        beats: [
          {
            name: 'Maelstrom strike',
            description: 'Lead a final strike through the maelstrom',
            objective: 'Break the siege of the capital dock',
            role: 'turning_point',
          },
          {
            name: 'Judgment of rivals',
            description: 'Choose mercy or retribution for captured rivals',
            objective: 'Define the new political order',
            role: 'resolution',
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
    pacingBudget: { targetPagesMin: 15, targetPagesMax: 40 },
    generatedAt: new Date('2026-02-07T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'Act One',
        objective: 'Objective 1',
        stakes: 'Stakes 1',
        entryCondition: 'Entry 1',
        beats: [
          { id: '1.1', name: 'Beat Name 1.1', description: 'Beat 1.1', objective: 'Goal 1.1', role: 'setup' },
          { id: '1.2', name: 'Beat Name 1.2', description: 'Beat 1.2', objective: 'Goal 1.2', role: 'turning_point' },
        ],
      },
      {
        id: '2',
        name: 'Act Two',
        objective: 'Objective 2',
        stakes: 'Stakes 2',
        entryCondition: 'Entry 2',
        beats: [
          { id: '2.1', name: 'Beat Name 2.1', description: 'Beat 2.1', objective: 'Goal 2.1', role: 'escalation' },
          { id: '2.2', name: 'Beat Name 2.2', description: 'Beat 2.2', objective: 'Goal 2.2', role: 'turning_point' },
        ],
      },
      {
        id: '3',
        name: 'Act Three',
        objective: 'Objective 3',
        stakes: 'Stakes 3',
        entryCondition: 'Entry 3',
        beats: [
          { id: '3.1', name: 'Beat Name 3.1', description: 'Beat 3.1', objective: 'Goal 3.1', role: 'turning_point' },
          { id: '3.2', name: 'Beat Name 3.2', description: 'Beat 3.2', objective: 'Goal 3.2', role: 'resolution' },
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
        [
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ],
        'test-api-key',
      );
      expect(mockLogPrompt).toHaveBeenCalledWith(mockLogger, 'structure-rewrite', expect.any(Array));
      expect(mockLogPrompt).toHaveBeenCalledTimes(1);
      expect(result.preservedBeatIds).toEqual(['1.1']);
      expect(result.rawResponse).toBe('{"mock":true}');
      expect(result.structure.overallTheme).toBe(context.originalTheme);
      expect(result.structure.acts).toHaveLength(3);
      expect(result.structure.acts[0]?.beats[0]).toEqual({
        id: '1.1',
        name: 'Mutiny escape',
        description: 'Survive the mutiny at Blackwake Harbor',
        objective: 'Escape with command logs',
        role: 'setup',
      });
      expect(result.structure.acts[0]?.beats[1]).toEqual({
        id: '1.2',
        name: 'Neutral passage pact',
        description: 'Negotiate safe passage with neutral captains',
        objective: 'Secure routes to contested waters',
        role: 'turning_point',
      });
    });
  });

  describe('mergePreservedWithRegenerated', () => {
    it('keeps preserved beats unchanged and uses sequential hierarchical beat IDs', () => {
      const regenerated = createStoryStructure();
      const merged = mergePreservedWithRegenerated(
        [
          {
            actIndex: 0,
            beatIndex: 0,
            beatId: '1.1',
            name: 'Preserved Beat',
            description: 'Preserved 1.1',
            objective: 'Keep original objective',
            role: 'setup',
            resolution: 'Resolved already',
          },
        ],
        regenerated,
        'Original theme',
      );

      expect(merged.overallTheme).toBe('Original theme');
      expect(merged.acts).toHaveLength(3);
      expect(merged.acts[0]?.beats[0]).toEqual({
        id: '1.1',
        name: 'Preserved Beat',
        description: 'Preserved 1.1',
        objective: 'Keep original objective',
        role: 'setup',
      });

      for (const [actIndex, act] of merged.acts.entries()) {
        for (const [beatIndex, beat] of act.beats.entries()) {
          expect(beat.id).toBe(`${actIndex + 1}.${beatIndex + 1}`);
        }
      }
    });

    it('retains preserved beat IDs and appends regenerated beats after the highest preserved index', () => {
      const regenerated = createStoryStructure({
        acts: [
          {
            id: '1',
            name: 'Act One',
            objective: 'Objective 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            beats: [
              { id: '1.1', name: 'Beat Name 1.1', description: 'Beat 1.1', objective: 'Goal 1.1', role: 'setup' },
              { id: '1.2', name: 'Beat Name 1.2', description: 'Beat 1.2', objective: 'Goal 1.2', role: 'turning_point' },
            ],
          },
          {
            id: '2',
            name: 'Act Two',
            objective: 'Objective 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            beats: [
              { id: '2.1', name: 'Beat Name 2.1', description: 'Beat 2.1', objective: 'Goal 2.1', role: 'escalation' },
              { id: '2.2', name: 'Beat Name 2.2', description: 'Beat 2.2', objective: 'Goal 2.2', role: 'turning_point' },
            ],
          },
          {
            id: '3',
            name: 'Act Three',
            objective: 'Objective 3',
            stakes: 'Stakes 3',
            entryCondition: 'Entry 3',
            beats: [
              { id: '3.1', name: 'Beat Name 3.1', description: 'Beat 3.1', objective: 'Goal 3.1', role: 'turning_point' },
              { id: '3.2', name: 'Beat Name 3.2', description: 'Beat 3.2', objective: 'Goal 3.2', role: 'resolution' },
            ],
          },
        ],
      });

      const merged = mergePreservedWithRegenerated(
        [
          {
            actIndex: 0,
            beatIndex: 1,
            beatId: '1.2',
            name: 'Preserved Beat 1.2',
            description: 'Preserved 1.2',
            objective: 'Keep original objective',
            role: 'turning_point',
            resolution: 'Resolved already',
          },
        ],
        regenerated,
        'Original theme',
      );

      expect(merged.acts[0]?.beats[0]).toEqual({
        id: '1.2',
        name: 'Preserved Beat 1.2',
        description: 'Preserved 1.2',
        objective: 'Keep original objective',
        role: 'turning_point',
      });
      expect(merged.acts[0]?.beats[1]?.id).toBe('1.3');
    });

    it('throws when an act has neither preserved nor regenerated beats', () => {
      const regenerated = createStoryStructure({
        acts: [
          {
            id: '1',
            name: 'Act One',
            objective: 'Objective 1',
            stakes: 'Stakes 1',
            entryCondition: 'Entry 1',
            beats: [
              { id: '1.1', name: 'Beat Name 1.1', description: 'Beat 1.1', objective: 'Goal 1.1', role: 'setup' },
              { id: '1.2', name: 'Beat Name 1.2', description: 'Beat 1.2', objective: 'Goal 1.2', role: 'turning_point' },
            ],
          },
          {
            id: '2',
            name: 'Act Two',
            objective: 'Objective 2',
            stakes: 'Stakes 2',
            entryCondition: 'Entry 2',
            beats: [
              { id: '2.1', name: 'Beat Name 2.1', description: 'Beat 2.1', objective: 'Goal 2.1', role: 'escalation' },
              { id: '2.2', name: 'Beat Name 2.2', description: 'Beat 2.2', objective: 'Goal 2.2', role: 'turning_point' },
            ],
          },
        ],
      });

      expect(() => mergePreservedWithRegenerated([], regenerated, 'Original theme')).toThrow(
        'Merged structure is missing beats for act 3',
      );
    });
  });
});
