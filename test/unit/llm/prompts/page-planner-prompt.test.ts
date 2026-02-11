import { ThreadType, Urgency } from '../../../../src/models/state/index';
import type { ContinuationPagePlanContext, OpeningPagePlanContext } from '../../../../src/llm/types';
import { buildPagePlannerPrompt } from '../../../../src/llm/prompts/page-planner-prompt';
import { buildPagePlannerPrompt as buildPagePlannerPromptFromBarrel } from '../../../../src/llm/prompts';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find(message => message.role === 'user')?.content ?? '';
}

describe('buildPagePlannerPrompt', () => {
  const openingContext: OpeningPagePlanContext = {
    mode: 'opening',
    characterConcept: 'A fugitive radio operator',
    worldbuilding: 'A floodlit surveillance city.',
    tone: 'paranoid thriller',
    globalCanon: [],
    globalCharacterCanon: {},
    accumulatedInventory: [],
    accumulatedHealth: [],
    accumulatedCharacterState: {},
    activeState: {
      currentLocation: '',
      activeThreats: [],
      activeConstraints: [],
      openThreads: [],
    },
  };

  const continuationContext: ContinuationPagePlanContext = {
    mode: 'continuation',
    characterConcept: 'A fugitive radio operator',
    worldbuilding: 'A floodlit surveillance city.',
    tone: 'paranoid thriller',
    globalCanon: ['Broadcast towers are monitored around the clock'],
    globalCharacterCanon: {
      'captain rourke': ['Relentless and procedural'],
    },
    previousNarrative: 'You duck into the relay tunnel as alarms start to pulse.',
    selectedChoice: 'Seal the blast door and reroute power',
    accumulatedInventory: [{ id: 'inv-1', text: 'Signal scrambler' }],
    accumulatedHealth: [{ id: 'hp-2', text: 'Burned left hand' }],
    accumulatedCharacterState: {
      jana: [{ id: 'cs-3', text: 'Waiting at emergency junction C' }],
    },
    activeState: {
      currentLocation: 'Relay tunnel',
      activeThreats: [{ id: 'th-1', text: 'Security teams closing in' }],
      activeConstraints: [{ id: 'cn-1', text: 'Power grid unstable' }],
      openThreads: [
        {
          id: 'td-1',
          text: 'Whether the broadcast window can be reopened',
          threadType: ThreadType.MYSTERY,
          urgency: Urgency.HIGH,
        },
      ],
    },
    grandparentNarrative: null,
    ancestorSummaries: [],
  };

  it('returns two messages and is exported through prompts barrel', () => {
    const messages = buildPagePlannerPromptFromBarrel(openingContext);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes planner safety constraints in the system message', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('page planner');
    expect(system).toContain('do not narrate');
    expect(system).toContain('do not produce player choices');
    expect(system).toContain('do not assign server IDs');
  });

  it('uses opening context section for opening mode', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const user = getUserMessage(messages);

    expect(user).toContain('=== PLANNER CONTEXT: OPENING ===');
    expect(user).toContain('A fugitive radio operator');
    expect(user).toContain('OPENING STATE SNAPSHOT');
    expect(user).not.toContain('=== PLANNER CONTEXT: CONTINUATION ===');
  });

  it('uses continuation context section and includes keyed IDs', () => {
    const messages = buildPagePlannerPrompt(continuationContext);
    const user = getUserMessage(messages);

    expect(user).toContain('=== PLANNER CONTEXT: CONTINUATION ===');
    expect(user).toContain("PLAYER'S CHOICE:");
    expect(user).toContain('- [inv-1] Signal scrambler');
    expect(user).toContain('- [th-1] Security teams closing in');
    expect(user).toContain('(MYSTERY/HIGH)');
  });

  it('includes required PagePlan output shape instructions', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const user = getUserMessage(messages);

    expect(user).toContain('"sceneIntent"');
    expect(user).toContain('"continuityAnchors"');
    expect(user).toContain('"stateIntents"');
    expect(user).toContain('"writerBrief"');
    expect(user).toContain('"threads"');
    expect(user).toContain('"characterState"');
    expect(user).toContain('Return JSON only.');
  });
});
