import { buildChatPlannerMessages } from '../../../../../src/llm/prompts/chat/chat-planner-prompt';
import type { ChatPlannerContext } from '../../../../../src/llm/chat/chat-planner-generation';
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
    stressVariants: {
      underThreat: 'Gets colder and more procedural',
      inIntimacy: 'Deflects with mission language',
      whenLying: 'Over-explains tactical details',
      whenAshamed: 'Turns severe and overcorrects',
      whenWinning: 'Presses for irreversible leverage',
    },
    focalizationFilter: {
      noticesFirst: 'Breaks in resolve',
      systematicallyMisses: 'Unscripted kindness',
      misreadsAs: 'Reads hesitation as stalling',
    },
    immediateObjectives: ['Secure the map', 'Test Tomas'],
    ...overrides,
  };
}

function makeContext(): ChatPlannerContext {
  return {
    targetCharacter: makeCharacter('Iria Vale'),
    interlocutorCharacterName: 'Tomas Braga',
    rollingSummary: {
      compressedSummary: 'Their last meeting ended with a threat and no proof.',
      keyCommitments: ['Meet before dawn'],
      keyRevelations: ['Iria copied the key'],
      unresolvedQuestions: ['Who ordered the theft?'],
      leverageShifts: ['Tomas forced Iria onto the defensive.'],
      emotionalTrajectory: 'Guarded hostility.',
    },
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
        activeThreads: ['Who betrayed whom first'],
        commitments: ['Meet before dawn'],
        sensitiveTopics: ['Her brother'],
        lastTurnPressure: 'He demanded proof she was still useful',
      },
      continuityGuardrails: ['Do not invent new evidence'],
      responseConstraints: ['React directly to the accusation'],
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
      {
        turnNumber: 12,
        speaker: 'CHARACTER',
        blocks: [
          { type: 'ACTION', text: 'does not look up from the telescope' },
          { type: 'SPEECH', delivery: 'flat', text: 'If I had, you would already know.' },
        ],
        turnMeta: {
          expectsReply: true,
          endsWithQuestion: false,
          visibleEmotion: 'contained anger',
          finalPressure: 'Demands proof instead of denial',
        },
        timestamp: '2026-03-02T09:01:00.000Z',
      },
    ],
    latestUserTurn: {
      turnNumber: 13,
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

describe('buildChatPlannerMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatPlannerMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes the content policy block in the system prompt', () => {
    const messages = buildChatPlannerMessages(makeContext());

    expect(messages[0].content).toContain('CONTENT GUIDELINES');
    expect(messages[0].content).toContain('NC-21');
  });

  it('includes all required user sections', () => {
    const userContent = buildChatPlannerMessages(makeContext())[1].content;

    expect(userContent).toContain('CHAT BIBLE');
    expect(userContent).toContain('OLDER CHAT SUMMARY');
    expect(userContent).toContain('TARGET CHARACTER DECOMPOSITION');
    expect(userContent).toContain('TARGET CHARACTER SPEECH FINGERPRINT');
    expect(userContent).toContain('RECENT CHAT TURNS');
    expect(userContent).toContain('LATEST USER TURN');
  });

  it('wires the standalone summary view and keeps speech fingerprint guidance separate', () => {
    const userContent = buildChatPlannerMessages(makeContext())[1].content;

    expect(userContent).toContain('TARGET CHARACTER DECOMPOSITION\nIria Vale\n  Traits: guarded, precise');
    expect(userContent).toContain('Immediate Objectives: Secure the map; Test Tomas');
    expect(userContent).toContain('Focalization Filter:');
    expect(userContent).toContain('Notices First: Breaks in resolve');
    expect(userContent).toContain('Stress Variants:');
    expect(userContent).toContain('When Lying: Over-explains tactical details');
    expect(userContent).not.toContain('Knowledge Boundaries: Knows the codes, not the mastermind.');
    expect(userContent).not.toContain('Core Beliefs:');
    expect(userContent).not.toContain('Iria Vale is dangerous and exhausted.');
    expect(userContent).toContain('Vocabulary Profile: Clipped naval diction');
    expect(userContent).toContain('Dialogue Samples:');
    expect(userContent).toContain('- Stay on bearing, and maybe we survive this yet.');
  });

  it('formats recent turns and latest user turn separately', () => {
    const userContent = buildChatPlannerMessages(makeContext())[1].content;

    expect(userContent).toContain('RECENT CHAT TURNS\nTURN 11 [Tomas Braga]');
    expect(userContent).toContain('TURN 12 [Iria Vale]');
    expect(userContent).toContain('LATEST USER TURN\nTURN 13 [Tomas Braga]');
    expect(userContent).toContain('- ACTION: steps closer');
    expect(userContent).toContain('- SPEECH: Then prove it.');
  });

  it('renders the canonical session rolling summary outside the chat bible', () => {
    const userContent = buildChatPlannerMessages(makeContext())[1].content;

    expect(userContent).toContain('OLDER CHAT SUMMARY\nCompressed Summary: Their last meeting ended with a threat and no proof.');
    expect(userContent).not.toContain('Rolling Summary: Their last meeting ended with a threat and no proof.');
  });
});
