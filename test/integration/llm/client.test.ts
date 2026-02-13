import { generateOpeningPage, generatePageWriterOutput } from '../../../src/llm/client';
import { ThreadType, Urgency } from '../../../src/models/state/index';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';

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
      newCanonFacts: ['The observatory responds to bloodline magic'],
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
      isEnding: false,
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

    const result = await generateOpeningPage(
      {
        characterConcept: 'A disgraced astronomer',
        worldbuilding: 'A city where the night sky has stopped moving',
        tone: 'mythic science fantasy',
      },
      { apiKey: 'test-key' }
    );

    expect(result.narrative.length).toBeGreaterThan(100);
    expect(result.choices.length).toBeGreaterThanOrEqual(2);
    expect(result.choices.length).toBeLessThanOrEqual(5);
    expect(result.isEnding).toBe(false);
  });

  it('should enforce choice constraints via Zod validation', async () => {
    const invalidStructured = {
      narrative:
        'You step into the observatory and frozen constellations begin to move as though the sky has noticed your arrival and now waits for your command.',
      choices: [
        {
          text: 'Consult the brass star map',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'consult the brass star map',
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
      newCanonFacts: ['The observatory responds to bloodline magic'],
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
      isEnding: false,
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(invalidStructured)));

    const promise = generateOpeningPage(
      {
        characterConcept: 'A disgraced astronomer',
        worldbuilding: 'A city where the night sky has stopped moving',
        tone: 'mythic science fantasy',
      },
      { apiKey: 'test-key' }
    );

    // Attach rejection handler early to prevent unhandled rejection detection
    const expectation = expect(promise).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    // Advance through retry delays: 1000ms then 2000ms
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
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
      newCanonFacts: ['The observatory machinery reacts to movement near the orrery'],
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
      isEnding: false,
    };

    fetchMock.mockResolvedValue(openRouterBodyFromContent(JSON.stringify(structured)));

    const result = await generatePageWriterOutput(
      {
        characterConcept: 'A disgraced astronomer',
        worldbuilding: 'A city where the night sky has stopped moving',
        tone: 'mythic science fantasy',
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
        choiceIntents: [
          {
            hook: 'Jam the nearest gear with your wrench',
            choiceType: ChoiceType.TACTICAL_APPROACH,
            primaryDelta: PrimaryDelta.CONSTRAINT_CHANGE,
          },
          {
            hook: 'Follow the moving starlight pattern',
            choiceType: ChoiceType.INVESTIGATION,
            primaryDelta: PrimaryDelta.INFORMATION_REVEALED,
          },
        ],
      },
      { apiKey: 'test-key' }
    );

    expect(result.narrative.length).toBeGreaterThan(80);
    expect(result.choices).toHaveLength(2);
    expect(result.isEnding).toBe(false);
  });
});
