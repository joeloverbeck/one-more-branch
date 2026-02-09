import type { AccumulatedStructureState, StoryStructure } from '../../../../src/models/story-arc';
import type { ContinuationContext } from '../../../../src/llm/types';
import type { ActiveState } from '../../../../src/models/state/active-state';
import { buildContinuationPrompt } from '../../../../src/llm/prompts/continuation-prompt';

describe('buildContinuationPrompt pacing nudge injection', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    premise: 'A fugitive must broadcast evidence of a government purge before dawn erases all proof.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Crackdown',
        objective: 'Escape the first sweep',
        stakes: 'Capture means execution.',
        entryCondition: 'Emergency law declared.',
        beats: [
          { id: '1.1', description: 'Reach safehouse', objective: 'Get inside', role: 'setup' },
          { id: '1.2', description: 'Secure evidence', objective: 'Protect evidence', role: 'escalation' },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory',
        stakes: 'If lost, purge is permanent.',
        entryCondition: 'Leave the capital.',
        beats: [
          { id: '2.1', description: 'Break through checkpoints', objective: 'Find route north', role: 'escalation' },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'Access relay tower.',
        beats: [
          { id: '3.1', description: 'Deliver proof', objective: 'Transmit evidence', role: 'resolution' },
        ],
      },
    ],
  };

  const emptyActiveState: ActiveState = {
    currentLocation: '',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  function makeContext(overrides: Partial<ContinuationContext> = {}): ContinuationContext {
    return {
      characterConcept: 'A rogue agent',
      worldbuilding: '',
      tone: 'Dark thriller',
      globalCanon: [],
      globalCharacterCanon: {},
      previousNarrative: 'The door slammed shut.',
      selectedChoice: 'Run into the alley',
      accumulatedInventory: [],
      accumulatedHealth: [],
      accumulatedCharacterState: {},
      activeState: emptyActiveState,
      grandparentNarrative: null,
      ancestorSummaries: [],
      ...overrides,
    };
  }

  it('injects PACING DIRECTIVE when pacingNudge is non-null', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 5,
      pacingNudge: 'Beat 1.1 has stalled for 5 pages without advancing the objective.',
    };

    const messages = buildContinuationPrompt(
      makeContext({ structure: testStructure, accumulatedStructureState: state }),
    );
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage?.content).toContain('=== PACING DIRECTIVE ===');
    expect(userMessage?.content).toContain(
      'Beat 1.1 has stalled for 5 pages without advancing the objective.',
    );
    expect(userMessage?.content).toContain(
      'push the story forward with action, revelation, or irreversible change',
    );
  });

  it('does NOT inject PACING DIRECTIVE when pacingNudge is null', () => {
    const state: AccumulatedStructureState = {
      currentActIndex: 0,
      currentBeatIndex: 0,
      beatProgressions: [{ beatId: '1.1', status: 'active' }],
      pagesInCurrentBeat: 0,
      pacingNudge: null,
    };

    const messages = buildContinuationPrompt(
      makeContext({ structure: testStructure, accumulatedStructureState: state }),
    );
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage?.content).not.toContain('PACING DIRECTIVE');
  });

  it('does NOT inject PACING DIRECTIVE when structure state is undefined', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage?.content).not.toContain('PACING DIRECTIVE');
  });

  it('includes data rules in user message', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage?.content).toContain('=== DATA & STATE RULES ===');
    expect(userMessage?.content).toContain('ACTIVE STATE TRACKING');
    expect(userMessage?.content).toContain('CONTINUITY RULES (CONTINUATION):');
  });

  it('does NOT include data rules in system message', () => {
    const messages = buildContinuationPrompt(makeContext());
    const systemMessage = messages.find(m => m.role === 'system');
    expect(systemMessage?.content).not.toContain('ACTIVE STATE TRACKING');
    expect(systemMessage?.content).not.toContain('CONTINUITY RULES');
    expect(systemMessage?.content).not.toContain('INVENTORY MANAGEMENT:');
  });
});
