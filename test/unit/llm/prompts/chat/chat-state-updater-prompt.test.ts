import { buildChatStateUpdaterMessages } from '../../../../../src/llm/prompts/chat/chat-state-updater-prompt';
import type { ChatStateUpdaterContext } from '../../../../../src/llm/chat/chat-state-updater-generation';

function makeContext(): ChatStateUpdaterContext {
  return {
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
    writerTurn: {
      blocks: [
        { type: 'ACTION', text: 'She sets the lantern down with deliberate care.' },
        { type: 'SPEECH', delivery: 'flat', text: 'Then start by telling me what you told him.' },
      ],
      turnMeta: {
        expectsReply: true,
        endsWithQuestion: false,
        visibleEmotion: 'controlled anger',
        finalPressure: 'She refuses to let him redirect.',
      },
    },
  };
}

describe('buildChatStateUpdaterMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatStateUpdaterMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('includes the content policy and updater-specific extraction constraints in the system prompt', () => {
    const systemContent = buildChatStateUpdaterMessages(makeContext())[0].content;

    expect(systemContent).toContain('CONTENT GUIDELINES');
    expect(systemContent).toContain('Track knowledge asymmetry');
    expect(systemContent).toContain('Do not invent state changes unsupported by the provided turn.');
  });

  it('includes all required user sections', () => {
    const userContent = buildChatStateUpdaterMessages(makeContext())[1].content;

    expect(userContent).toContain('PRE-TURN CHAT BIBLE');
    expect(userContent).toContain('LATEST USER TURN');
    expect(userContent).toContain('TURN PLAN');
    expect(userContent).toContain('FINAL WRITTEN TURN');
  });

  it('formats the latest user turn and final writer turn separately', () => {
    const userContent = buildChatStateUpdaterMessages(makeContext())[1].content;

    expect(userContent).toContain('LATEST USER TURN\nTURN 12 [USER]');
    expect(userContent).toContain('- ACTION: steps closer');
    expect(userContent).toContain('- SPEECH: Then prove it.');
    expect(userContent).toContain('FINAL WRITTEN TURN\nBlocks:');
    expect(userContent).toContain('- ACTION: She sets the lantern down with deliberate care.');
    expect(userContent).toContain(
      '- SPEECH (flat): Then start by telling me what you told him.'
    );
    expect(userContent).toContain(
      'Turn Meta: expectsReply=true; endsWithQuestion=false; visibleEmotion=controlled anger; finalPressure=She refuses to let him redirect.'
    );
  });
});
