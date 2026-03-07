import { buildStateAccountantPrompt } from '../../../../src/llm/prompts/state-accountant-prompt';
import type {
  ContinuationPagePlanContext,
  OpeningPagePlanContext,
} from '../../../../src/llm/context-types';
import type { ReducedPagePlanResult } from '../../../../src/llm/planner-types';
import { PromiseScope, PromiseType, ThreadType, Urgency } from '../../../../src/models/state/index.js';
import { buildMinimalDecomposedCharacter, MINIMAL_DECOMPOSED_WORLD } from '../../../fixtures/decomposed';

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
}

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

describe('buildStateAccountantPrompt', () => {
  const reducedPlan: ReducedPagePlanResult = {
    sceneIntent: 'Escalate toward immediate confrontation.',
    continuityAnchors: ['The patrol is already alerted.'],
    writerBrief: {
      openingLineDirective: 'Open on immediate pressure.',
      mustIncludeBeats: ['Incoming pressure'],
      forbiddenRecaps: ['Avoid long recap'],
    },
    dramaticQuestion: 'Will you stand your ground or retreat?',
    isEnding: false,
  };

  const openingContext: OpeningPagePlanContext = {
    mode: 'opening',
    tone: 'paranoid thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A fugitive radio operator')],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
  };

  const continuationContext: ContinuationPagePlanContext = {
    mode: 'continuation',
    tone: 'paranoid thriller',
    decomposedCharacters: [buildMinimalDecomposedCharacter('A fugitive radio operator')],
    decomposedWorld: MINIMAL_DECOMPOSED_WORLD,
    globalCanon: ['Broadcast towers are monitored around the clock'],
    globalCharacterCanon: {},
    previousNarrative: 'You duck into the relay tunnel as alarms start to pulse.',
    selectedChoice: 'Seal the blast door and reroute power',
    accumulatedInventory: [{ id: 'inv-1', text: 'Signal scrambler' }],
    accumulatedHealth: [{ id: 'hp-2', text: 'Burned left hand' }],
    accumulatedCharacterState: {},
    activeState: {
      currentLocation: 'Relay tunnel',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
    grandparentNarrative: null,
    ancestorSummaries: [],
    accumulatedPromises: [],
  };

  it('includes reduced planner output and state accountant rules', () => {
    const messages = buildStateAccountantPrompt(openingContext, reducedPlan);
    const user = getUserMessage(messages);
    const system = getSystemMessage(messages);

    expect(messages).toHaveLength(2);
    expect(user).toContain('=== REDUCED PLANNER OUTPUT ===');
    expect(user).toContain(reducedPlan.sceneIntent);
    expect(user).toContain('STATE ACCOUNTANT RULES:');
    expect(user).not.toContain('PLANNER RULES:');
    expect(system).toContain(
      'characterState.add entries MUST use this shape exactly: { "characterName": string, "states": string[] }.'
    );
    expect(system).toContain(
      'NEVER use legacy characterState.add shape like { "character": string, "text": string }.'
    );
    expect(user).toContain('Return JSON only.');
  });

  it('uses continuation context for continuation mode', () => {
    const messages = buildStateAccountantPrompt(continuationContext, reducedPlan);
    const user = getUserMessage(messages);

    expect(user).toContain('=== ACCOUNTANT CONTEXT: CONTINUATION ===');
    expect(user).toContain("PLAYER'S CHOICE:");
  });

  it('excludes planner-only continuation sections and avoids duplicate pacing blocks', () => {
    const contextWithPlannerArtifacts: ContinuationPagePlanContext = {
      ...continuationContext,
      grandparentNarrative: 'Old scene text that should stay planner-only.',
      parentPacingDirective: 'Escalate pressure now.',
      thematicValenceTrajectory: [
        { pageId: 11, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 12, thematicValence: 'THESIS_SUPPORTING' },
        { pageId: 13, thematicValence: 'THESIS_SUPPORTING' },
      ],
      narrativeFocusTrajectory: [
        { pageId: 11, narrativeFocus: 'BROADENING' },
        { pageId: 12, narrativeFocus: 'BROADENING' },
        { pageId: 13, narrativeFocus: 'BROADENING' },
      ],
      parentToneDriftDescription: 'Too whimsical for the intended tone.',
      activeState: {
        ...continuationContext.activeState,
        openThreads: [
          {
            id: 'td-9',
            text: 'The encrypted failsafe code remains unresolved.',
            threadType: ThreadType.MYSTERY,
            urgency: Urgency.HIGH,
          },
        ],
      },
      threadAges: { 'td-9': 99 },
      accumulatedPromises: [
        {
          id: 'pr-2',
          description: 'Pay off the failed extraction signal.',
          promiseType: PromiseType.FORESHADOWING,
          scope: PromiseScope.STORY,
          resolutionHint: 'Reveal why the signal was spoofed.',
          suggestedUrgency: Urgency.HIGH,
          age: 8,
        },
      ],
      parentThreadPayoffAssessments: [
        {
          threadId: 'td-9',
          threadText: 'The encrypted failsafe code remains unresolved.',
          satisfactionLevel: 'RUSHED',
          reasoning: 'Previous payoff skipped causal steps.',
        },
      ],
    };

    const messages = buildStateAccountantPrompt(contextWithPlannerArtifacts, reducedPlan);
    const user = getUserMessage(messages);

    expect(user).not.toContain('=== PACING BRIEFING (from story analyst) ===');
    expect(user).not.toContain('=== THEMATIC TRAJECTORY ===');
    expect(user).not.toContain('=== DEPTH VS BREADTH TRAJECTORY ===');
    expect(user).not.toContain('=== ESCALATION DIRECTIVE ===');
    expect(user).not.toContain('=== PREMISE PROMISE WARNING (LATE ACT) ===');
    expect(user).not.toContain('=== VALUE SPECTRUM TRACKING (McKee) ===');
    expect(user).not.toContain('=== DRAMATIC IRONY OPPORTUNITIES ===');
    expect(user).not.toContain('SCENE BEFORE LAST (full text for style continuity):');
    expect(user).not.toContain('TONE DRIFT WARNING (from analyst):');
    expect(user).not.toContain('TONE/GENRE:');

    expect(user.match(/=== THREAD PACING PRESSURE ===/g)).toHaveLength(1);
    expect(user.match(/=== TRACKED PROMISES ===/g)).toHaveLength(1);
    expect(user.match(/=== PAYOFF QUALITY FEEDBACK ===/g)).toHaveLength(1);
  });

  it('excludes protagonist directive and guidance in continuation mode', () => {
    const contextWithGuidance: ContinuationPagePlanContext = {
      ...continuationContext,
      protagonistGuidance: {
        suggestedEmotions: 'Furious but controlled.',
        suggestedThoughts: 'This is a trap.',
        suggestedSpeech: 'Stand down.',
      },
    };

    const messages = buildStateAccountantPrompt(contextWithGuidance, reducedPlan);
    const user = getUserMessage(messages);

    expect(user).not.toContain('PROTAGONIST IDENTITY');
    expect(user).not.toContain('PROTAGONIST GUIDANCE');
  });

  it('excludes protagonist directive in opening mode', () => {
    const messages = buildStateAccountantPrompt(openingContext, reducedPlan);
    const user = getUserMessage(messages);

    expect(user).not.toContain('PROTAGONIST IDENTITY');
  });
});
