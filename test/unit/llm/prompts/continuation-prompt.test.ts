import type { AccumulatedStructureState, StoryStructure } from '../../../../src/models/story-arc';
import type { ContinuationContext } from '../../../../src/llm/types';
import type { ActiveState } from '../../../../src/models/state/active-state';
import { buildContinuationPrompt } from '../../../../src/llm/prompts/continuation-prompt';
import { ChoiceType, PrimaryDelta } from '../../../../src/models/choice-enums';

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

  it('does NOT inject PACING DIRECTIVE even when pacingNudge is set (pacing moved to planner)', () => {
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
    expect(userMessage?.content).not.toContain('PACING DIRECTIVE');
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
          dramaticQuestion: 'Will you evade the checkpoint or confront the patrol?',
          choiceIntents: [
            { hook: 'Slip through the shadows', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.LOCATION_CHANGE },
            { hook: 'Confront the patrol head-on', choiceType: ChoiceType.CONFRONTATION, primaryDelta: PrimaryDelta.THREAT_SHIFT },
          ],
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

  it('uses bible continuity rules when storyBible is present', () => {
    const messages = buildContinuationPrompt(
      makeContext({
        storyBible: {
          sceneWorldContext: 'A rain-soaked city at midnight.',
          relevantCharacters: [
            {
              name: 'Vex',
              role: 'antagonist',
              relevantProfile: 'Cybernetic enforcer',
              speechPatterns: 'Clipped, military jargon',
              protagonistRelationship: 'Pursuer',
              currentState: 'Wounded from rooftop fight',
            },
          ],
          relevantCanonFacts: ['The broadcast tower is the only relay in the city.'],
          relevantHistory: 'The protagonist escaped the safehouse two scenes ago.',
        },
      }),
    );
    const userMessage = messages.find(m => m.role === 'user');

    // Bible continuity rules should reference Story Bible headers
    expect(userMessage?.content).toContain('RELEVANT CANON FACTS');
    expect(userMessage?.content).toContain('SCENE CHARACTERS');
    expect(userMessage?.content).toContain('CHARACTER PROFILES vs CURRENT STATE');

    // Should NOT contain the old non-bible headers in data rules
    expect(userMessage?.content).not.toContain('CHARACTER CANON vs CHARACTER STATE:');
  });

  it('uses standard continuity rules when storyBible is absent', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');

    // Standard rules should reference old headers
    expect(userMessage?.content).toContain('ESTABLISHED WORLD FACTS');
    expect(userMessage?.content).toContain('CHARACTER CANON vs CHARACTER STATE:');

    // Should NOT contain bible-specific headers in data rules
    expect(userMessage?.content).not.toContain('CHARACTER PROFILES vs CURRENT STATE');
  });

  it('does NOT include data rules in system message', () => {
    const messages = buildContinuationPrompt(makeContext());
    const systemMessage = messages.find(m => m.role === 'system');
    expect(systemMessage?.content).not.toContain('ACTIVE STATE TRACKING');
    expect(systemMessage?.content).not.toContain('CONTINUITY RULES');
    expect(systemMessage?.content).not.toContain('INVENTORY MANAGEMENT:');
  });

  it('includes choice intent section when choiceIntents are provided', () => {
    const messages = buildContinuationPrompt(
      makeContext({
        pagePlan: {
          sceneIntent: 'Test scene intent',
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
            openingLineDirective: 'Start with action',
            mustIncludeBeats: [],
            forbiddenRecaps: [],
          },
          dramaticQuestion: 'Will you flee or fight the patrol?',
          choiceIntents: [
            { hook: 'Slip through the shadows', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.LOCATION_CHANGE },
            { hook: 'Confront the patrol head-on', choiceType: ChoiceType.CONFRONTATION, primaryDelta: PrimaryDelta.THREAT_SHIFT },
          ],
        },
      }),
    );
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).toContain('=== CHOICE INTENT GUIDANCE (from planner) ===');
    expect(userMessage?.content).toContain('Dramatic Question: Will you flee or fight the patrol?');
    expect(userMessage?.content).toContain('[TACTICAL_APPROACH / LOCATION_CHANGE] Slip through the shadows');
    expect(userMessage?.content).toContain('[CONFRONTATION / THREAT_SHIFT] Confront the patrol head-on');
  });

  it('omits choice intent section when pagePlan has no choiceIntents', () => {
    const messages = buildContinuationPrompt(makeContext());
    const userMessage = messages.find(m => m.role === 'user');

    expect(userMessage?.content).not.toContain('CHOICE INTENT GUIDANCE');
    expect(userMessage?.content).not.toContain('Dramatic Question:');
  });
});
