import {
  formatChatBible,
  formatChatSceneContext,
  formatTurnPlan,
} from '../../../../../src/llm/prompts/chat/chat-prompt-formatters';
import type { ChatBible, ChatSceneContext, TurnPlannerOutput } from '../../../../../src/models/chat/index';

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

function makeChatBible(): ChatBible {
  return {
    sessionPremise: 'A private confrontation about a missing ledger.',
    physicalReality: makeSceneContext().physicalReality,
    preChatMomentum: makeSceneContext().preChatMomentum,
    characterNow: {
      currentObjective: 'Force a useful admission.',
      immediateNeedFromConversation: 'Make him overcommit.',
      emotionalState: 'controlled anger',
      willingnessToEngage: 'GUARDED',
      topicsToAdvance: ['The missing ledger'],
      topicsToProtect: ['The second key'],
    },
    relationshipNow: {
      dynamic: 'fractured allies',
      valence: -1,
      tension: 7,
      leverage: 'Each knows enough to ruin the other',
      whatCharacterBelievesAboutInterlocutor: ['He is stalling for time.'],
    },
    knowledgeNow: {
      knownFacts: ['The ledger is missing.'],
      suspicions: ['He staged the raid.'],
      falseBeliefs: ['He thinks she still trusts him.'],
      secretsRevealed: ['She found the duplicate seal.'],
      secretsKept: ['She already copied the ledger.'],
      knowledgeBoundaries: ['She does not know who ordered the raid.'],
    },
    conversationNow: {
      rollingSummary: null,
      activeThreads: ['ledger'],
      commitments: ['Meet again at dawn'],
      sensitiveTopics: ['the second key'],
      lastTurnPressure: null,
    },
    continuityGuardrails: ['Do not invent new evidence.'],
    responseConstraints: ['Stay immediate and reply-shaped.'],
  };
}

function makeTurnPlan(): TurnPlannerOutput {
  return {
    internalSelfCheck: {
      whatDoIWant: 'Make him expose his lie.',
      whatDoIKnow: 'He reached the vault first.',
      whatAmIHiding: 'I copied the ledger already.',
      howHonestAmI: 'Only as honest as leverage requires.',
    },
    responseGoal: 'Corner him without losing composure.',
    speechAct: 'CHALLENGE',
    honestyMode: 'PARTIAL',
    surfaceEmotion: 'cold focus',
    suppressedEmotion: 'fear',
    subtext: 'I already know enough to hurt you.',
    mustAddress: ['the missing ledger'],
    mustAvoid: ['the copied ledger'],
    blockPlan: ['ACTION', 'SPEECH'],
    actionPlan: [],
    questionBack: null,
    targetLength: 'MEDIUM',
    expectedImpact: {
      relationshipDeltaHint: -1,
      tensionDeltaHint: 2,
      revealsSecret: false,
    },
  };
}

describe('formatChatBible', () => {
  it('renders semantic relationship labels instead of bare numeric scores', () => {
    const formatted = formatChatBible(makeChatBible());

    expect(formatted).toContain('- Valence: cool and guarded');
    expect(formatted).toContain('- Tension: high tension');
    expect(formatted).not.toContain('- Valence: -1');
    expect(formatted).not.toContain('- Tension: 7');
  });
});

describe('formatTurnPlan', () => {
  it('renders semantic delta hints instead of bare numeric deltas', () => {
    const formatted = formatTurnPlan(makeTurnPlan());

    expect(formatted).toContain('- Relationship Delta Hint: slight cooling');
    expect(formatted).toContain('- Tension Delta Hint: major escalation');
    expect(formatted).not.toContain('- Relationship Delta Hint: -1');
    expect(formatted).not.toContain('- Tension Delta Hint: 2');
  });
});
