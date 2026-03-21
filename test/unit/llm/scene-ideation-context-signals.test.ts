import { buildSceneIdeationContextSignals } from '../../../src/llm/scene-ideation-context-signals';
import type { SceneIdeatorContinuationContext } from '../../../src/llm/scene-ideator-types';
import {
  PromiseScope,
  PromiseType,
  ThreadType,
  ThreatType,
  Urgency,
} from '../../../src/models/state';
import type { StoryStructure } from '../../../src/models/story-arc';

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

describe('buildSceneIdeationContextSignals', () => {
  it('derives overdue-thread and pending-promise filters from the shared thresholds', () => {
    const signals = buildSceneIdeationContextSignals(
      createContinuationContext({
        activeState: {
          currentLocation: 'Outer gate',
          activeThreats: [],
          activeConstraints: [],
          openThreads: [
            {
              id: 'td-h',
              text: 'High urgency fallout',
              threadType: ThreadType.DANGER,
              urgency: Urgency.HIGH,
            },
            {
              id: 'td-m',
              text: 'Medium urgency fallout',
              threadType: ThreadType.QUEST,
              urgency: Urgency.MEDIUM,
            },
            {
              id: 'td-l',
              text: 'Low urgency fallout',
              threadType: ThreadType.MYSTERY,
              urgency: Urgency.LOW,
            },
          ],
        },
        threadAges: {
          'td-h': 4,
          'td-m': 7,
          'td-l': 9,
        },
        accumulatedPromises: [
          {
            id: 'pr-high',
            description: 'Urgent promise',
            promiseType: PromiseType.CHEKHOV_GUN,
            scope: PromiseScope.BEAT,
            resolutionHint: 'Fire it now.',
            suggestedUrgency: Urgency.HIGH,
            detectedAtPromiseEpoch: 0,
            age: 1,
          },
          {
            id: 'pr-aged',
            description: 'Aged promise',
            promiseType: PromiseType.DRAMATIC_QUESTION,
            scope: PromiseScope.ACT,
            resolutionHint: 'Cash it out.',
            suggestedUrgency: Urgency.LOW,
            detectedAtPromiseEpoch: 0,
            age: 5,
          },
          {
            id: 'pr-fresh',
            description: 'Fresh promise',
            promiseType: PromiseType.FORESHADOWING,
            scope: PromiseScope.STORY,
            resolutionHint: 'Not yet.',
            suggestedUrgency: Urgency.LOW,
            detectedAtPromiseEpoch: 0,
            age: 2,
          },
        ],
      })
    );

    expect(signals.overdueThreads.map((thread) => thread.id)).toEqual(['td-h', 'td-m']);
    expect(signals.pendingPromises.map((promise) => promise.id)).toEqual(['pr-high', 'pr-aged']);
    expect(signals.hasOverdueThreads).toBe(true);
    expect(signals.hasAgedPromises).toBe(true);
  });

  it('derives speech, identity, and active-threat pressure from continuation context', () => {
    const signals = buildSceneIdeationContextSignals(
      createContinuationContext({
        activeState: {
          currentLocation: 'Outer gate',
          activeThreats: [
            {
              id: 'th-1',
              text: 'Soldiers are closing in.',
              threatType: ThreatType.HOSTILE_AGENT,
            },
          ],
          activeConstraints: [],
          openThreads: [],
        },
        protagonistGuidance: {
          suggestedThoughts: 'I do not know who I am becoming anymore.',
          suggestedSpeech: 'Tell me what I am turning into.',
        },
      })
    );

    expect(signals.hasSpeechPressure).toBe(true);
    expect(signals.hasIdentityGuidance).toBe(true);
    expect(signals.hasActiveThreats).toBe(true);
  });

  it('derives structure-driven identity turns without prompt-specific formatting concerns', () => {
    const signals = buildSceneIdeationContextSignals(
      createContinuationContext({
        structure: createIdentityTurnStructure(),
        accumulatedStructureState: {
          currentActIndex: 0,
          currentMilestoneIndex: 0,
          milestoneProgressions: [],
          pagesInCurrentMilestone: 2,
          pacingNudge: null,
        },
      })
    );

    expect(signals.hasIdentityTurn).toBe(true);
    expect(signals.hasIdentityGuidance).toBe(false);
  });
});
