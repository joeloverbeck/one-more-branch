import { buildChatWriterMessages } from '../../../../../src/llm/prompts/chat/chat-writer-prompt';
import type { ChatWriterContext } from '../../../../../src/llm/chat/chat-writer-generation';
import type { StandaloneDecomposedCharacter } from '../../../../../src/models/standalone-decomposed-character';

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
    falseBeliefs: ['Tomas already chose betrayal'],
    secretsKept: ['She copied the cipher key'],
    decisionPattern: 'Acts fast, then fortifies the choice.',
    coreBeliefs: ['Competence is safer than trust'],
    conflictPriority: 'Mission over comfort',
    appearance: 'Rain-dark coat and immaculate gloves',
    createdAt: '2026-03-01T10:00:00.000Z',
    immediateObjectives: ['Secure the map', 'Test Tomas'],
    ...overrides,
  };
}

function makeContext(): ChatWriterContext {
  return {
    targetCharacter: makeCharacter('Iria Vale'),
    interlocutorCharacterName: 'Tomas Braga',
    chatBible: {
      sessionPremise: 'A guarded reunion after a failed mission.',
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
        stakesNow: ['Recover the map'],
        unresolvedPressures: ['Mutual distrust'],
      },
      characterNow: {
        currentObjective: 'Test whether Tomas is lying.',
        immediateNeedFromConversation: 'Force a revealing answer.',
        emotionalState: 'contained anger',
        willingnessToEngage: 'GUARDED',
        topicsToAdvance: ['The courier', 'The map exchange'],
        topicsToProtect: ['The source of the cipher key'],
      },
      relationshipNow: {
        dynamic: 'Brittle allies',
        valence: -1,
        tension: 7,
        leverage: 'Each knows one ruinous fact about the other',
        whatCharacterBelievesAboutInterlocutor: ['He still wants the alliance to survive'],
      },
      knowledgeNow: {
        knownFacts: ['The courier missed the rendezvous'],
        suspicions: ['Tomas met the courier first'],
        falseBeliefs: ['The observatory is still unobserved'],
        secretsRevealed: ['Iria copied the key'],
        secretsKept: ['She knows where the backup ledger is hidden'],
        knowledgeBoundaries: ['She does not know who ordered the theft'],
      },
      conversationNow: {
        rollingSummary: 'Their last meeting ended with a threat and no proof.',
        activeThreads: ['Who betrayed whom first'],
        commitments: ['Meet before dawn'],
        sensitiveTopics: ['Her brother'],
        lastTurnPressure: 'He demanded proof she was still useful',
      },
      continuityGuardrails: ['Do not invent new evidence'],
      responseConstraints: ['React directly to the accusation'],
    },
    turnPlan: {
      internalSelfCheck: {
        whatDoIWant: 'Make him overcommit.',
        whatDoIKnow: 'He is concealing something.',
        whatAmIHiding: 'I already copied the key.',
        howHonestAmI: 'Partially honest.',
      },
      responseGoal: 'Probe without surrendering leverage.',
      speechAct: 'PROBE',
      honestyMode: 'PARTIAL',
      surfaceEmotion: 'controlled anger',
      suppressedEmotion: 'fear',
      subtext: 'I need him defensive, not gone.',
      mustAddress: ['His demand for truth'],
      mustAvoid: ['Admitting who gave me the key'],
      blockPlan: ['ACTION', 'SPEECH'],
      actionPlan: [
        {
          kind: 'GESTURE',
          text: 'Sets the lantern down with deliberate care.',
          changesPhysicalState: false,
        },
      ],
      questionBack: 'What did you tell the courier before he disappeared?',
      targetLength: 'MEDIUM',
      expectedImpact: {
        relationshipDeltaHint: -1,
        tensionDeltaHint: 2,
        revealsSecret: false,
      },
    },
    recentTurns: [
      {
        turnNumber: 11,
        speaker: 'USER',
        rawText: '*shuts the door* Did you sell me out?',
        blocks: [
          { type: 'ACTION', text: 'shuts the door' },
          { type: 'SPEECH', text: 'Did you sell me out?' },
        ],
        timestamp: '2026-03-02T09:00:00.000Z',
      },
    ],
    latestUserTurn: {
      turnNumber: 12,
      speaker: 'USER',
      rawText: '*steps closer* Then prove it.',
      blocks: [
        { type: 'ACTION', text: 'steps closer' },
        { type: 'SPEECH', text: 'Then prove it.' },
      ],
      timestamp: '2026-03-02T09:02:00.000Z',
    },
  };
}

describe('buildChatWriterMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatWriterMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes the content policy and writer-specific constraints in the system prompt', () => {
    const systemContent = buildChatWriterMessages(makeContext())[0].content;

    expect(systemContent).toContain('CONTENT GUIDELINES');
    expect(systemContent).toContain('controlled imperfections');
    expect(systemContent).toContain('Maximum 2 action blocks; maximum 3 speech blocks.');
    expect(systemContent).toContain("Match the planner's ordered block plan exactly.");
  });

  it('includes all required user sections', () => {
    const userContent = buildChatWriterMessages(makeContext())[1].content;

    expect(userContent).toContain('TARGET CHARACTER NAME');
    expect(userContent).toContain('FULL SPEECH FINGERPRINT');
    expect(userContent).toContain('CHAT BIBLE');
    expect(userContent).toContain('TURN PLAN');
    expect(userContent).toContain('RECENT CHAT TURNS');
    expect(userContent).toContain('LATEST USER TURN');
  });

  it('includes the speech fingerprint and serialized planner output', () => {
    const userContent = buildChatWriterMessages(makeContext())[1].content;

    expect(userContent).toContain('Vocabulary Profile: Clipped naval diction');
    expect(userContent).toContain('Dialogue Samples:');
    expect(userContent).toContain('- Stay on bearing, and maybe we survive this yet.');
    expect(userContent).toContain('Response Goal: Probe without surrendering leverage.');
    expect(userContent).toContain('Block Plan: ACTION -> SPEECH');
    expect(userContent).toContain(
      '- GESTURE: Sets the lantern down with deliberate care. (changesPhysicalState=false)'
    );
  });

  it('formats recent turns and latest user turn separately', () => {
    const userContent = buildChatWriterMessages(makeContext())[1].content;

    expect(userContent).toContain('RECENT CHAT TURNS\nTURN 11 [Tomas Braga]');
    expect(userContent).toContain('LATEST USER TURN\nTURN 12 [Tomas Braga]');
    expect(userContent).toContain('- ACTION: steps closer');
    expect(userContent).toContain('- SPEECH: Then prove it.');
  });
});
