import type { ChatSceneContext } from '../../../../src/models/chat/index.js';
import { isChatSceneContext } from '../../../../src/models/chat/index.js';

function makeSceneContext(): ChatSceneContext {
  return {
    sessionPremise: 'A private confrontation after a failed handoff.',
    physicalReality: {
      location: 'Archive',
      microLocation: 'Map table',
      timeOfDay: 'EVENING',
      privacy: 'PRIVATE',
      distanceBand: 'CONVERSATIONAL',
      characterActivity: 'Guarding the only exit',
      interactableObjects: ['sealed ledger', 'lamp'],
      ambientConditions: ['rain on slate', 'fading candlelight'],
    },
    preChatMomentum: {
      leadInSummary: 'They regroup after the courier vanished.',
      recentEvents: ['The handoff failed', 'A witness fled'],
      whyNow: 'Waiting until morning would destroy the trail.',
      stakesNow: ['Recover the ledger before the watch finds it'],
      unresolvedPressures: ['Neither trusts the other to tell the full truth'],
    },
    conversationNow: {
      activeThreads: ['the failed handoff', 'the missing ledger'],
      commitments: ['Keep the door barred'],
      sensitiveTopics: ['the witness'],
      lastTurnPressure: 'She demanded a direct answer about the witness.',
    },
  };
}

describe('isChatSceneContext', () => {
  it('accepts a valid scene context payload', () => {
    expect(isChatSceneContext(makeSceneContext())).toBe(true);
  });

  it('rejects payloads missing required scene fields', () => {
    const invalidScene = {
      ...makeSceneContext(),
      conversationNow: undefined,
    };

    expect(isChatSceneContext(invalidScene)).toBe(false);
  });

  it('rejects payloads with invalid nested scene values', () => {
    const invalidScene = {
      ...makeSceneContext(),
      physicalReality: {
        ...makeSceneContext().physicalReality,
        timeOfDay: 'MIDNIGHT',
      },
    };

    expect(isChatSceneContext(invalidScene)).toBe(false);
  });
});
