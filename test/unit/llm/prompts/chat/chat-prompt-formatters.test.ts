import { formatChatSceneContext } from '../../../../../src/llm/prompts/chat/chat-prompt-formatters';
import type { ChatSceneContext } from '../../../../../src/models/chat/index';

function makeSceneContext(): ChatSceneContext {
  return {
    sessionPremise: 'A private confrontation about a missing ledger.',
    physicalReality: {
      location: 'Archive',
      microLocation: 'Lamp-lit records table',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Sorting damaged ledgers',
      interactableObjects: ['ledger', 'oil lamp'],
      ambientConditions: ['rain on the roof', 'ink smell'],
    },
    preChatMomentum: {
      leadInSummary: 'They arrive separately after the raid.',
      recentEvents: ['A guard vanished.', 'The vault was left open.'],
      whyNow: 'The missing ledger cannot stay hidden until morning.',
      stakesNow: ['Exposure would ruin both of them.'],
      unresolvedPressures: ['Neither knows who else is listening.'],
    },
    conversationNow: {
      rollingSummary: null,
      activeThreads: ['ledger', 'guard disappearance'],
      commitments: ['Meet again at dawn'],
      sensitiveTopics: ['the second key'],
      lastTurnPressure: null,
    },
  };
}

describe('formatChatSceneContext', () => {
  it('renders a readable deterministic summary of all scene fields', () => {
    const formatted = formatChatSceneContext(makeSceneContext());

    expect(formatted).toContain('Session Premise: A private confrontation about a missing ledger.');
    expect(formatted).toContain('Physical Reality:');
    expect(formatted).toContain('- Location: Archive');
    expect(formatted).toContain('Interactable Objects:');
    expect(formatted).toContain('- ledger');
    expect(formatted).toContain('Pre-Chat Momentum:');
    expect(formatted).toContain('- Lead-In Summary: They arrive separately after the raid.');
    expect(formatted).toContain('Recent Events:');
    expect(formatted).toContain('- A guard vanished.');
    expect(formatted).toContain('Stakes Now:');
    expect(formatted).toContain('- Exposure would ruin both of them.');
    expect(formatted).toContain('Conversation Now:');
    expect(formatted).toContain('- Rolling Summary: None');
    expect(formatted).toContain('Sensitive Topics:');
    expect(formatted).toContain('- the second key');
    expect(formatted).toContain('- Last Turn Pressure: None');
  });
});
