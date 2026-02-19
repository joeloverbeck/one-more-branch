import {
  ConstraintType,
  ThreatType,
  ThreadType,
  Urgency,
} from '../../../../src/models/state/index';
import type {
  ContinuationPagePlanContext,
  OpeningPagePlanContext,
} from '../../../../src/llm/context-types';
import { buildPagePlannerPrompt } from '../../../../src/llm/prompts/page-planner-prompt';
import { buildPagePlannerPrompt as buildPagePlannerPromptFromBarrel } from '../../../../src/llm/prompts';
import {
  buildMinimalDecomposedCharacter as makeMinimalDecomposedCharacter,
} from '../../../fixtures/decomposed';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
}

describe('buildPagePlannerPrompt', () => {
  const openingContext: OpeningPagePlanContext = {
    mode: 'opening',
    tone: 'paranoid thriller',
    decomposedCharacters: [makeMinimalDecomposedCharacter('A fugitive radio operator')],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A floodlit surveillance city.', scope: 'global' }], rawWorldbuilding: 'A floodlit surveillance city.' },
  };

  const continuationContext: ContinuationPagePlanContext = {
    mode: 'continuation',
    tone: 'paranoid thriller',
    decomposedCharacters: [makeMinimalDecomposedCharacter('A fugitive radio operator')],
    decomposedWorld: { facts: [{ domain: 'geography' as const, fact: 'A floodlit surveillance city.', scope: 'global' }], rawWorldbuilding: 'A floodlit surveillance city.' },
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
      activeThreats: [
        { id: 'th-1', text: 'Security teams closing in', threatType: ThreatType.HOSTILE_AGENT },
      ],
      activeConstraints: [
        { id: 'cn-1', text: 'Power grid unstable', constraintType: ConstraintType.ENVIRONMENTAL },
      ],
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
    accumulatedPromises: [],
  };

  it('returns two messages and is exported through prompts barrel', () => {
    const messages = buildPagePlannerPromptFromBarrel(openingContext);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes planner constraints in the system message', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('page planner');
    expect(system).toContain('do not narrate');
    expect(system).toContain('propose a dramaticQuestion');
    expect(system).not.toContain('do not produce stateIntents');
  });

  it('uses opening context section for opening mode', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const user = getUserMessage(messages);

    expect(user).toContain('=== PLANNER CONTEXT: OPENING ===');
    expect(user).toContain('floodlit surveillance');
    expect(user).not.toContain('=== PLANNER CONTEXT: CONTINUATION ===');
  });

  it('uses continuation context section and includes keyed IDs', () => {
    const messages = buildPagePlannerPrompt(continuationContext);
    const user = getUserMessage(messages);

    expect(user).toContain('=== PLANNER CONTEXT: CONTINUATION ===');
    expect(user).toContain("PLAYER'S CHOICE:");
    expect(user).toContain('- [inv-1] Signal scrambler');
    expect(user).toContain('- [th-1] (HOSTILE_AGENT) Security teams closing in');
    expect(user).toContain('(MYSTERY/HIGH)');
  });

  it('does not include state-intent rules in planner prompt', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const user = getUserMessage(messages);

    expect(user).not.toContain('PLANNER RULES:');
    expect(user).not.toContain('STATE PERSISTENCE CONTRACT:');
    expect(user).not.toContain('THREAT TYPE CONTRACT:');
    expect(user).toContain('Return JSON only.');
  });

  it('includes protagonist perspective rule in system prompt', () => {
    const messages = buildPagePlannerPrompt(openingContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('PROTAGONIST');
    expect(system).toContain('Never frame a choice as what another character does');
  });

  it('includes PROTAGONIST IDENTITY directive in opening context with decomposed characters', () => {
    const contextWithDecomposed: OpeningPagePlanContext = {
      ...openingContext,
      decomposedCharacters: [
        makeMinimalDecomposedCharacter('Jon Ureña'),
        makeMinimalDecomposedCharacter('Captain Voss'),
      ],
    };
    const messages = buildPagePlannerPrompt(contextWithDecomposed);
    const user = getUserMessage(messages);

    expect(user).toContain('PROTAGONIST IDENTITY: Jon Ureña');
    expect(user).toContain('what Jon Ureña can do or decide');
  });

  it('omits PROTAGONIST IDENTITY directive in opening context with empty decomposed characters', () => {
    const contextWithEmpty: OpeningPagePlanContext = {
      ...openingContext,
      decomposedCharacters: [],
    };
    const messages = buildPagePlannerPrompt(contextWithEmpty);
    const user = getUserMessage(messages);

    expect(user).not.toContain('PROTAGONIST IDENTITY:');
  });

  it('includes PROTAGONIST IDENTITY directive in continuation context with decomposed characters', () => {
    const contextWithDecomposed: ContinuationPagePlanContext = {
      ...continuationContext,
      decomposedCharacters: [
        makeMinimalDecomposedCharacter('Jon Ureña'),
        makeMinimalDecomposedCharacter('Captain Voss'),
      ],
    };
    const messages = buildPagePlannerPrompt(contextWithDecomposed);
    const user = getUserMessage(messages);

    expect(user).toContain('PROTAGONIST IDENTITY: Jon Ureña');
    expect(user).toContain('what Jon Ureña can do or decide');
  });

  it('omits PROTAGONIST IDENTITY directive in continuation context with empty decomposed characters', () => {
    const contextWithEmpty: ContinuationPagePlanContext = {
      ...continuationContext,
      decomposedCharacters: [],
    };
    const messages = buildPagePlannerPrompt(contextWithEmpty);
    const user = getUserMessage(messages);

    expect(user).not.toContain('PROTAGONIST IDENTITY:');
  });
});
