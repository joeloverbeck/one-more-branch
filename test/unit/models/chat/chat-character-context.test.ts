import type { ChatCharacterContext } from '../../../../src/models/chat/index.js';
import { isChatCharacterContext } from '../../../../src/models/chat/index.js';

function makeCharacterContext(): ChatCharacterContext {
  return {
    characterNow: {
      currentObjective: 'Force a clear admission before the trail goes cold.',
      immediateNeedFromConversation: 'Learn whether he warned the courier.',
      emotionalState: 'controlled suspicion',
      willingnessToEngage: 'GUARDED',
      topicsToAdvance: ['the courier', 'the missing ledger'],
      topicsToProtect: ['the duplicate key'],
    },
    relationshipNow: {
      dynamic: 'strained allies',
      valence: -1,
      tension: 8,
      leverage: 'She knows he reached the archive first.',
      whatCharacterBelievesAboutInterlocutor: ['He is hiding who else was involved.'],
    },
    knowledgeNow: {
      knownFacts: ['The courier never reached the archive exit.'],
      suspicions: ['He redirected the courier on purpose.'],
      falseBeliefs: ['He thinks she has no backup plan.'],
      secretsRevealed: ['She searched his satchel already.'],
      secretsKept: ['She copied the ledger before the handoff.'],
      knowledgeBoundaries: ['She does not know who forged the witness seal.'],
    },
    continuityGuardrails: ['Do not resolve the courier mystery without new pressure.'],
    responseConstraints: ['Keep the reply immediate and physically grounded.'],
  };
}

describe('isChatCharacterContext', () => {
  it('accepts a valid character context payload', () => {
    expect(isChatCharacterContext(makeCharacterContext())).toBe(true);
  });

  it('rejects payloads missing required character fields', () => {
    const invalidCharacter = {
      ...makeCharacterContext(),
      responseConstraints: undefined,
    };

    expect(isChatCharacterContext(invalidCharacter)).toBe(false);
  });

  it('rejects payloads with invalid willingness values', () => {
    const invalidCharacter = {
      ...makeCharacterContext(),
      characterNow: {
        ...makeCharacterContext().characterNow,
        willingnessToEngage: 'CURIOUS',
      },
    };

    expect(isChatCharacterContext(invalidCharacter)).toBe(false);
  });
});
