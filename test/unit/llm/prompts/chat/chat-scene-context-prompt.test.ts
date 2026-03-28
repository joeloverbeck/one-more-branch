import { buildChatSceneContextMessages } from '../../../../../src/llm/prompts/chat/chat-scene-context-prompt';
import type { ChatGenerationContext } from '../../../../../src/llm/chat/chat-generation-context';
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
    immediateObjectives: ['Secure the map', 'Test Tomas'],
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
    rollingSummary: {
      compressedSummary: 'Their last meeting ended with a threat and no proof.',
      keyCommitments: ['Meet before dawn'],
      keyRevelations: ['Iria copied the key'],
      unresolvedQuestions: ['Who warned the courier?'],
      leverageShifts: ['Tomas forced Iria to show how much she knew.'],
      emotionalTrajectory: 'Guarded hostility tightening into direct accusation.',
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
  };
}

describe('buildChatSceneContextMessages', () => {
  it('returns exactly 2 messages with system and user roles', () => {
    const messages = buildChatSceneContextMessages(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('uses a scene-focused system prompt with content policy', () => {
    const systemContent = buildChatSceneContextMessages(makeContext())[0].content;

    expect(systemContent).toContain('objective scene reality');
    expect(systemContent).toContain('Do not analyze character psychology.');
    expect(systemContent).toContain('CONTENT GUIDELINES');
  });

  it('includes scene-relevant sections and excludes relationship and knowledge state', () => {
    const userContent = buildChatSceneContextMessages(makeContext())[1].content;

    expect(userContent).toContain('TARGET CHARACTER DECOMPOSITION');
    expect(userContent).toContain('INTERLOCUTOR CHARACTER PROFILE');
    expect(userContent).toContain('WORLDBUILDING');
    expect(userContent).toContain('PHYSICAL CONTEXT');
    expect(userContent).toContain('PRE-CHAT LEAD-IN');
    expect(userContent).toContain('OLDER CHAT SUMMARY');
    expect(userContent).toContain('RECENT CHAT TURNS');
    expect(userContent).not.toContain('RELATIONSHIP STATE');
    expect(userContent).not.toContain('KNOWLEDGE STATE');
  });

  it('keeps character sections identity-focused instead of full-profile dumps', () => {
    const userContent = buildChatSceneContextMessages(makeContext())[1].content;

    expect(userContent).toContain('Name: Iria Vale');
    expect(userContent).not.toContain('Description: Iria Vale is dangerous and exhausted.');
    expect(userContent).not.toContain('Knowledge Boundaries:');
    expect(userContent).not.toContain('SPEECH FINGERPRINT');
    expect(userContent).not.toContain('Immediate Objectives:');
  });
});
