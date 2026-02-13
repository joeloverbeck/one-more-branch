import { validateWriterResponse } from '../../../src/llm/schemas/writer-response-transformer';
import { buildFirstPage, createEmptyStructureContext } from '../../../src/engine/page-builder';
import { reconcileState } from '../../../src/engine/state-reconciler';
import { ConstraintType, ThreatType } from '../../../src/models/state/index';
import type { PagePlan } from '../../../src/llm/planner-types';

/**
 * Integration test: verifies that creative writer responses flow through
 * writer validation -> deterministic reconciliation -> page builder
 * and result in non-empty activeStateChanges and accumulatedActiveState on the page.
 */
describe('Active state pipeline integration', () => {
  const rawLlmResponse = {
    narrative:
      'You step into the burning tavern. Flames lick the wooden beams above as the innkeeper screams for help. The heat is unbearable.',
    choices: [
      {
        text: 'Rush to save the innkeeper',
        choiceType: 'TACTICAL_APPROACH',
        primaryDelta: 'GOAL_SHIFT',
      },
      {
        text: 'Flee through the back door',
        choiceType: 'AVOIDANCE_RETREAT',
        primaryDelta: 'LOCATION_CHANGE',
      },
      {
        text: 'Search for water',
        choiceType: 'INVESTIGATION',
        primaryDelta: 'INFORMATION_REVEALED',
      },
    ],
    protagonistAffect: {
      primaryEmotion: 'fear',
      primaryIntensity: 'strong',
      primaryCause: 'The building is collapsing around you',
      secondaryEmotions: [{ emotion: 'determination', cause: 'Someone needs your help' }],
      dominantMotivation: 'Save the innkeeper before the roof caves in',
    },
    sceneSummary: 'Test summary of the scene events and consequences.',
    isEnding: false,
  };

  const pagePlan: PagePlan = {
    sceneIntent: 'Escape the burning tavern while trying to save the innkeeper.',
    continuityAnchors: ['The tavern is on fire', 'The innkeeper is trapped'],
    stateIntents: {
      currentLocation: 'Burning tavern',
      threats: {
        add: [
          {
            text: 'The tavern is engulfed in flames and could collapse at any moment',
            threatType: ThreatType.ENVIRONMENTAL,
          },
        ],
        removeIds: [],
      },
      constraints: {
        add: [
          {
            text: 'Thick smoke limits visibility to a few feet',
            constraintType: ConstraintType.ENVIRONMENTAL,
          },
        ],
        removeIds: [],
      },
      threads: {
        add: [
          {
            text: 'The innkeeper is trapped behind the bar',
            threadType: 'INFORMATION',
            urgency: 'MEDIUM',
          },
        ],
        resolveIds: [],
      },
      inventory: { add: [], removeIds: [] },
      health: { add: ['Your lungs burn from smoke inhalation'], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: {
        worldAdd: ['The Golden Flagon tavern is the oldest building in Millhaven'],
        characterAdd: [{ characterName: 'Innkeeper Bram', facts: ['Elderly man with a limp'] }],
      },
    },
    writerBrief: {
      openingLineDirective: 'Start with immediate danger in the burning tavern.',
      mustIncludeBeats: ['Fire spreads rapidly', 'Innkeeper calls for help'],
      forbiddenRecaps: ['Do not recap previous pages'],
    },
    dramaticQuestion: 'Can you save the innkeeper before the roof caves in?',
    choiceIntents: [
      { hook: 'Rescue the innkeeper', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'GOAL_SHIFT' },
      {
        hook: 'Retreat through the back door',
        choiceType: 'AVOIDANCE_RETREAT',
        primaryDelta: 'LOCATION_CHANGE',
      },
      { hook: 'Find water to fight the fire', choiceType: 'INVESTIGATION', primaryDelta: 'INFORMATION_REVEALED' },
    ],
  };

  it('should populate activeStateChanges and accumulatedActiveState through the full pipeline', () => {
    // Step 1: Validate + transform through writer-response-transformer
    const generationResult = validateWriterResponse(rawLlmResponse, JSON.stringify(rawLlmResponse));

    // Writer output should remain creative-only
    expect(generationResult.narrative.length).toBeGreaterThan(0);
    expect(generationResult.choices).toHaveLength(3);

    // Step 2: Reconcile deterministic state from planner intents
    const reconciliation = reconcileState(pagePlan, generationResult, {
      currentLocation: '',
      threats: [],
      constraints: [],
      threads: [],
      inventory: [],
      health: [],
      characterState: [],
    });
    expect(reconciliation.reconciliationDiagnostics).toEqual([]);

    // Step 3: Build page via page-builder
    const context = createEmptyStructureContext();
    const page = buildFirstPage(
      {
        ...generationResult,
        ...reconciliation,
      },
      context
    );

    // Step 4: Verify page has populated activeStateChanges
    expect(page.activeStateChanges.newLocation).toBe('Burning tavern');
    expect(page.activeStateChanges.threatsAdded).toEqual([
      {
        text: 'The tavern is engulfed in flames and could collapse at any moment',
        threatType: ThreatType.ENVIRONMENTAL,
      },
    ]);
    expect(page.activeStateChanges.constraintsAdded).toEqual([
      {
        text: 'Thick smoke limits visibility to a few feet',
        constraintType: ConstraintType.ENVIRONMENTAL,
      },
    ]);
    expect(page.activeStateChanges.threadsAdded).toEqual([
      {
        text: 'The innkeeper is trapped behind the bar',
        threadType: 'INFORMATION',
        urgency: 'MEDIUM',
      },
    ]);

    // Step 5: Verify accumulated active state was computed (applied to empty parent)
    expect(page.accumulatedActiveState.currentLocation).toBe('Burning tavern');
    expect(page.accumulatedActiveState.activeThreats).toHaveLength(1);
    expect(page.accumulatedActiveState.activeThreats[0]?.id).toBe('th-1');
    expect(page.accumulatedActiveState.activeThreats[0]?.text).toBe(
      'The tavern is engulfed in flames and could collapse at any moment'
    );
    expect(page.accumulatedActiveState.activeThreats[0]?.threatType).toBe(
      ThreatType.ENVIRONMENTAL
    );
    expect(page.accumulatedActiveState.activeConstraints).toHaveLength(1);
    expect(page.accumulatedActiveState.activeConstraints[0]?.id).toBe('cn-1');
    expect(page.accumulatedActiveState.activeConstraints[0]?.text).toBe(
      'Thick smoke limits visibility to a few feet'
    );
    expect(page.accumulatedActiveState.activeConstraints[0]?.constraintType).toBe(
      ConstraintType.ENVIRONMENTAL
    );
    expect(page.accumulatedActiveState.openThreads).toHaveLength(1);
    expect(page.accumulatedActiveState.openThreads[0]?.id).toBe('td-1');
    expect(page.accumulatedActiveState.openThreads[0]?.text).toBe(
      'The innkeeper is trapped behind the bar'
    );
  });

  it('should populate active state through the writer pipeline', () => {
    // Writer responses don't include beat/deviation fields
    const writerLlmResponse = {
      narrative:
        'You step into the burning tavern. Flames lick the wooden beams above as the innkeeper screams for help. The heat is unbearable.',
      choices: [
        {
          text: 'Rush to save the innkeeper',
          choiceType: 'TACTICAL_APPROACH',
          primaryDelta: 'GOAL_SHIFT',
        },
        {
          text: 'Flee through the back door',
          choiceType: 'AVOIDANCE_RETREAT',
          primaryDelta: 'LOCATION_CHANGE',
        },
        {
          text: 'Search for water',
          choiceType: 'INVESTIGATION',
          primaryDelta: 'INFORMATION_REVEALED',
        },
      ],
      protagonistAffect: {
        primaryEmotion: 'fear',
        primaryIntensity: 'strong',
        primaryCause: 'Fire everywhere',
        secondaryEmotions: [],
        dominantMotivation: 'Survive',
      },
      sceneSummary: 'Test summary of the scene events and consequences.',
      isEnding: false,
    };

    const writerResult = validateWriterResponse(
      writerLlmResponse,
      JSON.stringify(writerLlmResponse)
    );

    expect(writerResult.narrative.length).toBeGreaterThan(0);
    expect(writerResult.choices).toHaveLength(3);
    expect('currentLocation' in (writerResult as Record<string, unknown>)).toBe(false);
  });

  it('should default to empty active state when LLM returns empty arrays', () => {
    const emptyCreativeResponse = {
      ...rawLlmResponse,
    };

    const generationResult = validateWriterResponse(
      emptyCreativeResponse,
      JSON.stringify(emptyCreativeResponse)
    );

    const noMutationPlan: PagePlan = {
      ...pagePlan,
      stateIntents: {
        ...pagePlan.stateIntents,
        currentLocation: '',
        threats: { add: [], removeIds: [] },
        constraints: { add: [], removeIds: [] },
        threads: { add: [], resolveIds: [] },
      },
    };
    const reconciliation = reconcileState(noMutationPlan, generationResult, {
      currentLocation: '',
      threats: [],
      constraints: [],
      threads: [],
      inventory: [],
      health: [],
      characterState: [],
    });

    const context = createEmptyStructureContext();
    const page = buildFirstPage({ ...generationResult, ...reconciliation }, context);

    expect(page.activeStateChanges.newLocation).toBeNull();
    expect(page.activeStateChanges.threatsAdded).toEqual([]);
    expect(page.accumulatedActiveState.activeThreats).toEqual([]);
    expect(page.accumulatedActiveState.activeConstraints).toEqual([]);
    expect(page.accumulatedActiveState.openThreads).toEqual([]);
  });
});
