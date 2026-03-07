import { generateOpeningPage, generatePageWriterOutput } from '../../../src/llm/client';
import { ThreadType, Urgency } from '../../../src/models/state/index';
import { buildMinimalDecomposedCharacter } from '../../fixtures/decomposed';

function createJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

function openRouterBodyFromContent(content: string): Response {
  return createJsonResponse(200, {
    id: 'or-integration',
    choices: [{ message: { content }, finish_reason: 'stop' }],
  });
}

describe('llm client integration (mocked fetch)', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('should generate opening page with structured output', async () => {
    const structured = {
      narrative:
        'You step into the observatory and frozen constellations begin to move as though the sky has noticed your arrival and now waits for your command.',
      choices: [
        {
          text: 'Consult the brass star map',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Climb to the highest platform',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'The abandoned observatory',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [{ text: 'The observatory responds to bloodline magic', factType: 'LAW' }],
      newCharacterCanonFacts: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'awe',
        primaryIntensity: 'strong',
        primaryCause: 'The sky responds to your presence',
        secondaryEmotions: [],
        dominantMotivation: 'Understand the observatory',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      delayedConsequencesCreated: [],
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

    const result = await generateOpeningPage(
      {
        tone: 'mythic science fantasy',
        decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist', { rawDescription: 'A disgraced astronomer' })],
        decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'The night sky has stopped moving', scope: 'global' }], rawWorldbuilding: 'A city where the night sky has stopped moving' },
      },
      { apiKey: 'test-key' }
    );

    expect(result.narrative.length).toBeGreaterThan(100);
  });

  it('should generate continuation writer output when plan is passed as separate argument', async () => {
    const structured = {
      narrative:
        'You crouch behind the brass orrery as gears grind alive and the dome shutters begin to close above you.',
      choices: [
        {
          text: 'Jam the nearest gear with your wrench',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'CONSTRAINT_CHANGE',
        },
        {
          text: 'Follow the moving starlight pattern',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      currentLocation: 'The observatory lower ring',
      threatsAdded: [],
      threatsRemoved: [],
      constraintsAdded: [],
      constraintsRemoved: [],
      threadsAdded: [],
      threadsResolved: [],
      newCanonFacts: [{ text: 'The observatory machinery reacts to movement near the orrery', factType: 'LAW' }],
      newCharacterCanonFacts: [],
      inventoryAdded: [],
      inventoryRemoved: [],
      healthAdded: [],
      healthRemoved: [],
      characterStateChangesAdded: [],
      characterStateChangesRemoved: [],
      protagonistAffect: {
        primaryEmotion: 'urgency',
        primaryIntensity: 'strong',
        primaryCause: 'The dome is sealing while machinery activates',
        secondaryEmotions: [],
        dominantMotivation: 'Stay in control of the room',
      },
      sceneSummary: 'Mechanical defenses activate and force an immediate tactical decision.',
      delayedConsequencesCreated: [],
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

    const result = await generatePageWriterOutput(
      {
        tone: 'mythic science fantasy',
        decomposedCharacters: [buildMinimalDecomposedCharacter('Protagonist', { rawDescription: 'A disgraced astronomer' })],
        decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'The night sky has stopped moving', scope: 'global' }], rawWorldbuilding: 'A city where the night sky has stopped moving' },
        globalCanon: [],
        globalCharacterCanon: {},
        previousNarrative: 'The star map flares and hidden gears begin turning.',
        selectedChoice: 'Run to the central orrery',
        accumulatedInventory: [],
        accumulatedHealth: [],
        accumulatedCharacterState: {},
        activeState: {
          currentLocation: 'The observatory core',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [],
        },
        grandparentNarrative: null,
        ancestorSummaries: [],
        accumulatedPromises: [],
      },
      {
        sceneIntent: 'Escalate pressure with moving machinery and shrinking options.',
        continuityAnchors: ['The observatory is still reacting to your presence.'],
        stateIntents: {
          threats: { add: [], removeIds: [] },
          constraints: { add: [], removeIds: [] },
          threads: {
            add: [
              {
                text: 'Prevent the dome from sealing completely.',
                threadType: ThreadType.DANGER,
                urgency: Urgency.HIGH,
              },
            ],
            resolveIds: [],
          },
          inventory: { add: [], removeIds: [] },
          health: { add: [], removeIds: [] },
          characterState: { add: [], removeIds: [] },
          canon: { worldAdd: [], characterAdd: [] },
        },
        writerBrief: {
          openingLineDirective: 'Open with immediate mechanical motion.',
          mustIncludeBeats: ['The shutters begin to close'],
          forbiddenRecaps: ['Do not restate the entire previous scene'],
        },
        dramaticQuestion: 'Can you escape the observatory before the dome seals?',
      },
      { apiKey: 'test-key' }
    );

    expect(result.narrative.length).toBeGreaterThan(80);
  });
});
