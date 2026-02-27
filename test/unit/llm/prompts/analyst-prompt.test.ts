import type { AnalystContext } from '../../../../src/llm/analyst-types';
import type { StoryStructure, AccumulatedStructureState } from '../../../../src/models/story-arc';
import type { ActiveState } from '../../../../src/models/state/active-state';
import type { AccumulatedNpcAgendas } from '../../../../src/models/state/npc-agenda';
import { buildAnalystPrompt } from '../../../../src/llm/prompts/analyst-prompt';

describe('buildAnalystPrompt', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    premise:
      'A fugitive must broadcast evidence of a government purge before dawn erases all proof.',
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
          {
            id: '1.1',
            description: 'Reach safehouse',
            objective: 'Get inside',
            role: 'setup',
            isMidpoint: false,
            midpointType: null,
          },
          {
            id: '1.2',
            description: 'Secure evidence',
            objective: 'Protect evidence',
            role: 'escalation',
            crisisType: 'BEST_BAD_CHOICE',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
            obligatorySceneTag: 'hero_at_mercy_of_antagonist',
          },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory',
        stakes: 'If lost, purge is permanent.',
        entryCondition: 'Leave the capital.',
        beats: [
          {
            id: '2.1',
            description: 'Break through checkpoints',
            objective: 'Find route north',
            role: 'escalation',
            isMidpoint: false,
            midpointType: null,
          },
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
    threadsResolved: [],
    threadAges: {},
    thematicQuestion: 'Can freedom survive under constant surveillance?',
    antithesis: '',
    premisePromises: [],
    fulfilledPremisePromises: [],
    tone: '',
    activeTrackedPromises: [],
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

  it('includes crisis type checks when active beat has crisisType', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      accumulatedStructureState: {
        ...testState,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
        ],
      },
    });

    expect(messages[1].content).toContain('The expected crisis type is BEST_BAD_CHOICE');
  });

  it('includes midpoint quality checks when active beat is midpoint', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      accumulatedStructureState: {
        ...testState,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
        ],
      },
    });

    expect(messages[1].content).toContain('=== MIDPOINT QUALITY CHECK ===');
    expect(messages[1].content).toContain('Expected midpoint type: FALSE_VICTORY');
  });

  it('user message contains "NARRATIVE TO EVALUATE:" followed by the narrative text', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[1].content).toContain('NARRATIVE TO EVALUATE:');
    expect(messages[1].content).toContain(
      'The protagonist crept through the alley, dodging patrols.'
    );
  });

  it('includes thematic kernel section when thematic context is provided', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      thematicQuestion: 'Can security justify total control?',
      antithesis: 'Security matters more than freedom in times of crisis.',
    });
    expect(messages[1].content).toContain('THEMATIC KERNEL:');
    expect(messages[1].content).toContain('Thematic question: Can security justify total control?');
    expect(messages[1].content).toContain(
      'Antithesis: Security matters more than freedom in times of crisis.'
    );
  });

  it('omits thematic kernel section when thematic question and antithesis are both empty', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      thematicQuestion: '',
      antithesis: '',
    });
    expect(messages[1].content).not.toContain('THEMATIC KERNEL:');
  });

  it('system message includes thematic charge classification rules', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('THEMATIC CHARGE CLASSIFICATION:');
    expect(messages[0].content).toContain('THESIS_SUPPORTING');
    expect(messages[0].content).toContain('ANTITHESIS_SUPPORTING');
    expect(messages[0].content).toContain('AMBIGUOUS');
  });

  it('system message includes narrative focus classification rules', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('NARRATIVE FOCUS CLASSIFICATION:');
    expect(messages[0].content).toContain('DEEPENING');
    expect(messages[0].content).toContain('BROADENING');
    expect(messages[0].content).toContain('BALANCED');
  });

  it('system message includes premise promise fulfillment rules', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('PREMISE PROMISE FULFILLMENT:');
    expect(messages[0].content).toContain('premisePromiseFulfilled');
    expect(messages[0].content).toContain('PENDING PREMISE PROMISES');
  });

  it('system message includes obligatory scene fulfillment rules', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('OBLIGATORY SCENE FULFILLMENT:');
    expect(messages[0].content).toContain('obligatorySceneFulfilled');
  });

  it('includes active beat obligation section when active beat has obligatorySceneTag', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      accumulatedStructureState: {
        ...testState,
        currentBeatIndex: 1,
        beatProgressions: [
          { beatId: '1.1', status: 'concluded', resolution: 'Reached safehouse' },
          { beatId: '1.2', status: 'active' },
        ],
      },
    });

    expect(messages[1].content).toContain('ACTIVE BEAT OBLIGATION:');
    expect(messages[1].content).toContain('ACTIVE BEAT OBLIGATION TAG: hero_at_mercy_of_antagonist');
    expect(messages[1].content).toContain('Set obligatorySceneFulfilled');
  });

  it('includes premise promise tracking section when premise promises exist', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      premisePromises: ['The hero will infiltrate the sky-forge tribunal.'],
      fulfilledPremisePromises: [],
    });
    expect(messages[1].content).toContain('PREMISE PROMISE TRACKING:');
    expect(messages[1].content).toContain('PENDING PREMISE PROMISES:');
    expect(messages[1].content).toContain('The hero will infiltrate the sky-forge tribunal.');
  });

  it('includes trigger-eligible delayed consequences context and triggering rules', () => {
    const messages = buildAnalystPrompt({
      ...testContext,
      delayedConsequencesEligible: [
        {
          id: 'dc-2',
          description: 'Checkpoint captain circulates your face.',
          triggerCondition: 'The scene includes a checkpoint scan.',
          minPagesDelay: 1,
          maxPagesDelay: 3,
          currentAge: 2,
          triggered: false,
          sourcePageId: 1,
        },
      ],
    });

    expect(messages[0].content).toContain('DELAYED CONSEQUENCE TRIGGERING:');
    expect(messages[0].content).toContain('delayedConsequencesTriggered');
    expect(messages[1].content).toContain('TRIGGER-ELIGIBLE DELAYED CONSEQUENCES:');
    expect(messages[1].content).toContain('[dc-2]');
    expect(messages[1].content).toContain('The scene includes a checkpoint scan.');
  });

  it('omits fulfilled premise promises from pending list', () => {
    const fulfilledPromise = 'The hero will infiltrate the sky-forge tribunal.';
    const messages = buildAnalystPrompt({
      ...testContext,
      premisePromises: [fulfilledPromise, 'The relic chamber floods at dawn.'],
      fulfilledPremisePromises: [fulfilledPromise],
    });
    const userContent = messages[1].content;
    const pendingSection = userContent.split('ALREADY FULFILLED PREMISE PROMISES:')[0] ?? '';
    expect(pendingSection).toContain('The relic chamber floods at dawn.');
    expect(pendingSection).not.toContain(fulfilledPromise);
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
    expect(messages[0].content).toContain(
      'Step A: Classify scene signals using the provided enums.'
    );
    expect(messages[0].content).toContain(
      'Step B: Apply the completion gate against the active beat objective before deciding beatConcluded.'
    );
  });

  it('system message requires extracting objective anchors (1-3)', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'extract 1-3 objective anchors from activeBeat.objective'
    );
  });

  it('system message requires mapping anchors to concrete evidence', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain('map each anchor to concrete evidence');
  });

  it('system message requires cumulative narrative and state evidence', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'Evidence is cumulative across the current narrative and active state.'
    );
  });

  it('system message defaults to non-conclusion when explicit anchor evidence is absent', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).toContain(
      'If no anchor has explicit evidence, beatConcluded must be false.'
    );
  });

  it('includes tone directive in system prompt when tone is provided', () => {
    const contextWithTone: AnalystContext = {
      ...testContext,
      tone: 'noir thriller',
      toneFeel: ['brooding', 'cynical'],
      toneAvoid: ['cheerful', 'slapstick'],
    };
    const messages = buildAnalystPrompt(contextWithTone);
    const systemContent = messages[0].content;
    expect(systemContent).toContain('TONE DIRECTIVE:');
    expect(systemContent).toContain('Genre/tone: noir thriller');
    expect(systemContent).toContain('Atmospheric feel (evoke these qualities): brooding, cynical');
    expect(systemContent).toContain('Anti-patterns (never drift toward): cheerful, slapstick');
  });

  it('omits tone directive from system prompt when tone is absent', () => {
    const messages = buildAnalystPrompt(testContext);
    expect(messages[0].content).not.toContain('TONE DIRECTIVE:');
  });

  it('includes active tracked promises section with IDs and metadata', () => {
    const contextWithPromises: AnalystContext = {
      ...testContext,
      activeTrackedPromises: [
        {
          id: 'pr-2',
          description: 'A hidden satchel under the bridge arch',
          promiseType: 'CHEKHOV_GUN',
          scope: 'BEAT',
          resolutionHint: 'Will the satchel be opened?',
          suggestedUrgency: 'HIGH',
          age: 3,
        },
        {
          id: 'pr-3',
          description: 'The ally flinches at every bell toll',
          promiseType: 'UNRESOLVED_TENSION',
          scope: 'ACT',
          resolutionHint: 'Will the ally explain the flinching?',
          suggestedUrgency: 'MEDIUM',
          age: 1,
        },
      ],
    };

    const messages = buildAnalystPrompt(contextWithPromises);
    const userContent = messages[1].content;

    expect(userContent).toContain('ACTIVE TRACKED PROMISES:');
    expect(userContent).toContain(
      '[pr-2] (CHEKHOV_GUN/BEAT/HIGH, 3 pages old) A hidden satchel under the bridge arch'
    );
    expect(userContent).toContain(
      '[pr-3] (UNRESOLVED_TENSION/ACT/MEDIUM, 1 pages old) The ally flinches at every bell toll'
    );
    expect(userContent).toContain('Use these IDs for promisesResolved when the resolution criterion question has been ANSWERED in this scene.');
  });

  it('omits active tracked promises section when there are no active promises', () => {
    const messages = buildAnalystPrompt(testContext);
    const userContent = messages[1].content;
    expect(userContent).not.toContain('ACTIVE TRACKED PROMISES:');
  });

  it('system message includes tracked promise policy instructions', () => {
    const messages = buildAnalystPrompt(testContext);
    const systemContent = messages[0].content;

    expect(systemContent).toContain('Detect at most 2 new promises in promisesDetected.');
    expect(systemContent).toContain(
      'RESOLUTION: Only include a promise in promisesResolved when the resolutionHint question has been ANSWERED, not merely referenced.'
    );
    expect(systemContent).toContain(
      'Use exact pr-N IDs from ACTIVE TRACKED PROMISES when populating promisesResolved.'
    );
    expect(systemContent).toContain(
      'Only provide promisePayoffAssessments entries for promises that appear in promisesResolved.'
    );
  });

  describe('NPC agendas section', () => {
    const npcAgendas: AccumulatedNpcAgendas = {
      Kael: {
        npcName: 'Kael',
        currentGoal: 'Secure the artifact',
        leverage: 'Military connections',
        fear: 'Being exposed as a traitor',
        offScreenBehavior: 'Recruiting operatives',
      },
      Mira: {
        npcName: 'Mira',
        currentGoal: 'Escape the city',
        leverage: 'Knowledge of tunnels',
        fear: 'Capture by enforcers',
        offScreenBehavior: 'Mapping routes',
      },
    };

    it('includes NPC agendas section when accumulatedNpcAgendas is provided', () => {
      const contextWithAgendas: AnalystContext = {
        ...testContext,
        accumulatedNpcAgendas: npcAgendas,
      };
      const messages = buildAnalystPrompt(contextWithAgendas);
      const userContent = messages[1].content;

      expect(userContent).toContain('NPC AGENDAS (evaluate behavior consistency):');
      expect(userContent).toContain('[Kael]');
      expect(userContent).toContain('[Mira]');
    });

    it('omits NPC agendas section when accumulatedNpcAgendas is undefined', () => {
      const messages = buildAnalystPrompt(testContext);
      const userContent = messages[1].content;

      expect(userContent).not.toContain('NPC AGENDAS');
    });

    it('omits NPC agendas section when accumulatedNpcAgendas is empty', () => {
      const contextWithEmpty: AnalystContext = {
        ...testContext,
        accumulatedNpcAgendas: {},
      };
      const messages = buildAnalystPrompt(contextWithEmpty);
      const userContent = messages[1].content;

      expect(userContent).not.toContain('NPC AGENDAS');
    });

    it('only includes npcName, currentGoal, and fear (not leverage or offScreenBehavior)', () => {
      const contextWithAgendas: AnalystContext = {
        ...testContext,
        accumulatedNpcAgendas: npcAgendas,
      };
      const messages = buildAnalystPrompt(contextWithAgendas);
      const userContent = messages[1].content;

      expect(userContent).toContain('Goal: Secure the artifact');
      expect(userContent).toContain('Fear: Being exposed as a traitor');
      expect(userContent).not.toContain('Leverage: Military connections');
      expect(userContent).not.toContain('Off-screen: Recruiting operatives');
    });

    it('system message includes NPC agenda coherence rules', () => {
      const messages = buildAnalystPrompt(testContext);
      const systemContent = messages[0].content;

      expect(systemContent).toContain('NPC AGENDA COHERENCE:');
      expect(systemContent).toContain('npcCoherenceAdherent');
      expect(systemContent).toContain('npcCoherenceIssues');
    });
  });
});
