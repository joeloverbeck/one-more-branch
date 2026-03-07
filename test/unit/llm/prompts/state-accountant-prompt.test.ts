import { buildStateAccountantPrompt } from '../../../../src/llm/prompts/state-accountant-prompt';
import type {
  ContinuationPagePlanContext,
  OpeningPagePlanContext,
} from '../../../../src/llm/context-types';
import type { ReducedPagePlanResult } from '../../../../src/llm/planner-types';
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

    expect(user).toContain('=== PLANNER CONTEXT: CONTINUATION ===');
    expect(user).toContain("PLAYER'S CHOICE:");
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
