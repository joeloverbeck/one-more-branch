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

  it('includes suggested protagonist speech guidance when provided', () => {
    const messages = buildContinuationPrompt(
      makeContext({ suggestedProtagonistSpeech: '  We can still leave through the north gate.  ' }),
    );
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).toContain('=== SUGGESTED PROTAGONIST SPEECH (OPTIONAL GUIDANCE) ===');
    expect(userMessage?.content).toContain(
      'The protagonist has considered saying:\n"We can still leave through the north gate."',
    );
    expect(userMessage?.content).toContain('Treat this as optional intent, not mandatory dialogue.');
    expect(userMessage?.content).toContain(
      'Use it only when the current circumstances make it natural.',
    );
    expect(userMessage?.content).toContain(
      'Adapt wording, tone, and timing naturally to fit the scene.',
    );
    expect(userMessage?.content).toContain('If circumstances do not support it, omit it.');
  });

  it('omits suggested protagonist speech guidance when field is absent', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).not.toContain('SUGGESTED PROTAGONIST SPEECH');
    expect(userMessage?.content).not.toContain('The protagonist has considered saying:');
  });

  it('omits suggested protagonist speech guidance when field is blank after trim', () => {
    const messages = buildContinuationPrompt(makeContext({ suggestedProtagonistSpeech: '   ' }));
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).not.toContain('SUGGESTED PROTAGONIST SPEECH');
    expect(userMessage?.content).not.toContain('The protagonist has considered saying:');
  });

  it('includes data rules in user message', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');
    expect(userMessage?.content).toContain('=== DATA & STATE RULES ===');
    expect(userMessage?.content).toContain('ACTIVE STATE TRACKING');
    expect(userMessage?.content).toContain('CONTINUITY RULES (CONTINUATION):');
  });

  it('keeps requirements focused on scene writing and continuity', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).toContain('Write a sceneSummary');
    expect(userMessage?.content).not.toContain('Do NOT output state/canon mutation fields');
    expect(userMessage?.content).not.toContain('newCanonFacts/newCharacterCanonFacts');
  });

  it('includes planner guidance fields when pagePlan is provided', () => {
    const messages = buildContinuationPrompt(
      makeContext({
        pagePlan: {
          sceneIntent: 'Escalate checkpoint pressure after the alley escape',
          continuityAnchors: ['City curfew sirens are still sounding'],
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
            openingLineDirective: 'Start with boots splashing through alley runoff',
            mustIncludeBeats: ['A searchlight sweeps the alley mouth'],
            forbiddenRecaps: ['No replay of the prior rooftop chase'],
          },
        },
      }),
    );
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).toContain('=== PLANNER GUIDANCE ===');
    expect(userMessage?.content).toContain(
      'Scene Intent: Escalate checkpoint pressure after the alley escape',
    );
    expect(userMessage?.content).toContain(
      'Opening line directive: Start with boots splashing through alley runoff',
    );
    expect(userMessage?.content).toContain('A searchlight sweeps the alley mouth');
    expect(userMessage?.content).toContain('No replay of the prior rooftop chase');
  });

  it('does NOT include data rules in system message', () => {
    const messages = buildContinuationPrompt(makeContext());
    const systemMessage = messages.find(m => m.role === 'system');
    expect(systemMessage?.content).not.toContain('ACTIVE STATE TRACKING');
    expect(systemMessage?.content).not.toContain('CONTINUITY RULES');
    expect(systemMessage?.content).not.toContain('INVENTORY MANAGEMENT:');
  });
});
