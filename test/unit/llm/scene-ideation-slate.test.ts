import { buildSceneIdeationSlate } from '../../../src/llm/scene-ideation-slate';
import {
  DEFAULT_OPENING_SCENE_IDEA_LANES,
  DEFAULT_SCENE_IDEA_COUNT,
} from '../../../src/llm/scene-ideation-contract';
import type {
  SceneIdeatorContinuationContext,
  SceneIdeatorOpeningContext,
} from '../../../src/llm/scene-ideator-types';
import { PromiseScope, PromiseType, ThreadType, Urgency } from '../../../src/models/state';
import type { StoryStructure } from '../../../src/models/story-arc';

function createOpeningContext(): SceneIdeatorOpeningContext {
  return {
    mode: 'opening',
    tone: 'dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: {
      rawWorldbuilding: 'A haunted empire.',
      facts: [],
    },
  };
}

function createContinuationContext(
  overrides: Partial<SceneIdeatorContinuationContext> = {}
): SceneIdeatorContinuationContext {
  return {
    mode: 'continuation',
    tone: 'dark fantasy',
    decomposedCharacters: [],
    decomposedWorld: {
      rawWorldbuilding: 'A haunted empire.',
      facts: [],
    },
    previousNarrative: 'The gates of the city slammed shut.',
    selectedChoice: 'Demand answers from the captain.',
    activeState: {
      currentLocation: 'Outer gate',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    ancestorSummaries: [],
    accumulatedPromises: [],
    accumulatedInventory: [],
    accumulatedHealth: [],
    ...overrides,
  };
}

function createIdentityTurnStructure(): StoryStructure {
  return {
    acts: [
      {
        id: 'act-1',
        name: 'Act 1',
        objective: 'Force the hero to confront what they are becoming.',
        stakes: 'Everything frays.',
        entryCondition: 'The city is tense.',
        actQuestion: 'Who will the hero become?',
        exitReversal: 'The hero crosses a line.',
        promiseTargets: [],
        obligationTargets: [],
        milestones: [
          {
            id: 'milestone-1',
            name: 'Mirror Test',
            description: 'The hero faces who they are becoming.',
            objective: 'Expose identity pressure.',
            causalLink: 'The prior violence stains the hero.',
            exitCondition: 'The hero chooses what self to inhabit.',
            role: 'reflection',
            escalationType: null,
            secondaryEscalationType: null,
            crisisType: null,
            expectedGapMagnitude: null,
            isMidpoint: false,
            midpointType: null,
            uniqueScenarioHook: null,
            approachVectors: null,
            setpieceSourceIndex: null,
            obligatorySceneTag: null,
          },
        ],
      },
    ],
    overallTheme: 'Identity costs blood.',
    premise: 'A fallen heir must decide what kind of monster to become.',
    openingImage: 'Rain on stone.',
    closingImage: 'A crown in mud.',
    pacingBudget: {
      targetPagesMin: 20,
      targetPagesMax: 25,
    },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The gate falls.' },
      midpoint: { actIndex: 0, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
      climax: { actIndex: 0, description: 'The city burns.' },
      signatureScenarioPlacement: null,
    },
    generatedAt: new Date('2026-03-18T00:00:00.000Z'),
  };
}

describe('buildSceneIdeationSlate', () => {
  it('returns the default opening slate with 5 unique lanes', () => {
    const slate = buildSceneIdeationSlate(createOpeningContext());

    expect(slate.targetOptionCount).toBe(DEFAULT_SCENE_IDEA_COUNT);
    expect(slate.slots).toHaveLength(DEFAULT_SCENE_IDEA_COUNT);
    expect(slate.slots.map((slot) => slot.lane)).toEqual([...DEFAULT_OPENING_SCENE_IDEA_LANES]);
    expect(new Set(slate.slots.map((slot) => slot.lane)).size).toBe(DEFAULT_SCENE_IDEA_COUNT);
  });

  it('moves consequence/payoff earlier when overdue threads are present', () => {
    const baselineSlate = buildSceneIdeationSlate(createContinuationContext());
    const pressuredSlate = buildSceneIdeationSlate(
      createContinuationContext({
        activeState: {
          currentLocation: 'Outer gate',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            {
              id: 'td-1',
              text: 'Expose the captain’s lie',
              threadType: ThreadType.INFORMATION,
              urgency: Urgency.HIGH,
            },
          ],
        },
        threadAges: { 'td-1': 4 },
      })
    );

    const baselineIndex = baselineSlate.slots.findIndex(
      (slot) => slot.lane === 'CONSEQUENCE_OR_PAYOFF'
    );
    const pressuredIndex = pressuredSlate.slots.findIndex(
      (slot) => slot.lane === 'CONSEQUENCE_OR_PAYOFF'
    );

    expect(pressuredIndex).toBeLessThan(baselineIndex);
    expect(pressuredSlate.slots[pressuredIndex]?.requiredSignals).toContain('overdueThreads');
  });

  it('moves consequence/payoff earlier when aged promises are present', () => {
    const baselineSlate = buildSceneIdeationSlate(createContinuationContext());
    const pressuredSlate = buildSceneIdeationSlate(
      createContinuationContext({
        accumulatedPromises: [
          {
            id: 'pr-1',
            description: 'The captain owes a confession.',
            promiseType: PromiseType.DRAMATIC_QUESTION,
            scope: PromiseScope.BEAT,
            resolutionHint: 'Force the captain to answer in public.',
            suggestedUrgency: Urgency.LOW,
            detectedAtPromiseEpoch: 0,
            age: 5,
          },
        ],
      })
    );

    const baselineIndex = baselineSlate.slots.findIndex(
      (slot) => slot.lane === 'CONSEQUENCE_OR_PAYOFF'
    );
    const pressuredIndex = pressuredSlate.slots.findIndex(
      (slot) => slot.lane === 'CONSEQUENCE_OR_PAYOFF'
    );

    expect(pressuredIndex).toBeLessThan(baselineIndex);
    expect(pressuredSlate.slots[pressuredIndex]?.requiredSignals).toContain('agedPromises');
  });

  it('moves relational realignment earlier when protagonist speech pressure is present', () => {
    const baselineSlate = buildSceneIdeationSlate(createContinuationContext());
    const pressuredSlate = buildSceneIdeationSlate(
      createContinuationContext({
        protagonistGuidance: {
          suggestedSpeech: 'Tell me who you sold us out to.',
        },
      })
    );

    const baselineIndex = baselineSlate.slots.findIndex(
      (slot) => slot.lane === 'RELATIONAL_REALIGNMENT'
    );
    const pressuredIndex = pressuredSlate.slots.findIndex(
      (slot) => slot.lane === 'RELATIONAL_REALIGNMENT'
    );

    expect(pressuredIndex).toBeLessThan(baselineIndex);
    expect(pressuredSlate.slots[pressuredIndex]?.requiredSignals).toContain(
      'protagonistSuggestedSpeech'
    );
  });

  it('replaces exactly one default lane with identity/transformation when identity-heavy context supports it', () => {
    const baselineSlate = buildSceneIdeationSlate(createContinuationContext());
    const identitySlate = buildSceneIdeationSlate(
      createContinuationContext({
        structure: createIdentityTurnStructure(),
        accumulatedStructureState: {
          currentActIndex: 0,
          currentMilestoneIndex: 0,
          milestoneProgressions: [],
          pagesInCurrentMilestone: 2,
          pacingNudge: null,
        },
        protagonistGuidance: {
          suggestedThoughts: 'I do not know who I am becoming anymore.',
        },
      })
    );

    const baselineLanes = baselineSlate.slots.map((slot) => slot.lane);
    const identityLanes = identitySlate.slots.map((slot) => slot.lane);
    const removedBaselineLanes = baselineLanes.filter((lane) => !identityLanes.includes(lane));

    expect(identityLanes).toContain('IDENTITY_OR_TRANSFORMATION');
    expect(identityLanes).toHaveLength(DEFAULT_SCENE_IDEA_COUNT);
    expect(new Set(identityLanes).size).toBe(DEFAULT_SCENE_IDEA_COUNT);
    expect(removedBaselineLanes).toHaveLength(1);
    expect(identitySlate.slots.find((slot) => slot.lane === 'IDENTITY_OR_TRANSFORMATION')?.requiredSignals).toEqual(
      expect.arrayContaining(['structureIdentityTurn', 'identityGuidance'])
    );
  });

  it('does not introduce identity/transformation when continuation context is not identity-heavy', () => {
    const slate = buildSceneIdeationSlate(createContinuationContext());

    expect(slate.slots.map((slot) => slot.lane)).not.toContain('IDENTITY_OR_TRANSFORMATION');
  });
});
