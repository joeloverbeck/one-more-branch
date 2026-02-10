import type { AnalystContext } from '../../../../src/llm/types';
import type { StoryStructure, AccumulatedStructureState } from '../../../../src/models/story-arc';
import type { ActiveState } from '../../../../src/models/state/active-state';
import { buildAnalystPrompt } from '../../../../src/llm/prompts/analyst-prompt';

describe('buildAnalystPrompt', () => {
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
    ],
  };

  const testState: AccumulatedStructureState = {
    currentActIndex: 0,
    currentBeatIndex: 0,
    beatProgressions: [{ beatId: '1.1', status: 'active' }],
    pagesInCurrentBeat: 0,
    pacingNudge: null,
  };

  const testActiveState: ActiveState = {
    currentLocation: 'Downtown alley',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
  };

  const testContext: AnalystContext = {
    narrative: 'The protagonist crept through the alley, dodging patrols.',
    structure: testStructure,
    accumulatedStructureState: testState,
    activeState: testActiveState,
  };

  it('returns array with 2 messages (system + user)', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages).toHaveLength(2);
  });

  it('system message has role "system" with analyst instructions', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].role).toBe('system');
    expect(messages[0].content).toBeTruthy();
  });

  it('user message has role "user"', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[1].role).toBe('user');
  });

  it('user message contains structure evaluation section', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[1].content).toContain('=== STORY STRUCTURE ===');
    expect(messages[1].content).toContain('=== BEAT EVALUATION ===');
  });

  it('user message contains "NARRATIVE TO EVALUATE:" followed by the narrative text', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[1].content).toContain('NARRATIVE TO EVALUATE:');
    expect(messages[1].content).toContain('The protagonist crept through the alley, dodging patrols.');
  });

  it('system message mentions "story structure analyst"', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('story structure analyst');
  });

  it('system message mentions "conservative about deviation"', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('conservative about deviation');
  });

  it('system message enforces Step A then Step B sequence', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('Step A: Classify scene signals using the provided enums.');
    expect(messages[0].content).toContain(
      'Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.',
    );
  });

  it('system message requires extracting objective anchors (1-3)', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'extract 1-3 objective anchors from activeBeat.objective',
    );
  });

  it('system message requires mapping anchors to concrete evidence', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('map each anchor to concrete evidence');
  });

  it('system message requires cumulative narrative and state evidence', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'Evidence is cumulative across the current narrative and active state.',
    );
  });

  it('system message defaults to non-conclusion when explicit anchor evidence is absent', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'If no anchor has explicit evidence, beatConcluded must be false.',
    );
  });
});
