const mockLogPrompt = jest.fn();
const mockLogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  getEntries: jest.fn().mockReturnValue([]),
  clear: jest.fn(),
};

jest.mock('../../../src/logging/index.js', () => ({
  get logger(): typeof mockLogger {
    return mockLogger;
  },
  get logPrompt(): typeof mockLogPrompt {
    return mockLogPrompt;
  },
}));

jest.mock('../../../src/llm/retry.js', () => ({
  withRetry: <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import {
  buildCharPresentationPrompt,
  type CharPresentationPromptContext,
} from '../../../src/llm/prompts/char-presentation-prompt';
import { CHAR_PRESENTATION_GENERATION_SCHEMA } from '../../../src/llm/schemas/char-presentation-schema';
import { generateCharPresentation } from '../../../src/llm/char-presentation-generation';
import type { CharacterWebContext } from '../../../src/models/saved-developed-character';
import {
  CharacterDepth,
  EmotionSalience,
  PipelineRelationshipType,
  RelationshipValence,
  ReplanningPolicy,
  StoryFunction,
  VoiceRegister,
} from '../../../src/models/character-enums';

function createWebContext(overrides?: Partial<CharacterWebContext>): CharacterWebContext {
  return {
    assignment: {
      characterName: 'Kael',
      isProtagonist: false,
      storyFunction: StoryFunction.ANTAGONIST,
      characterDepth: CharacterDepth.ROUND,
      narrativeRole: 'The rival claimant pressing the protagonist toward civil war.',
      conflictRelationship: 'Directly opposes the protagonist while needing their mercy.',
    },
    relationshipArchetypes: [
      {
        fromCharacter: 'Kael',
        toCharacter: 'Mira',
        relationshipType: PipelineRelationshipType.RIVAL,
        valence: RelationshipValence.AMBIVALENT,
        essentialTension: 'They need each other to win but define justice differently.',
      },
    ],
    castDynamicsSummary: 'The cast is bound by betrayal, obligation, and unstable shared goals.',
    ...overrides,
  };
}

function createContext(
  overrides?: Partial<CharPresentationPromptContext>
): CharPresentationPromptContext {
  return {
    webContext: createWebContext(),
    characterKernel: {
      characterName: 'Kael',
      superObjective: 'Reclaim the throne before the kingdom calcifies under a usurper.',
      immediateObjectives: ['Maintain his cover at court', 'Recruit disillusioned captains'],
      primaryOpposition: 'King Edric and the surveillance state around him.',
      stakes: ['His family line dies with him', 'The rebellion becomes pure slaughter'],
      constraints: ['His sister is hidden among civilians', 'He refuses to become a butcher'],
      pressurePoint: 'Any threat to his sister makes him reckless.',
    },
    tridimensionalProfile: {
      characterName: 'Kael',
      physiology: 'Lean, scarred, sleep-starved, carrying a soldier’s economy of motion.',
      sociology:
        'Raised in a deposed royal household, then hardened among smugglers and deserters.',
      psychology:
        'Hypervigilant, proud, and incapable of separating mercy from strategic weakness.',
      derivationChain:
        'Dispossession plus concealment produced a man who performs calm while expecting betrayal.',
      coreTraits: ['controlled', 'vindictive', 'protective', 'strategic', 'ashamed'],
    },
    agencyModel: {
      characterName: 'Kael',
      replanningPolicy: ReplanningPolicy.ON_NEW_INFORMATION,
      emotionSalience: EmotionSalience.HIGH,
      coreBeliefs: ['Mercy without leverage invites ruin', 'The throne is a duty, not a prize'],
      desires: ['Restore his house', 'Keep his sister alive'],
      currentIntentions: ['Stay embedded at court', 'Delay open war until the army fractures'],
      falseBeliefs: ['Mira will always stop him before he crosses the line'],
      decisionPattern:
        'He gathers advantages patiently, then makes abrupt irreversible moves when family is threatened.',
    },
    deepRelationships: {
      relationships: [
        {
          fromCharacter: 'Kael',
          toCharacter: 'Mira',
          relationshipType: PipelineRelationshipType.RIVAL,
          valence: RelationshipValence.AMBIVALENT,
          numericValence: -2,
          history:
            'They survived the purge separately, reunited under false names, and built a rebellion on compromise.',
          currentTension:
            'Mira wants legitimacy through coalition; Kael keeps preparing for a decisive purge.',
          leverage:
            'Mira knows where Kael’s sister is hidden, while Kael knows Mira’s bloodline could shatter her alliances.',
        },
      ],
      secrets: ['Kael suspects his father ordered atrocities that justify the rebellion against him.'],
      personalDilemmas: [
        'If he tells Mira the truth about his father, he may lose the only person restraining him.',
      ],
    },
    ...overrides,
  };
}

function validPresentationResponseRaw(
  overrides?: Partial<Record<string, unknown>>
): Record<string, unknown> {
  return {
    characterName: 'Kael',
    voiceRegister: 'FORMAL',
    speechFingerprint: {
      catchphrases: ['Be precise.', 'Name the cost.'],
      vocabularyProfile:
        'Controlled and formal, with military precision and occasional aristocratic turns of phrase.',
      sentencePatterns:
        'Usually concise declaratives, but under pressure he shifts into clipped commands and loaded questions.',
      verbalTics: ['Listen.', 'No.'],
      dialogueSamples: [
        'You mistake restraint for surrender.',
        'If we are paying in blood, I want the ledger honest.',
        'Do not ask me for faith when evidence is already burning.',
      ],
      metaphorFrames:
        'He treats politics like siegecraft: pressure lines, weak gates, timed breaches, and costly attrition.',
      antiExamples: [
        'Hey, it will all work out somehow.',
        'I just follow my heart and hope for the best.',
      ],
      discourseMarkers: ['Listen.', 'Set that aside.', 'More importantly,'],
      registerShifts:
        'He stays formal in public, goes razor-terse under stress, and becomes unexpectedly gentle with his sister.',
    },
    appearance:
      'Lean and severe, with an old cheek scar and the disciplined stillness of someone used to being watched.',
    knowledgeBoundaries:
      'Kael knows the court’s military fractures and Mira’s coalition weaknesses, but he does not know which captains are double agents and misreads how much mercy the public will tolerate.',
    conflictPriority:
      'When survival, loyalty, and legitimacy collide, Kael protects his sister first and the throne second.',
    ...overrides,
  };
}

function createMockResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        choices: [
          {
            message: {
              content: JSON.stringify(payload),
            },
          },
        ],
      }),
  } as unknown as Response;
}

describe('buildCharPresentationPrompt', () => {
  it('includes web context plus Stage 1-4 outputs', () => {
    const messages = buildCharPresentationPrompt(createContext());

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain('CHARACTER ROLE IN CAST:');
    expect(messages[1].content).toContain('RELATIONSHIP ARCHETYPES:');
    expect(messages[1].content).toContain('CHARACTER KERNEL (from Stage 1):');
    expect(messages[1].content).toContain('TRIDIMENSIONAL PROFILE (from Stage 2):');
    expect(messages[1].content).toContain('AGENCY MODEL (from Stage 3):');
    expect(messages[1].content).toContain('DEEP RELATIONSHIPS (from Stage 4):');
    expect(messages[1].content).toContain('Replanning Policy: ON_NEW_INFORMATION');
    expect(messages[1].content).toContain('Personal Dilemmas: If he tells Mira the truth');
  });

  it('includes optional summaries and notes when provided', () => {
    const messages = buildCharPresentationPrompt(
      createContext({
        kernelSummary: 'A story about power and inherited guilt.',
        conceptSummary: 'Dark court-intrigue fantasy.',
        userNotes: 'Keep the voice sharp and unsentimental.',
      })
    );

    expect(messages[1].content).toContain('STORY KERNEL:\nA story about power and inherited guilt.');
    expect(messages[1].content).toContain('CONCEPT:\nDark court-intrigue fantasy.');
    expect(messages[1].content).toContain(
      'USER NOTES:\nKeep the voice sharp and unsentimental.'
    );
  });
});

describe('CHAR_PRESENTATION_GENERATION_SCHEMA', () => {
  it('has the correct top-level structure and required fields', () => {
    expect(CHAR_PRESENTATION_GENERATION_SCHEMA.type).toBe('json_schema');
    expect(CHAR_PRESENTATION_GENERATION_SCHEMA.json_schema.name).toBe(
      'char_presentation_generation'
    );
    expect(CHAR_PRESENTATION_GENERATION_SCHEMA.json_schema.strict).toBe(true);

    const schema = CHAR_PRESENTATION_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    expect(schema['type']).toBe('object');
    expect(schema['required']).toEqual([
      'characterName',
      'voiceRegister',
      'speechFingerprint',
      'appearance',
      'knowledgeBoundaries',
      'conflictPriority',
    ]);
  });

  it('defines the VoiceRegister enum correctly', () => {
    const schema = CHAR_PRESENTATION_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    const properties = schema['properties'] as Record<string, unknown>;

    expect((properties['voiceRegister'] as Record<string, unknown>)['anyOf']).toEqual([
      {
        type: 'string',
        enum: ['FORMAL', 'NEUTRAL', 'COLLOQUIAL', 'CEREMONIAL', 'TECHNICAL', 'VULGAR', 'POETIC'],
      },
    ]);
  });

  it('defines the nested speech fingerprint structure', () => {
    const schema = CHAR_PRESENTATION_GENERATION_SCHEMA.json_schema.schema as Record<
      string,
      unknown
    >;
    const properties = schema['properties'] as Record<string, unknown>;
    const speechFingerprint = properties['speechFingerprint'] as Record<string, unknown>;
    const speechProperties = speechFingerprint['properties'] as Record<string, unknown>;

    expect(speechFingerprint['type']).toBe('object');
    expect(speechFingerprint['required']).toEqual([
      'catchphrases',
      'vocabularyProfile',
      'sentencePatterns',
      'verbalTics',
      'dialogueSamples',
      'metaphorFrames',
      'antiExamples',
      'discourseMarkers',
      'registerShifts',
    ]);
    expect(speechProperties['catchphrases']).toBeDefined();
    expect(speechProperties['vocabularyProfile']).toBeDefined();
    expect(speechProperties['dialogueSamples']).toBeDefined();
    expect(speechProperties['registerShifts']).toBeDefined();
  });
});

describe('generateCharPresentation', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls OpenRouter with the Stage 5 schema and returns a typed result', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(validPresentationResponseRaw()));

    const result = await generateCharPresentation(createContext(), 'test-api-key');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchCall[1].body as string) as Record<string, unknown>;

    expect(body['response_format']).toEqual(CHAR_PRESENTATION_GENERATION_SCHEMA);
    expect(body['messages']).toHaveLength(2);
    expect(body['model']).toBeDefined();

    expect(result.textualPresentation.characterName).toBe('Kael');
    expect(result.textualPresentation.voiceRegister).toBe(VoiceRegister.FORMAL);
    expect(result.textualPresentation.speechFingerprint.dialogueSamples).toHaveLength(3);
    expect(result.textualPresentation.appearance).toContain('old cheek scar');
    expect(result.textualPresentation.knowledgeBoundaries).toContain('does not know');
    expect(result.textualPresentation.conflictPriority).toContain('protects his sister first');
    expect(result.rawResponse).toBeDefined();
  });

  it('rejects invalid VoiceRegister enum values', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      createMockResponse(validPresentationResponseRaw({ voiceRegister: 'CASUAL' }))
    );

    await expect(generateCharPresentation(createContext(), 'test-api-key')).rejects.toThrow(
      /invalid voiceRegister/
    );
  });

  it('rejects malformed nested speech fingerprint data', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      createMockResponse(
        validPresentationResponseRaw({
          speechFingerprint: {
            ...validPresentationResponseRaw().speechFingerprint,
            dialogueSamples: 'Not an array',
          },
        })
      )
    );

    await expect(generateCharPresentation(createContext(), 'test-api-key')).rejects.toThrow(
      /speechFingerprint\.dialogueSamples must be an array/
    );
  });

  it('logs the prompt with the charPresentation stage key', async () => {
    global.fetch = jest.fn().mockResolvedValue(createMockResponse(validPresentationResponseRaw()));

    await generateCharPresentation(createContext(), 'test-api-key');

    expect(mockLogPrompt).toHaveBeenCalledWith(
      mockLogger,
      'charPresentation',
      expect.any(Array)
    );
  });
});
