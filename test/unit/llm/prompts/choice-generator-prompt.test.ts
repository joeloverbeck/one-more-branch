import {
  buildChoiceGeneratorPrompt,
  type ChoiceGeneratorContext,
} from '../../../../src/llm/prompts/choice-generator-prompt';
import { ThreatType, ThreadType, Urgency } from '../../../../src/models/state/keyed-entry';
import type { ProtagonistAffect } from '../../../../src/models/protagonist-affect';
import type { ActiveState } from '../../../../src/models/state';
import type { StoryStructure, StoryAct, AccumulatedStructureState, StoryMilestone } from '../../../../src/models/story-arc';
import type { StorySpine } from '../../../../src/models/story-spine';
import { buildMinimalDecomposedCharacter } from '../../../fixtures/decomposed';

function makeAffect(): ProtagonistAffect {
  return {
    primaryEmotion: 'fear',
    primaryIntensity: 'moderate',
    primaryCause: 'the shadow moved',
    secondaryEmotions: [],
    dominantMotivation: 'survival',
  };
}

function makeActiveState(overrides: Partial<ActiveState> = {}): ActiveState {
  return {
    currentLocation: 'Dark alley',
    activeThreats: [],
    activeConstraints: [],
    openThreads: [],
    ...overrides,
  };
}

function makeMinimalBeat(overrides: Partial<StoryMilestone> = {}): StoryMilestone {
  return {
    id: 'milestone-1',
    name: 'The Discovery',
    description: 'Finding the hidden door',
    objective: 'Introduce the mystery',
    causalLink: 'follows from opening',
    exitCondition: '',
    role: 'setup',
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
    ...overrides,
  };
}

function makeContext(overrides: Partial<ChoiceGeneratorContext> = {}): ChoiceGeneratorContext {
  return {
    narrative: 'The door creaked open, revealing a dark corridor.',
    sceneSummary: 'The protagonist found a hidden passage.',
    protagonistAffect: makeAffect(),
    dramaticQuestion: 'Will Kael enter the unknown?',
    activeState: makeActiveState(),
    tone: 'dark fantasy',
    decomposedCharacters: [
      buildMinimalDecomposedCharacter('Kael', { coreTraits: ['brave', 'impulsive'] }),
    ],
    choiceGuidance: 'basic',
    ...overrides,
  };
}

describe('buildChoiceGeneratorPrompt', () => {
  it('returns system and user messages', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message establishes choice architect role', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[0].content).toContain('choice architect');
    expect(messages[0].content).toContain('CONTENT GUIDELINES');
  });

  it('user message includes the written narrative', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[1].content).toContain('The door creaked open');
  });

  it('user message includes scene summary', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[1].content).toContain('hidden passage');
  });

  it('user message includes dramatic question and need vs want rule', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());
    const content = messages[1].content;

    expect(content).toContain('DRAMATIC QUESTION');
    expect(content).toContain('Will Kael enter the unknown?');
    expect(content).toContain('NEED VS WANT RULE');
  });

  it('user message includes protagonist info', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[1].content).toContain('PROTAGONIST: Kael');
    expect(messages[1].content).toContain('brave, impulsive');
  });

  it('user message includes protagonist affect', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[1].content).toContain('fear');
    expect(messages[1].content).toContain('moderate');
    expect(messages[1].content).toContain('survival');
  });

  it('user message includes active state sections', () => {
    const context = makeContext({
      activeState: makeActiveState({
        currentLocation: 'Haunted library',
        activeThreats: [
          { id: 'th-1', text: 'Ghost patrol', threatType: ThreatType.CREATURE },
        ],
        openThreads: [
          { id: 'ot-1', text: 'Missing key', threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH },
        ],
      }),
    });
    const messages = buildChoiceGeneratorPrompt(context);

    expect(messages[1].content).toContain('Haunted library');
    expect(messages[1].content).toContain('Ghost patrol');
    expect(messages[1].content).toContain('Missing key');
  });

  it('includes STRICT_CHOICE_GUIDELINES when choiceGuidance is strict', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext({ choiceGuidance: 'strict' }));

    expect(messages[1].content).toContain('CHOICE REQUIREMENTS');
    expect(messages[1].content).toContain('DIVERGENCE ENFORCEMENT');
  });

  it('omits STRICT_CHOICE_GUIDELINES when choiceGuidance is basic', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext({ choiceGuidance: 'basic' }));

    expect(messages[1].content).not.toContain('DIVERGENCE ENFORCEMENT');
  });

  it('includes spine section when spine is provided', () => {
    const spine: StorySpine = {
      storySpineType: 'QUEST',
      conflictAxis: 'DUTY_VS_DESIRE',
      conflictType: 'PERSON_VS_SELF',
      characterArcType: 'POSITIVE_CHANGE',
      centralDramaticQuestion: 'Can Kael overcome his past?',
      protagonistNeedVsWant: {
        need: 'acceptance',
        want: 'revenge',
        dynamic: 'DIVERGENT',
      },
      primaryAntagonisticForce: {
        description: 'The guild master',
        pressureMechanism: 'blackmail',
      },
      wantNeedCollisionPoint: 'final confrontation',
      protagonistDeepestFear: 'being alone',
      toneFeel: ['grim', 'tense'],
      toneAvoid: ['whimsical'],
    };
    const messages = buildChoiceGeneratorPrompt(makeContext({ spine }));

    expect(messages[1].content).toContain('STORY SPINE');
    expect(messages[1].content).toContain('Can Kael overcome his past?');
  });

  it('includes milestone objective when structure and state are provided', () => {
    const structure: StoryStructure = {
      acts: [
        {
          id: 'act-1',
          name: 'Act I',
          objective: 'Establish the world',
          stakes: 'survival',
          entryCondition: 'story begins',
          actQuestion: '',
          exitReversal: '',
          promiseTargets: [],
          obligationTargets: [],
          milestones: [makeMinimalBeat()],
        },
      ],
      overallTheme: 'redemption',
      premise: 'A fallen knight seeks redemption',
      openingImage: 'A dark cell',
      closingImage: 'Sunlight breaking through',
      pacingBudget: { targetPagesMin: 8, targetPagesMax: 12 },
      anchorMoments: {
        incitingIncident: { actIndex: 0, description: '' },
        midpoint: { actIndex: 0, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
        climax: { actIndex: 0, description: '' },
        signatureScenarioPlacement: null,
      },
      generatedAt: new Date(),
    };
    const accumulatedStructureState: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [],
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
    };
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).toContain('The Discovery');
    expect(messages[1].content).toContain('Introduce the mystery');
  });

  it('user message does not contain PLANNER CHOICE INTENTS section', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[1].content).toContain('DRAMATIC QUESTION');
    expect(messages[1].content).not.toContain('PLANNER CHOICE INTENTS');
    expect(messages[1].content).toContain('NEED VS WANT RULE');
  });

  it('system message does not include storytelling guidelines', () => {
    const messages = buildChoiceGeneratorPrompt(makeContext());

    expect(messages[0].content).not.toContain('interactive fiction storyteller');
    expect(messages[0].content).toContain('choice architect');
  });

  function makeStructureWithAct(
    actOverrides: Partial<StoryAct> = {},
    milestoneOverrides: Partial<StoryMilestone> = {}
  ): { structure: StoryStructure; accumulatedStructureState: AccumulatedStructureState } {
    const structure: StoryStructure = {
      acts: [
        {
          id: 'act-1',
          name: 'Act I',
          objective: 'Establish the world',
          stakes: 'survival',
          entryCondition: 'story begins',
          actQuestion: '',
          exitReversal: '',
          promiseTargets: [],
          obligationTargets: [],
          milestones: [makeMinimalBeat(milestoneOverrides)],
          ...actOverrides,
        },
      ],
      overallTheme: 'redemption',
      premise: 'A fallen knight seeks redemption',
      openingImage: 'A dark cell',
      closingImage: 'Sunlight breaking through',
      pacingBudget: { targetPagesMin: 8, targetPagesMax: 12 },
      anchorMoments: {
        incitingIncident: { actIndex: 0, description: '' },
        midpoint: { actIndex: 0, milestoneSlot: 0, midpointType: 'FALSE_DEFEAT' },
        climax: { actIndex: 0, description: '' },
        signatureScenarioPlacement: null,
      },
      generatedAt: new Date(),
    };
    const accumulatedStructureState: AccumulatedStructureState = {
      currentActIndex: 0,
      currentMilestoneIndex: 0,
      milestoneProgressions: [],
      pagesInCurrentMilestone: 1,
      pacingNudge: null,
    };
    return { structure, accumulatedStructureState };
  }

  it('includes exitCondition when milestone has one', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct(
      {},
      { exitCondition: 'The hero reaches the gate' }
    );
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).toContain('Exit Condition: The hero reaches the gate');
  });

  it('includes actQuestion when act has one', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct({
      actQuestion: 'Can trust survive betrayal?',
    });
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).toContain('Act Question: Can trust survive betrayal?');
  });

  it('includes escalationType when milestone has one', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct(
      {},
      { escalationType: 'BETRAYAL_OR_ALLIANCE_SHIFT' }
    );
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).toContain('Escalation Type: BETRAYAL_OR_ALLIANCE_SHIFT');
  });

  it('includes crisisType for turning_point milestones', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct(
      {},
      { role: 'turning_point', crisisType: 'BEST_BAD_CHOICE' }
    );
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).toContain('Crisis Type: BEST_BAD_CHOICE');
  });

  it('omits crisisType for non-turning_point milestones', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct(
      {},
      { role: 'escalation', crisisType: 'BEST_BAD_CHOICE' }
    );
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );

    expect(messages[1].content).not.toContain('Crisis Type:');
  });

  it('omits new fields gracefully for older stories without them', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct();
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );
    const content = messages[1].content;

    expect(content).toContain('CURRENT BEAT:');
    expect(content).not.toContain('Exit Condition:');
    expect(content).not.toContain('Act Question:');
    expect(content).not.toContain('Escalation Type:');
    expect(content).not.toContain('Crisis Type:');
    expect(content).not.toContain('STRUCTURE-AWARE CHOICE DESIGN');
  });

  it('includes structure-aware choice design instructions when structure fields present', () => {
    const { structure, accumulatedStructureState } = makeStructureWithAct(
      { actQuestion: 'Will the alliance hold?' },
      {
        exitCondition: 'The pact is sealed or broken',
        role: 'turning_point',
        escalationType: 'BETRAYAL_OR_ALLIANCE_SHIFT',
        crisisType: 'IRRECONCILABLE_GOODS',
      }
    );
    const messages = buildChoiceGeneratorPrompt(
      makeContext({ structure, accumulatedStructureState })
    );
    const content = messages[1].content;

    expect(content).toContain('STRUCTURE-AWARE CHOICE DESIGN');
    expect(content).toContain('Exit Condition is shown');
    expect(content).toContain('Act Question is shown');
    expect(content).toContain('Escalation Type is shown');
    expect(content).toContain('Crisis Type is shown');
  });
});
