import { CONTENT_POLICY } from '../../../src/llm/content-policy';
import type { AccumulatedStructureState, StoryStructure } from '../../../src/models/story-arc';
import { buildContinuationPrompt, buildOpeningPrompt } from '../../../src/llm/prompts';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  // Get the last user message (after any few-shot examples)
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages[userMessages.length - 1]?.content ?? '';
}

describe('buildOpeningPrompt', () => {
  const testStructure: StoryStructure = {
    overallTheme: 'Survive the uprising and expose its true architect',
    premise: 'A fugitive must uncover the uprising architect before being silenced forever.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
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
            role: 'setup',
          },
          {
            id: '1.2',
            description: 'A former ally offers help with conditions',
            objective: 'Choose whether to trust the ally',
            role: 'turning_point',
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
          {
            id: '2.1',
            description: 'First chase beat',
            objective: 'Evade pursuit',
            role: 'escalation',
          },
          {
            id: '2.2',
            description: 'Second chase beat',
            objective: 'Protect the evidence',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '3',
        name: 'The Reckoning',
        objective: 'Expose the architect publicly',
        stakes: 'Failure secures permanent authoritarian rule',
        entryCondition: 'Allies gather for final confrontation',
        beats: [
          {
            id: '3.1',
            description: 'Final entry beat',
            objective: 'Force a confession',
            role: 'escalation',
          },
          {
            id: '3.2',
            description: 'Final resolution beat',
            objective: 'Stabilize the city',
            role: 'resolution',
          },
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

  it('should NOT include structure section even when structure is provided', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
      structure: testStructure,
    });

    const user = getUserMessage(messages);
    expect(user).not.toContain('=== STORY STRUCTURE ===');
    expect(user).not.toContain('CURRENT ACT:');
    expect(user).not.toContain('CURRENT BEAT:');
    expect(user).not.toContain('Overall Theme:');
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
      { fewShotMode: 'none' }
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
      { fewShotMode: 'minimal' }
    );

    expect(messages).toHaveLength(4);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user'); // example user
    expect(messages[2]?.role).toBe('assistant'); // example assistant
    expect(messages[3]?.role).toBe('user'); // actual prompt
  });

  it('should include strict choice guidelines in user message when choiceGuidance: strict', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'strict' }
    );

    const user = getUserMessage(messages);
    expect(user).toContain('CHOICE REQUIREMENTS:');
    expect(user).toContain('IN-CHARACTER');
    expect(user).toContain('DIVERGENT');
    expect(user).toContain('FORBIDDEN CHOICE PATTERNS');
  });

  it('should include DIVERGENCE ENFORCEMENT in user message with strict choice guidelines', () => {
    const messages = buildOpeningPrompt(
      {
        characterConcept: 'Character',
        worldbuilding: '',
        tone: 'dark fantasy',
      },
      { choiceGuidance: 'strict' }
    );

    const user = getUserMessage(messages);
    expect(user).toContain('DIVERGENCE ENFORCEMENT');
    expect(user).toContain('choiceType');
    expect(user).toContain('primaryDelta');
  });

  it('should include read-only continuity guidance for opening data rules', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const user = getUserMessage(messages);
    expect(user).toContain('=== ACTIVE STATE TRACKING ===');
    expect(user).toContain('READ-ONLY CONTINUITY INPUT:');
    expect(user).toContain('Show consequences in prose and choices.');
    expect(user).not.toContain('ESTABLISHMENT RULES (OPENING)');
  });

  it('should NOT include CONTINUITY RULES in opening system message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const system = getSystemMessage(messages);
    // Opening should NOT have continuation-specific continuity rules
    expect(system).not.toContain('CONTINUITY RULES (CONTINUATION)');
    expect(system).not.toContain('ESTABLISHED WORLD FACTS');
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
      { choiceGuidance: 'basic' }
    );

    const user = getUserMessage(messages);
    expect(user).not.toContain('CHOICE REQUIREMENTS:');
  });

  it('should include numbered REQUIREMENTS in user message', () => {
    const messages = buildOpeningPrompt({
      characterConcept: 'Character',
      worldbuilding: '',
      tone: 'dark fantasy',
    });

    const user = getUserMessage(messages);
    expect(user).toContain('REQUIREMENTS (follow all)');
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
    premise:
      'A fugitive must broadcast evidence of a government purge before dawn erases all proof.',
    pacingBudget: { targetPagesMin: 20, targetPagesMax: 40 },
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
            role: 'setup',
          },
          {
            id: '1.2',
            description: 'Secure evidence from an informant',
            objective: 'Protect the evidence from raiders',
            role: 'escalation',
          },
          {
            id: '1.3',
            description: 'Choose who to trust for extraction',
            objective: 'Commit to an ally',
            role: 'turning_point',
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
          {
            id: '2.1',
            description: 'Break through checkpoints',
            objective: 'Find a route north',
            role: 'escalation',
          },
          {
            id: '2.2',
            description: 'Defend witnesses',
            objective: 'Keep witnesses alive',
            role: 'turning_point',
          },
        ],
      },
      {
        id: '3',
        name: 'The Broadcast',
        objective: 'Expose the planners to the public',
        stakes: 'Silence guarantees totalitarian rule.',
        entryCondition: 'You gain access to the relay tower.',
        beats: [
          {
            id: '3.1',
            description: 'Reach the relay core',
            objective: 'Seize control room access',
            role: 'escalation',
          },
          {
            id: '3.2',
            description: 'Deliver the proof',
            objective: 'Transmit unedited evidence',
            role: 'resolution',
          },
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
    pagesInCurrentBeat: 0,
    pacingNudge: null,
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
    ancestorSummaries: [],
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
        greaves: [
          { id: 'cs-1', text: 'Gave protagonist a sketched map' },
          { id: 'cs-2', text: 'Proposed a 70-30 split' },
        ],
        elena: [{ id: 'cs-3', text: 'Agreed to meet at the docks' }],
      },
    });

    const user = getUserMessage(messages);
    expect(user).toContain('NPC CURRENT STATE (branch-specific events):');
    expect(user).toContain('[greaves]');
    expect(user).toContain('- [cs-1] Gave protagonist a sketched map');
    expect(user).toContain('- [cs-2] Proposed a 70-30 split');
    expect(user).toContain('[elena]');
    expect(user).toContain('- [cs-3] Agreed to meet at the docks');
  });

  it('should not include NPC current state section when empty', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      accumulatedCharacterState: {},
    });

    const user = getUserMessage(messages);
    expect(user).not.toContain('NPC CURRENT STATE (branch-specific events):');
  });

  it('should not include deprecated story arc section in continuation prompt', () => {
    const messages = buildContinuationPrompt(baseContext);
    expect(getUserMessage(messages)).not.toContain('STORY ARC:');
  });

  it('should NOT include structure section even when structure context is provided', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      structure,
      accumulatedStructureState: structureState,
    });

    const user = getUserMessage(messages);
    // Writer prompt no longer includes structure - planner guidance is sufficient
    expect(user).not.toContain('=== STORY STRUCTURE ===');
    expect(user).not.toContain('Overall Theme:');
    expect(user).not.toContain('CURRENT ACT:');
    expect(user).not.toContain('REMAINING ACTS:');
    expect(user).not.toContain('=== BEAT EVALUATION ===');
    expect(user).not.toContain('=== BEAT DEVIATION EVALUATION ===');
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
    expect(user).toContain('REQUIREMENTS (follow all)');
    expect(user).toContain('1.');
    expect(user).toContain('2.');
    expect(user).toContain('3.');
    expect(user).toContain('4.');
    expect(user).toContain('5.');
    expect(user).toContain('6.');
  });

  it('should include opening mode decision guidance in continuation requirements', () => {
    const messages = buildContinuationPrompt(baseContext);

    const user = getUserMessage(messages);
    expect(user).toContain('Choose the scene opening based on what matters next');
    expect(user).toContain('Option A (immediate continuation)');
    expect(user).toContain('Option B (time cut)');
    expect(user).toContain('do NOT recap or summarize what happened');
    expect(user).toContain('Start exactly where the previous scene ended');
    expect(user).toContain(
      "SKIP time and open at the next scene where the choice's consequences matter"
    );
    expect(user).toContain('For Option B, signal the skip with a brief time cue');
  });

  it('should not truncate text under maxLength', () => {
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: 'A short prior scene.',
    });

    expect(getUserMessage(messages)).toContain('A short prior scene.');
  });

  it('should pass through long narratives without truncation', () => {
    const narrative =
      `A${'a'.repeat(1040)}. ` +
      `B${'b'.repeat(1040)}. ` +
      `C${'c'.repeat(1200)} with no terminal punctuation`;
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages)
        .split('PREVIOUS SCENE (full text for style continuity):\n')[1]
        ?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine).toBe(narrative);
  });

  it('should pass through very long narratives without ellipsis', () => {
    const narrative = 'x'.repeat(2500);
    const messages = buildContinuationPrompt({
      ...baseContext,
      previousNarrative: narrative,
    });

    const previousSceneLine =
      getUserMessage(messages)
        .split('PREVIOUS SCENE (full text for style continuity):\n')[1]
        ?.split('\n\nPLAYER')[0] ?? '';

    expect(previousSceneLine.length).toBe(2500);
    expect(previousSceneLine).not.toContain('...');
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

      expect(getUserMessage(messages)).toContain('\nCURRENT LOCATION:\n');
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

      expect(getUserMessage(messages)).not.toContain('\nCURRENT LOCATION:\n');
    });

    it('includes ACTIVE THREATS section when threats present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [
            { id: 'th-1', text: 'Armed guards patrolling nearby' },
            { id: 'th-2', text: 'Alarm system is active' },
          ],
          activeConstraints: [],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).toContain('ACTIVE THREATS (dangers that exist NOW):');
      expect(getUserMessage(messages)).toContain('- [th-1] Armed guards patrolling nearby');
      expect(getUserMessage(messages)).toContain('- [th-2] Alarm system is active');
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

      expect(getUserMessage(messages)).not.toContain('ACTIVE THREATS (dangers that exist NOW):');
    });

    it('includes ACTIVE CONSTRAINTS section when constraints present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [
            { id: 'cn-1', text: 'Injured leg limits mobility' },
            { id: 'cn-2', text: 'No weapon - currently unarmed' },
          ],
          openThreads: [],
        },
      });

      expect(getUserMessage(messages)).toContain(
        'ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):'
      );
      expect(getUserMessage(messages)).toContain('- [cn-1] Injured leg limits mobility');
      expect(getUserMessage(messages)).toContain('- [cn-2] No weapon - currently unarmed');
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

      expect(getUserMessage(messages)).not.toContain(
        'ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):'
      );
    });

    it('includes OPEN THREADS section when threads present', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: '',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            {
              id: 'td-1',
              text: 'Missing witness - whereabouts unknown',
              threadType: 'MYSTERY',
              urgency: 'HIGH',
            },
            {
              id: 'td-2',
              text: 'Encrypted files need decryption key',
              threadType: 'QUEST',
              urgency: 'MEDIUM',
            },
          ],
        },
      });

      expect(getUserMessage(messages)).toContain('OPEN NARRATIVE THREADS (unresolved hooks):');
      expect(getUserMessage(messages)).toContain(
        '- [td-1] (MYSTERY/HIGH) Missing witness - whereabouts unknown'
      );
      expect(getUserMessage(messages)).toContain(
        '- [td-2] (QUEST/MEDIUM) Encrypted files need decryption key'
      );
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

      // Shared rules text always mentions "OPEN NARRATIVE THREADS"; assert
      // the runtime keyed section is absent by checking no keyed thread rows.
      expect(getUserMessage(messages)).not.toContain('- [td-');
    });

    it('includes all active state sections in correct order', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        activeState: {
          currentLocation: 'The rooftop',
          activeThreats: [{ id: 'th-1', text: 'Sniper on adjacent building' }],
          activeConstraints: [{ id: 'cn-1', text: 'Low ammo - only 2 rounds left' }],
          openThreads: [
            {
              id: 'td-1',
              text: 'Contact awaiting signal',
              threadType: 'INFORMATION',
              urgency: 'LOW',
            },
          ],
        },
      });

      const content = getUserMessage(messages);
      // Use dynamic section headers (with their specific suffixes) to avoid matching
      // the data rules text which also mentions these terms in a different context
      const locationIdx = content.indexOf('CURRENT LOCATION:\nThe rooftop');
      const threatsIdx = content.indexOf('ACTIVE THREATS (dangers that exist NOW):');
      const constraintsIdx = content.indexOf(
        'ACTIVE CONSTRAINTS (limitations affecting protagonist NOW):'
      );
      const threadsIdx = content.indexOf('OPEN NARRATIVE THREADS (unresolved hooks):');

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
        ancestorSummaries: [],
      });

      expect(getUserMessage(messages)).toContain(
        'SCENE BEFORE LAST (full text for style continuity):'
      );
      expect(getUserMessage(messages)).toContain(
        'Earlier that night, a mysterious phone call came.'
      );
      expect(getUserMessage(messages)).toContain(
        'PREVIOUS SCENE (full text for style continuity):'
      );
      expect(getUserMessage(messages)).toContain('The detective entered the warehouse.');
    });

    it('omits grandparent section when not available', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        previousNarrative: 'The detective entered the warehouse.',
        grandparentNarrative: null,
        ancestorSummaries: [],
      });

      expect(getUserMessage(messages)).not.toContain(
        'SCENE BEFORE LAST (full text for style continuity):'
      );
      expect(getUserMessage(messages)).toContain(
        'PREVIOUS SCENE (full text for style continuity):'
      );
    });

    it('passes through long grandparent narrative without truncation', () => {
      const longNarrative = 'A'.repeat(1500);
      const messages = buildContinuationPrompt({
        ...baseContext,
        grandparentNarrative: longNarrative,
        ancestorSummaries: [],
      });

      const content = getUserMessage(messages);
      const sceneBeforeLastSection =
        content
          .split('SCENE BEFORE LAST (full text for style continuity):\n')[1]
          ?.split('\n\nPREVIOUS SCENE (full text for style continuity):')[0] ?? '';

      expect(sceneBeforeLastSection).toBe(longNarrative);
    });

    it('places grandparent section before previous scene section', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        previousNarrative: 'Previous scene content.',
        grandparentNarrative: 'Grandparent scene content.',
        ancestorSummaries: [],
      });

      const content = getUserMessage(messages);
      const grandparentIdx = content.indexOf('SCENE BEFORE LAST (full text for style continuity):');
      const previousIdx = content.indexOf('PREVIOUS SCENE (full text for style continuity):');

      expect(grandparentIdx).toBeGreaterThan(-1);
      expect(previousIdx).toBeGreaterThan(-1);
      expect(grandparentIdx).toBeLessThan(previousIdx);
    });
  });

  // Beat Evaluation Context Tests
  describe('beat evaluation with active state', () => {
    it('does NOT include active state summary for beat evaluation in writer prompt', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
          pagesInCurrentBeat: 0,
          pacingNudge: null,
        },
        activeState: {
          currentLocation: 'Hidden bunker',
          activeThreats: [{ id: 'th-4', text: 'Enemy patrol searching' }],
          activeConstraints: [],
          openThreads: [],
        },
      });

      const content = getUserMessage(messages);
      // Writer prompt does not include beat evaluation active state
      expect(content).not.toContain('CURRENT STATE (for beat evaluation):');
      expect(content).not.toContain('Consider these when evaluating beat completion');
    });

    it('omits active state summary when all fields empty', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
          pagesInCurrentBeat: 0,
          pacingNudge: null,
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

    it('does NOT include compact beat evaluation display in writer prompt', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        structure,
        accumulatedStructureState: {
          currentActIndex: 0,
          currentBeatIndex: 0,
          beatProgressions: [{ beatId: '1.1', status: 'active' as const }],
          pagesInCurrentBeat: 0,
          pacingNudge: null,
        },
        activeState: {
          currentLocation: '',
          activeThreats: [
            { id: 'th-10', text: 'Guard patrolling the area' },
            { id: 'th-11', text: 'Dog trained to attack' },
          ],
          activeConstraints: [{ id: 'cn-9', text: 'Broken arm - cannot climb' }],
          openThreads: [{ id: 'td-5', text: 'Missing key - need to find it' }],
        },
      });

      const content = getUserMessage(messages);
      // Writer prompt does not include beat evaluation active state summary
      expect(content).not.toContain('CURRENT STATE (for beat evaluation):');
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

  describe('npcs and startingSituation', () => {
    it('includes NPC section when npcs is provided', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        npcs: [{ name: 'Gandalf', description: 'A wise mentor who guides the hero' }],
      });

      const content = getUserMessage(messages);
      expect(content).toContain('NPCS (Available Characters)');
      expect(content).toContain('NPC: Gandalf');
      expect(content).toContain('A wise mentor who guides the hero');
      expect(content).toContain('Introduce or involve them when narratively appropriate');
    });

    it('omits NPC section when npcs is not provided', () => {
      const messages = buildContinuationPrompt(baseContext);

      const content = getUserMessage(messages);
      expect(content).not.toContain('NPCS (Available Characters)');
    });

    it('omits NPC section when npcs is empty array', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        npcs: [],
      });

      const content = getUserMessage(messages);
      expect(content).not.toContain('NPCS (Available Characters)');
    });

    it('does NOT include starting situation in continuation prompts', () => {
      // Starting situation should only appear in opening prompts, never in continuation
      const messages = buildContinuationPrompt(baseContext);

      const content = getUserMessage(messages);
      expect(content).not.toContain('STARTING SITUATION');
      expect(content).not.toContain('MUST FOLLOW');
    });

    it('places NPC section after worldbuilding and before tone', () => {
      const messages = buildContinuationPrompt({
        ...baseContext,
        worldbuilding: 'A medieval fantasy world with magic',
        npcs: [{ name: 'Merlin', description: 'The wise wizard' }],
      });

      const content = getUserMessage(messages);
      const worldbuildingIdx = content.indexOf('WORLDBUILDING:');
      const npcsIdx = content.indexOf('NPCS (Available Characters)');
      const toneIdx = content.indexOf('TONE/GENRE:');

      expect(worldbuildingIdx).toBeGreaterThan(-1);
      expect(npcsIdx).toBeGreaterThan(-1);
      expect(toneIdx).toBeGreaterThan(-1);
      expect(worldbuildingIdx).toBeLessThan(npcsIdx);
      expect(npcsIdx).toBeLessThan(toneIdx);
    });
  });
});
