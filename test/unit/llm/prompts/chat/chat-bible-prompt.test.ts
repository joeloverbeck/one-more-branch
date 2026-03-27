import { buildChatBibleMessages } from '../../../../../src/llm/prompts/chat/chat-bible-prompt';
import type { ChatBibleContext } from '../../../../../src/llm/chat/chat-bible-generation';
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
    falseBeliefs: ['The other character already chose betrayal'],
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

function makeContext(): ChatBibleContext {
  return {
    targetCharacter: makeCharacter('Iria Vale'),
    interlocutorCharacter: makeCharacter('Tomas Wren', {
      coreTraits: ['gentle', 'secretive'],
      knowledgeBoundaries: 'Knows the route, not the full conspiracy.',
    }),
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
    rollingSummary: 'Their last meeting ended with a threat and no proof.',
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
  };
}

describe('buildChatBibleMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatBibleMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes the content policy block in the system prompt', () => {
    const messages = buildChatBibleMessages(makeContext());

    expect(messages[0].content).toContain('CONTENT GUIDELINES');
    expect(messages[0].content).toContain('NC-21');
  });

  it('includes all required user sections', () => {
    const userContent = buildChatBibleMessages(makeContext())[1].content;

    expect(userContent).toContain('TARGET CHARACTER DECOMPOSITION');
    expect(userContent).toContain('INTERLOCUTOR CHARACTER PROFILE');
    expect(userContent).toContain('RELATIONSHIP STATE');
    expect(userContent).toContain('KNOWLEDGE STATE');
    expect(userContent).toContain('PHYSICAL CONTEXT');
    expect(userContent).toContain('PRE-CHAT LEAD-IN');
    expect(userContent).toContain('OLDER CHAT SUMMARY');
    expect(userContent).toContain('RECENT CHAT TURNS');
  });

  it('formats recent turns with block boundaries and speaker ownership', () => {
    const userContent = buildChatBibleMessages(makeContext())[1].content;

    expect(userContent).toContain('TURN 11 [USER]');
    expect(userContent).toContain('TURN 12 [CHARACTER]');
    expect(userContent).toContain('- ACTION: shuts the door');
    expect(userContent).toContain('- SPEECH: Did you sell me out?');
    expect(userContent).toContain('- SPEECH (flat): If I had, you would already know.');
  });

  it('renders absent prior history explicitly', () => {
    const userContent = buildChatBibleMessages({
      ...makeContext(),
      rollingSummary: null,
      recentTurns: [],
    })[1].content;

    expect(userContent).toContain('OLDER CHAT SUMMARY\nNone');
    expect(userContent).toContain('RECENT CHAT TURNS\nNo prior turns in this session.');
  });
});
