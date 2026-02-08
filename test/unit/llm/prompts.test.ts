import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import { buildContinuationPrompt, buildOpeningPrompt } from '../../../src/llm/prompts';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  // Get the last user message (after any few-shot examples)
  const userMessages = messages.filter(message => message.role === 'user');
  return userMessages[userMessages.length - 1]?.content ?? '';
}

describe('buildOpeningPrompt', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Survive the uprising and expose its true architect',
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Spark',
        objective: 'Escape the city after the first riot',
        stakes: 'Capture means execution as a traitor',
        entryCondition: 'The first district falls',
        beats: [
          {
            id: '1.1',
            description: 'The protagonist is caught between guards and rebels',
            objective: 'Reach a safe route out of the square',
          },
          {
            id: '1.2',
            description: 'A former ally offers help with conditions',
            objective: 'Choose whether to trust the ally',
          },
        ],
      },
      {
        id: '2',
        name: 'The Pursuit',
        objective: 'Outmaneuver both factions',
        stakes: 'Losing evidence lets the conflict spiral',
        entryCondition: 'The protagonist leaves the capital',
        beats: [
          { id: '2.1', description: 'First chase beat', objective: 'Evade pursuit' },
          { id: '2.2', description: 'Second chase beat', objective: 'Protect the evidence' },
        ],
      },
      {
        id: '3',
        name: 'The Reckoning',
        objective: 'Expose the architect publicly',
        stakes: 'Failure secures permanent authoritarian rule',
        entryCondition: 'Allies gather for final confrontation',
        beats: [
          { id: '3.1', description: 'Final entry beat', objective: 'Force a confession' },
          { id: '3.2', description: 'Final resolution beat', objective: 'Stabilize the city' },
        ],
      },
    ],
  };

  it('should include character concept in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'An exiled knight seeking redemption',
      worldbuilding: '',
      tone: 'grim fantasy',
    });

    expect(getUserMessage(messages)).toContain('An exiled knight seeking redemption');
  });

  it('should include content policy in system message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'horror',
    });

    expect(getSystemMessage(messages)).toContain('NC-21');
    expect(getSystemMessage(messages)).toContain(CONTENT_POLICY);
  });

  it('should include worldbuilding if provided', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: 'The city floats above a poisoned sea.',
      tone: 'dark fantasy',
    });

    expect(getUserMessage(messages)).toContain('WORLDBUILDING:');
    expect(getUserMessage(messages)).toContain('poisoned sea');
  });

  it('should NOT include OUTPUT FORMAT instructions', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const system = getSystemMessage(messages);
    expect(system).not.toContain('OUTPUT FORMAT:');
    expect(system).not.toContain('NARRATIVE:');
    expect(system).not.toContain('CHOICES:');
  });

  it('should not request story arc determination', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    expect(getUserMessage(messages).toLowerCase()).not.toContain('story arc');
    expect(getUserMessage(messages).toLowerCase()).not.toContain('determine the overarching goal');
  });

  it('should include structure section when structure is provided', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
      structure: testStructure,
    });

    const user = getUserMessage(messages);
    expect(user).toContain('=== STORY STRUCTURE ===');
    expect(user).toContain('Overall Theme: Survive the uprising and expose its true architect');
    expect(user).toContain('CURRENT ACT: The Spark');
    expect(user).toContain('Objective: Escape the city after the first riot');
    expect(user).toContain('Stakes: Capture means execution as a traitor');
    expect(user).toContain('CURRENT BEAT: The protagonist is caught between guards and rebels');
    expect(user).toContain('Beat Objective: Reach a safe route out of the square');
    expect(user).toContain("Your task: Write the opening scene working toward this beat's objective.");
  });

  it('should omit structure section when structure is not provided', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const user = getUserMessage(messages);
    expect(user).not.toContain('=== STORY STRUCTURE ===');
    expect(user).not.toContain('CURRENT ACT:');
    expect(user).not.toContain('CURRENT BEAT:');
  });

  it('should include tone in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'neo-noir thriller',
    });

    expect(getUserMessage(messages)).toContain('TONE/GENRE: neo-noir thriller');
  });

  it('should return exactly 2 messages (system, user) with no options', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('should return exactly 2 messages with fewShotMode: none', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { fewShotMode: 'none' },
    );

    expect(messages).toHaveLength(2);
  });

  it('should return 4 messages with fewShotMode: minimal (system + example pair + user)', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { fewShotMode: 'minimal' },
    );

    expect(messages).toHaveLength(4);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // example user
    expect(messages[2]?.role).toBe('assistant'); // example assistant
    expect(messages[3]?.role).toBe('user'); // actual prompt
  });

  it('should include strict choice guidelines when choiceGuidance: strict', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'strict' },
    );

    const system = getSystemMessage(messages);
    expect(system).toContain('CHOICE REQUIREMENTS (CRITICAL)');
    expect(system).toContain('IN-CHARACTER');
    expect(system).toContain('DIVERGENT');
    expect(system).toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('should include DIVERGENCE ENFORCEMENT in strict choice guidelines', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'strict' },
    );

    const system = getSystemMessage(messages);
    expect(system).toContain('DIVERGENCE ENFORCEMENT');
    expect(system).toContain('Location');
    expect(system).toContain('NPC relationship');
    expect(system).toContain('Time pressure');
  });

  it('should include CONTINUITY RULES in system message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const system = getSystemMessage(messages);
    expect(system).toContain('CONTINUITY RULES');
    expect(system).toContain('Do NOT contradict');
    expect(system).toContain('Do NOT retcon');
    expect(system).toContain('newCanonFacts');
  });

  it('should include enhanced storytelling guidelines', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const system = getSystemMessage(messages);
    expect(system).toContain('Show character through action');
    expect(system).toContain('avoid sprawling recaps');
  });

  it('should NOT include strict choice guidelines when choiceGuidance: basic', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'basic' },
    );

    const system = getSystemMessage(messages);
    expect(system).not.toContain('CHOICE REQUIREMENTS (CRITICAL)');
  });

  it('should include CoT instructions when enableChainOfThought: true', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { enableChainOfThought: true },
    );

    const system = getSystemMessage(messages);
    expect(system).toContain('REASONING PROCESS');
    expect(system).toContain('<thinking>');
    expect(system).toContain('<output>');
  });

  it('should NOT include CoT instructions when enableChainOfThought: false', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { enableChainOfThought: false },
    );

    const system = getSystemMessage(messages);
    expect(system).not.toContain('REASONING PROCESS');
    expect(system).not.toContain('<thinking>');
  });

  it('should include numbered REQUIREMENTS in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const user = getUserMessage(messages);
    expect(user).toContain('REQUIREMENTS (follow ALL)');
    expect(user).toContain('1.');
    expect(user).toContain('2.');
    expect(user).toContain('3.');
    expect(user).toContain('4.');
    expect(user).toContain('5.');
  });
});

describe('buildContinuationPrompt', () => {
  const structure: StoryStructure = {
    overallTheme: 'Stop the city purge before dawn.',
    generatedAt: new Date('2026-01-01T00:00:00.000Z'),
    acts: [
      {
        id: '1',
        name: 'The Crackdown',
        objective: 'Escape the first sweep',
        stakes: 'Capture means public execution.',
        entryCondition: 'Emergency law is declared.',
        beats: [
          {
            id: '1.1',
            description: 'Reach a safehouse before patrols seal the district',
            objective: 'Get inside the safehouse',
          },
          {
            id: '1.2',
            description: 'Secure evidence from an informant',
            objective: 'Protect the evidence from raiders',
          },
          {
            id: '1.3',
            description: 'Choose who to trust for extraction',
            objective: 'Commit to an ally',
          },
        ],
      },
      {
        id: '2',
        name: 'The Hunt',
        objective: 'Cross hostile territory with the evidence',
        stakes: 'If lost, the purge becomes permanent.',
        entryCondition: 'You leave the capital perimeter.',
        beats: [
          { id: '2.1', description: 'Break through checkpoints', objective: 'Find a route north' },
          { id: '2.2', description: 'Defend witnesses', objective: 'Keep witnesses alive' },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners to the public',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'You gain access to the relay tower.',
        beats: [
          { id: '3.1', description: 'Reach the relay core', objective: 'Seize control room access' },
          { id: '3.2', description: 'Deliver the proof', objective: 'Transmit unedited evidence' },
        ],
      },
    ],
  };
  const structureState: AccumulatedStructureState = {
    currentActIndex: 0,
    currentBeatIndex: 1,
    beatProgressions: [
      {
        beatId: '1.1',
        status: 'concluded',
        resolution: 'You slipped through a drainage tunnel into the safehouse.',
      },
      { beatId: '1.2', status: 'active' },
      { beatId: '1.3', status: 'pending' },
      { beatId: '2.1', status: 'pending' },
      { beatId: '2.2', status: 'pending' },
      { beatId: '3.1', status: 'pending' },
      { beatId: '3.2', status: 'pending' },
    ],
  };
  const baseContext = {
    characterConcept: 'A disgraced detective',
    worldbuilding: '',
    tone: 'noir',
    globalCanon: [] as const,
    globalCharacterCanon: {} as const,
    previousNarrative: 'Rain batters the windows while the neon sign flickers overhead.',
    selectedChoice: 'Confront the informant at gunpoint',
    accumulatedState: [] as const,
    accumulatedInventory: [] as const,
    accumulatedHealth: [] as const,
    accumulatedCharacterState: {} as const,
    // New active state fields
    activeState: {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    grandparentNarrative: null as string | null,
  };

  it('should include selected choice in user message', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).toContain('Confront the informant at gunpoint');
  });

  it('should NOT include old CURRENT STATE section format', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      accumulatedState: ['Broken rib from warehouse fight', 'Lost your badge'],
    });

    const user = getUserMessage(messages);
    // Old format should NOT appear - we now use active state sections
    expect(user).not.toMatch(/CURRENT STATE:\n- Broken rib/);
    expect(user).not.toContain('Broken rib from warehouse fight');
    expect(user).not.toContain('Lost your badge');
  });

  it('should include global canon when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      globalCanon: ['Mayor Calder controls the city police through blackmail'],
    });

    const user = getUserMessage(messages);
    expect(user).toContain('ESTABLISHED WORLD FACTS:');
    expect(user).toContain('Mayor Calder');
  });

  it('should include character canon when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      globalCharacterCanon: {
        'dr cohen': ['Dr. Cohen is a psychiatrist', 'He wears wire-rimmed glasses'],
        'bobby western': ['Bobby is in a coma in Italy'],
      },
    });

    const user = getUserMessage(messages);
    expect(user).toContain('CHARACTER INFORMATION (permanent traits):');
    expect(user).toContain('[dr cohen]');
    expect(user).toContain('Dr. Cohen is a psychiatrist');
    expect(user).toContain('He wears wire-rimmed glasses');
    expect(user).toContain('[bobby western]');
    expect(user).toContain('Bobby is in a coma in Italy');
  });

  it('should include NPC current state when present', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      accumulatedCharacterState: {
        greaves: ['Gave protagonist a sketched map', 'Proposed a 70-30 split'],
        elena: ['Agreed to meet at the docks'],
      },
    });

    const user = getUserMessage(messages);
    expect(user).toContain('NPC CURRENT STATE (branch-specific events):');
    expect(user).toContain('[greaves]');
    expect(user).toContain('- Gave protagonist a sketched map');
    expect(user).toContain('- Proposed a 70-30 split');
    expect(user).toContain('[elena]');
    expect(user).toContain('- Agreed to meet at the docks');
  });

  it('should not include NPC current state section when empty', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      accumulatedCharacterState: {},
    });

    const user = getUserMessage(messages);
    expect(user).not.toContain('NPC CURRENT STATE');
  });

  it('should not include deprecated story arc section in continuation prompt', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).not.toContain('STORY ARC:');
  });

  it('should include structure section and beat evaluation instructions when structure state is provided', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      structure,
      accumulatedStructureState: structureState,
    });

    const user = getUserMessage(messages);
    expect(user).toContain('=== STORY STRUCTURE ===');
    expect(user).toContain('Overall Theme: Stop the city purge before dawn.');
    expect(user).toContain('CURRENT ACT: The Crackdown (Act 1 of 3)');
    expect(user).toContain('Objective: Escape the first sweep');
    expect(user).toContain('Stakes: Capture means public execution.');
    expect(user).toContain(
      '[x] CONCLUDED: Reach a safehouse before patrols seal the district',
    );
    expect(user).toContain('Resolution: You slipped through a drainage tunnel into the safehouse.');
    expect(user).toContain('[>] ACTIVE: Secure evidence from an informant');
    expect(user).toContain('Objective: Protect the evidence from raiders');
    expect(user).toContain('[ ] PENDING: Choose who to trust for extraction');
    expect(user).toContain('REMAINING ACTS:');
    expect(user).toContain('Act 2: The Hunt - Cross hostile territory with the evidence');
    expect(user).toContain('Act 3: The Broadcast - Expose the planners to the public');
    expect(user).toContain('=== BEAT EVALUATION ===');
    expect(user).toContain('evaluate whether the ACTIVE beat should be concluded');
    expect(user).toContain('CONCLUDE THE BEAT (beatConcluded: true) when ANY of these apply:');
    expect(user).toContain('CRITICAL: Evaluate CUMULATIVE progress across all scenes');
    expect(user).toContain('If concluding, provide beatResolution:');
    expect(user).toContain('REMAINING BEATS TO EVALUATE FOR DEVIATION:');
    expect(user).toContain('  - 1.2: Secure evidence from an informant');
    expect(user).toContain('  - 3.2: Deliver the proof');
    expect(user).toContain('=== BEAT DEVIATION EVALUATION ===');
    expect(user).toContain('deviationDetected: true');
  });

  it('should omit structure section when structure context is absent', () => {
    const messages = buildContinuationPrompt(baseContext);
    const user = getUserMessage(messages);

    expect(user).not.toContain('=== STORY STRUCTURE ===');
    expect(user).not.toContain('=== BEAT EVALUATION ===');
    expect(user).not.toContain('=== BEAT DEVIATION EVALUATION ===');
  });

  it('should exclude concluded beats from remaining beats deviation list', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      structure,
      accumulatedStructureState: structureState,
    });

    const user = getUserMessage(messages);
    const remainingSection = user.split('REMAINING BEATS TO EVALUATE FOR DEVIATION:\n')[1]?.split('\n\n=== BEAT DEVIATION EVALUATION ===')[0] ?? '';

    expect(remainingSection).not.toContain('1.1: Reach a safehouse before patrols seal the district');
    expect(remainingSection).toContain('1.2: Secure evidence from an informant');
    expect(remainingSection).toContain('2.1: Break through checkpoints');
  });

  it('should omit structure section when structure state points to an invalid act index', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      structure,
      accumulatedStructureState: {
        ...structureState,
        currentActIndex: 9,
      },
    });

    const user = getUserMessage(messages);
    expect(user).not.toContain('=== STORY STRUCTURE ===');
    expect(user).not.toContain('=== BEAT EVALUATION ===');
    expect(user).toContain('PREVIOUS SCENE:');
  });

  it('should include previous narrative', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).toContain('Rain batters the windows');
  });

  it('should include content policy in system message', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getSystemMessage(messages)).toContain('NC-21');
    expect(getSystemMessage(messages)).toContain(CONTENT_POLICY);
  });

  it('should NOT include OUTPUT FORMAT instructions', () => {
    const messages = buildContinuationPrompt(baseContext);
    const system = getSystemMessage(messages);

    expect(system).not.toContain('OUTPUT FORMAT:');
    expect(system).not.toContain('NARRATIVE:');
    expect(system).not.toContain('CHOICES:');
  });

  it('should return exactly 2 messages (system, user) with no options', () => {
    const messages = buildContinuationPrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('should return 4 messages with fewShotMode: minimal', () => {
    const messages = buildContinuationPrompt(baseContext, { fewShotMode: 'minimal' });

    expect(messages).toHaveLength(4);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // example user
    expect(messages[2]?.role).toBe('assistant'); // example assistant
    expect(messages[3]?.role).toBe('user'); // actual prompt
  });

  it('should return 6 messages with fewShotMode: standard (includes ending example)', () => {
    const messages = buildContinuationPrompt(baseContext, { fewShotMode: 'standard' });

    expect(messages).toHaveLength(6);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // continuation example user
    expect(messages[2]?.role).toBe('assistant'); // continuation example assistant
    expect(messages[3]?.role).toBe('user'); // ending example user
    expect(messages[4]?.role).toBe('assistant'); // ending example assistant
    expect(messages[5]?.role).toBe('user'); // actual prompt
  });

  it('should include numbered REQUIREMENTS in user message', () => {
    const messages = buildContinuationPrompt(baseContext);

    const user = getUserMessage(messages);
    expect(user).toContain('REQUIREMENTS (follow ALL)');
    expect(user).toContain('1.');
    expect(user).toContain('2.');
    expect(user).toContain('3.');
    expect(user).toContain('4.');
    expect(user).toContain('5.');
    expect(user).toContain('6.');
  });

  it('should include no-recap instruction in continuation requirements', () => {
    const messages = buildContinuationPrompt(baseContext);

    const user = getUserMessage(messages);
    expect(user).toContain('do NOT recap');
    expect(user).toContain('Start exactly where the previous scene ended');
  });

  it('should not truncate text under maxLength', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: 'A short prior scene.',
    });

    expect(getUserMessage(messages)).toContain('A short prior scene.');
  });

  it('should truncate at sentence boundary when possible', () => {
    const narrative =
      `A${'a'.repeat(1040)}. ` +
      `B${'b'.repeat(1040)}. ` +
      `C${'c'.repeat(1200)} with no terminal punctuation`;
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages).split('PREVIOUS SCENE:\n')[1]?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine.endsWith('.')).toBe(true);
    expect(previousSceneLine.length).toBeLessThanOrEqual(2000);
    expect(previousSceneLine).not.toContain('...');
  });

  it('should add ellipsis when no good boundary found', () => {
    const narrative = 'x'.repeat(2500);
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages).split('PREVIOUS SCENE:\n')[1]?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine.length).toBe(2003);
    expect(previousSceneLine.endsWith('...')).toBe(true);
  });

  // Active State Section Tests
  describe('active state sections', () => {
    it('includes CURRENT LOCATION section when location set', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: 'A dimly lit warehouse on the docks',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).toContain('CURRENT LOCATION:');
      expect(getUserMessage(messages)).toContain('A dimly lit warehouse on the docks');
    });

    it('omits CURRENT LOCATION section when empty', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).not.toContain('CURRENT LOCATION:');
    });

    it('includes ACTIVE THREATS section when threats present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [
            { prefix: 'Armed guards', description: 'patrolling nearby', raw: 'Armed guards patrolling nearby' },
            { prefix: 'Alarm system', description: 'active', raw: 'Alarm system is active' },
          ],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).toContain('ACTIVE THREATS (dangers that exist NOW):');
      expect(getUserMessage(messages)).toContain('- Armed guards patrolling nearby');
      expect(getUserMessage(messages)).toContain('- Alarm system is active');
    });

    it('omits ACTIVE THREATS section when no threats', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).not.toContain('ACTIVE THREATS');
    });

    it('includes ACTIVE CONSTRAINTS section when constraints present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [
            { prefix: 'Injured leg', description: 'limits mobility', raw: 'Injured leg limits mobility' },
            { prefix: 'No weapon', description: 'unarmed', raw: 'No weapon - currently unarmed' },
          ],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).toContain('ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):');
      expect(getUserMessage(messages)).toContain('- Injured leg limits mobility');
      expect(getUserMessage(messages)).toContain('- No weapon - currently unarmed');
    });

    it('omits ACTIVE CONSTRAINTS section when no constraints', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).not.toContain('ACTIVE CONSTRAINTS');
    });

    it('includes OPEN THREADS section when threads present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            { prefix: 'Missing witness', description: 'whereabouts unknown', raw: 'Missing witness - whereabouts unknown' },
            { prefix: 'Encrypted files', description: 'need decryption key', raw: 'Encrypted files need decryption key' },
          ],
        },
      });

      expect(getUserMessage(messages)).toContain('OPEN NARRATIVE THREADS (unresolved hooks):');
      expect(getUserMessage(messages)).toContain('- Missing witness - whereabouts unknown');
      expect(getUserMessage(messages)).toContain('- Encrypted files need decryption key');
    });

    it('omits OPEN THREADS section when no threads', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).not.toContain('OPEN NARRATIVE THREADS');
    });

    it('includes all active state sections in correct order', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: 'The rooftop',
          activeThreats: [{ prefix: 'Sniper', description: 'on adjacent building', raw: 'Sniper on adjacent building' }],
          activeConstraints: [{ prefix: 'Low ammo', description: 'only 2 rounds left', raw: 'Low ammo - only 2 rounds left' }],
          openThreads: [{ prefix: 'Contact', description: 'awaiting signal', raw: 'Contact awaiting signal' }],
        },
      });

      const content = getUserMessage(messages);
      const locationIdx = content.indexOf('CURRENT LOCATION:');
      const threatsIdx = content.indexOf('ACTIVE THREATS');
      const constraintsIdx = content.indexOf('ACTIVE CONSTRAINTS');
      const threadsIdx = content.indexOf('OPEN NARRATIVE THREADS');

      // All should be present
      expect(locationIdx).toBeGreaterThan(-1);
      expect(threatsIdx).toBeGreaterThan(-1);
      expect(constraintsIdx).toBeGreaterThan(-1);
      expect(threadsIdx).toBeGreaterThan(-1);

      // Verify order: location < threats < constraints < threads
      expect(locationIdx).toBeLessThan(threatsIdx);
      expect(threatsIdx).toBeLessThan(constraintsIdx);
      expect(constraintsIdx).toBeLessThan(threadsIdx);
    });
  });

  // Grandparent Narrative Tests
  describe('grandparent narrative', () => {
    it('includes both previous scenes when grandparent available', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        previousNarrative: 'The detective entered the warehouse.',
        grandparentNarrative: 'Earlier that night, a mysterious phone call came.',
      });

      expect(getUserMessage(messages)).toContain('SCENE BEFORE LAST:');
      expect(getUserMessage(messages)).toContain('Earlier that night, a mysterious phone call came.');
      expect(getUserMessage(messages)).toContain('PREVIOUS SCENE:');
      expect(getUserMessage(messages)).toContain('The detective entered the warehouse.');
    });

    it('omits grandparent section when not available', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        previousNarrative: 'The detective entered the warehouse.',
        grandparentNarrative: null,
      });

      expect(getUserMessage(messages)).not.toContain('SCENE BEFORE LAST:');
      expect(getUserMessage(messages)).toContain('PREVIOUS SCENE:');
    });

    it('truncates grandparent narrative to 1000 chars', () => {
      const longNarrative = 'A'.repeat(1500);
      const messages = buildContinuationPrompt({
        ...baseContext,
        grandparentNarrative: longNarrative,
      });

      const content = getUserMessage(messages);
      const sceneBeforeLastSection = content.split('SCENE BEFORE LAST:\n')[1]?.split('\n\nPREVIOUS SCENE:')[0] ?? '';

      // Should be truncated (1000 chars + '...')
      expect(sceneBeforeLastSection.length).toBeLessThanOrEqual(1003);
    });

    it('places grandparent section before previous scene section', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        previousNarrative: 'Previous scene content.',
        grandparentNarrative: 'Grandparent scene content.',
      });

      const content = getUserMessage(messages);
      const grandparentIdx = content.indexOf('SCENE BEFORE LAST:');
      const previousIdx = content.indexOf('PREVIOUS SCENE:');

      expect(grandparentIdx).toBeGreaterThan(-1);
      expect(previousIdx).toBeGreaterThan(-1);
      expect(grandparentIdx).toBeLessThan(previousIdx);
    });
  });

  // Beat Evaluation Context Tests
  describe('beat evaluation with active state', () => {
    it('includes active state summary in beat evaluation context', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
        },
        activeState: {
          currentLocation: 'Hidden bunker',
          activeThreats: [{ prefix: 'Enemy patrol', description: 'searching', raw: 'Enemy patrol searching' }],
          activeConstraints: [],
          openThreads: [],
        },
      });

      const content = getUserMessage(messages);
      expect(content).toContain('CURRENT STATE (for beat evaluation):');
      expect(content).toContain('Location: Hidden bunker');
      expect(content).toContain('Active threats: Enemy patrol');
      expect(content).toContain('Consider these when evaluating beat completion');
    });

    it('omits active state summary when all fields empty', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
        },
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      const content = getUserMessage(messages);
      // Should NOT contain the active state summary section
      expect(content).not.toContain('CURRENT STATE (for beat evaluation):');
    });

    it('uses prefix for compact beat evaluation display', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
        },
        activeState: {
          currentLocation: '',
          activeThreats: [
            { prefix: 'Guard', description: 'patrolling the area', raw: 'Guard patrolling the area' },
            { prefix: 'Dog', description: 'trained to attack', raw: 'Dog trained to attack' },
          ],
          activeConstraints: [
            { prefix: 'Broken arm', description: 'cannot climb', raw: 'Broken arm - cannot climb' },
          ],
          openThreads: [
            { prefix: 'Missing key', description: 'need to find it', raw: 'Missing key - need to find it' },
          ],
        },
      });

      const content = getUserMessage(messages);
      // Beat evaluation section should use prefix, not raw
      expect(content).toContain('Active threats: Guard, Dog');
      expect(content).toContain('Constraints: Broken arm');
      expect(content).toContain('Open threads: Missing key');
    });
  });

  // Verify old format is NOT present
  describe('old format removal', () => {
    it('does not include old CURRENT STATE format with event log', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        accumulatedState: ['Event 1 happened', 'Event 2 occurred'],
        activeState: {
          currentLocation: 'Test location',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
      });

      const content = getUserMessage(messages);
      // Should NOT contain the old format
      expect(content).not.toMatch(/CURRENT STATE:\n- Event/);
      expect(content).not.toContain('- Event 1 happened');
      expect(content).not.toContain('- Event 2 occurred');
    });
  });
});
