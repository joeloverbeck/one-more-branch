import { buildChatCharacterContextMessages } from '../../../../../src/llm/prompts/chat/chat-character-context-prompt';
import type { ChatGenerationContext } from '../../../../../src/llm/chat/chat-generation-context';
import type { ChatSceneContext } from '../../../../../src/models/chat/index';
import { EmotionSalience } from '../../../../../src/models/character-enums';
import type { DecomposedWorld } from '../../../../../src/models/decomposed-world';
import type { StandaloneDecomposedCharacter } from '../../../../../src/models/standalone-decomposed-character';

const DECOMPOSED_WORLD: DecomposedWorld = {
  worldLogline: 'A rain-soaked observatory city running on oath and suspicion.',
  facts: [
    {
      id: 'wf-1',
      domain: 'culture',
      fact: 'Naming a betrayer aloud in a sealed room is treated as a binding accusation.',
      scope: 'citywide',
      factType: 'PRACTICE',
      narrativeWeight: 'HIGH',
      sensoryHook: 'Voices drop whenever the ritual wording begins.',
    },
  ],
  rawWorldbuilding: 'A rain-soaked observatory city running on oath and suspicion.',
};

function makeCharacter(
  name: string,
  overrides: Partial<StandaloneDecomposedCharacter> = {}
): StandaloneDecomposedCharacter {
  return {
    id: `char-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    rawDescription: `${name} is dangerous and exhausted.`,
    speechFingerprint: {
      catchphrases: ['Stay on bearing.'],
      vocabularyProfile: 'Clipped naval diction',
      sentencePatterns: 'Short commands with precise follow-through',
      verbalTics: ['Listen'],
      dialogueSamples: ['Stay on bearing, and maybe we survive this yet.'],
      metaphorFrames: 'Storms and navigation',
      antiExamples: ['Whatever, let us vibe.'],
      discourseMarkers: ['No.', 'Then listen.'],
      registerShifts: 'Gets colder under pressure.',
    },
    coreTraits: ['guarded', 'precise'],
    superObjective: 'Recover the map',
    knowledgeBoundaries: 'Knows the codes, not the mastermind.',
    falseBeliefs: ['The other character already chose betrayal'],
    secretsKept: ['She copied the cipher key'],
    decisionPattern: 'Acts fast, then fortifies the choice.',
    coreBeliefs: ['Competence is safer than trust'],
    conflictPriority: 'Mission over comfort',
    appearance: 'Rain-dark coat and immaculate gloves',
    createdAt: '2026-03-01T10:00:00.000Z',
    stakes: ['Lose the map', 'Expose her informant'],
    pressurePoint: 'Any hint she failed the mission alone',
    personalDilemmas: ['Protect the source or save the alliance'],
    emotionSalience: EmotionSalience.HIGH,
    moralLine: 'Will not hand civilians to the tribunal',
    worstFear: 'Being trapped under someone else’s command again',
    formativeWound: 'A prior captain framed her to save himself',
    misbelief: 'If she needs anyone, they own her',
    stressVariants: {
      underThreat: 'Gets colder and more procedural',
      inIntimacy: 'Deflects with mission language',
      whenLying: 'Over-explains tactical details',
      whenAshamed: 'Becomes ruthlessly efficient',
      whenWinning: 'Pushes too hard for total control',
    },
    focalizationFilter: {
      noticesFirst: 'Hesitation before commitment',
      systematicallyMisses: 'Good-faith offers of care',
      misreadsAs: 'Treats uncertainty as manipulation',
    },
    escalationLadder: ['Warn once', 'Corner verbally', 'Force a commitment'],
    immediateObjectives: ['Secure the map', 'Test Tomas'],
    sociology: 'Officer caste training with dockside survival habits',
    ...overrides,
  };
}

function makeContext(): ChatGenerationContext {
  return {
    targetCharacter: makeCharacter('Iria Vale'),
    interlocutorCharacter: makeCharacter('Tomas Wren'),
    decomposedWorld: DECOMPOSED_WORLD,
    relationshipState: {
      dynamic: 'Brittle allies',
      valence: -1,
      tension: 7,
      leverage: 'Each knows one ruinous fact about the other',
    },
    knowledgeState: {
      knownFacts: ['The courier missed the rendezvous'],
      suspicions: ['Tomas met the courier first'],
      falseBeliefs: ['The observatory is still unobserved'],
      secretsRevealed: ['Iria copied the key'],
    },
    physicalContext: {
      location: 'Abandoned observatory',
      microLocation: 'Upper gallery',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Watching the stairwell',
      interactableObjects: ['Telescope', 'Lantern'],
      ambientConditions: ['Rain', 'Drafts'],
    },
    leadInContext: {
      leadInSummary: 'They arrive separately after the courier disappears.',
      recentEvents: ['The signal fire failed', 'A coded note appeared'],
      whyNow: 'The trail goes cold by dawn.',
    },
    rollingSummary: null,
    recentTurns: [
      {
        turnNumber: 12,
        speaker: 'CHARACTER',
        blocks: [{ type: 'SPEECH', delivery: 'flat', text: 'If I had, you would already know.' }],
        turnMeta: {
          expectsReply: true,
          endsWithQuestion: false,
          visibleEmotion: 'contained anger',
          finalPressure: 'Demands proof instead of denial',
        },
        timestamp: '2026-03-02T09:01:00.000Z',
      },
    ],
  };
}

function makeSceneContext(): ChatSceneContext {
  return {
    sessionPremise: 'Two former allies try to determine whether betrayal is survivable.',
    physicalReality: {
      location: 'Abandoned observatory',
      microLocation: 'Upper gallery',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Watching the stairwell',
      interactableObjects: ['Telescope', 'Lantern'],
      ambientConditions: ['Rain', 'Drafts'],
    },
    preChatMomentum: {
      leadInSummary: 'They arrive separately after the courier disappears.',
      recentEvents: ['The signal fire failed', 'A coded note appeared'],
      whyNow: 'The trail goes cold by dawn.',
      stakesNow: ['The courier may vanish for good.'],
      unresolvedPressures: ['Neither believes the other came alone.'],
    },
    conversationNow: {
      rollingSummary: 'The accusation is explicit now.',
      activeThreads: ['Who reached the courier first'],
      commitments: ['No one leaves with the map'],
      sensitiveTopics: ['The copied cipher key'],
      lastTurnPressure: 'Demand for proof instead of denial',
    },
  };
}

describe('buildChatCharacterContextMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatCharacterContextMessages(makeContext(), makeSceneContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('uses a psychology-focused system prompt with content policy', () => {
    const systemContent = buildChatCharacterContextMessages(makeContext(), makeSceneContext())[0]
      .content;

    expect(systemContent).toContain("character's psychological state");
    expect(systemContent).toContain('must not contradict it');
    expect(systemContent).toContain('CONTENT GUIDELINES');
  });

  it('includes established scene context plus relationship and knowledge sections', () => {
    const userContent = buildChatCharacterContextMessages(makeContext(), makeSceneContext())[1]
      .content;

    expect(userContent).toContain('ESTABLISHED SCENE CONTEXT');
    expect(userContent).toContain(
      'Session Premise: Two former allies try to determine whether betrayal is survivable.'
    );
    expect(userContent).toContain('RELATIONSHIP STATE');
    expect(userContent).toContain('KNOWLEDGE STATE');
    expect(userContent).toContain('RECENT CHAT TURNS');
  });

  it('wires the psychology summary view into character sections without leaking raw descriptions', () => {
    const userContent = buildChatCharacterContextMessages(makeContext(), makeSceneContext())[1]
      .content;

    expect(userContent).toContain('TARGET CHARACTER DECOMPOSITION\nName: Iria Vale');
    expect(userContent).toContain('INTERLOCUTOR CHARACTER PROFILE\nName: Tomas Wren');
    expect(userContent).toContain('Super-Objective: Recover the map');
    expect(userContent).toContain('Stakes:');
    expect(userContent).toContain('Knowledge Boundaries: Knows the codes, not the mastermind.');
    expect(userContent).toContain('Immediate Objectives: Secure the map; Test Tomas');
    expect(userContent).not.toContain('TARGET CHARACTER DECOMPOSITION\nIria Vale\n  Traits:');
    expect(userContent).not.toContain('Iria Vale is dangerous and exhausted.');
  });
});
