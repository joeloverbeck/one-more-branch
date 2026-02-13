import { buildStateAccountantPrompt } from '../../../../src/llm/prompts/state-accountant-prompt';
import type {
  ContinuationPagePlanContext,
  OpeningPagePlanContext,
} from '../../../../src/llm/context-types';
import type { ReducedPagePlanResult } from '../../../../src/llm/planner-types';

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
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
    choiceIntents: [
      {
        hook: 'Stand and fight',
        choiceType: 'CONFRONTATION',
        primaryDelta: 'THREAT_SHIFT',
      },
      {
        hook: 'Retreat through side passage',
        choiceType: 'AVOIDANCE_RETREAT',
        primaryDelta: 'LOCATION_CHANGE',
      },
    ],
  };

  const openingContext: OpeningPagePlanContext = {
    mode: 'opening',
    characterConcept: 'A fugitive radio operator',
    worldbuilding: 'A floodlit surveillance city.',
    tone: 'paranoid thriller',
  };

  const continuationContext: ContinuationPagePlanContext = {
    mode: 'continuation',
    characterConcept: 'A fugitive radio operator',
    worldbuilding: 'A floodlit surveillance city.',
    tone: 'paranoid thriller',
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
  };

  it('includes reduced planner output and state-intent rules', () => {
    const messages = buildStateAccountantPrompt(openingContext, reducedPlan);
    const user = getUserMessage(messages);

    expect(messages).toHaveLength(2);
    expect(user).toContain('=== REDUCED PLANNER OUTPUT ===');
    expect(user).toContain(reducedPlan.sceneIntent);
    expect(user).toContain('PLANNER RULES:');
    expect(user).toContain('Return JSON only.');
  });

  it('uses continuation context for continuation mode', () => {
    const messages = buildStateAccountantPrompt(continuationContext, reducedPlan);
    const user = getUserMessage(messages);

    expect(user).toContain('=== PLANNER CONTEXT: CONTINUATION ===');
    expect(user).toContain("PLAYER'S CHOICE:");
  });
});
