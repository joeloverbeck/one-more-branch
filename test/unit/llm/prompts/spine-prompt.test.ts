import { buildSpinePrompt } from '../../../../src/llm/prompts/spine-prompt';
import { createConceptSpecFixture } from '../../../fixtures/concept-generator';

function getSystemMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'system')?.content ?? '';
}

function getUserMessage(messages: { role: string; content: string }[]): string {
  return messages.find((message) => message.role === 'user')?.content ?? '';
}

describe('buildSpinePrompt', () => {
  const baseContext = {
    characterConcept: 'A disgraced signal officer trying to expose military corruption.',
    worldbuilding: 'A city-state where radio frequencies are controlled by the regime.',
    tone: 'paranoid techno-thriller',
  };

  it('returns exactly two messages (system and user)', () => {
    const messages = buildSpinePrompt(baseContext);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('system');
    expect(messages[1]?.role).toBe('user');
  });

  it('includes strengthened divergence instructions in user prompt', () => {
    const messages = buildSpinePrompt(baseContext);
    const user = getUserMessage(messages);

    expect(user).toContain('DIVERGENCE CONSTRAINT:');
    expect(user).toContain('Each option must represent a genuinely different story direction');
    expect(user).toContain('must differ from every other option in at least TWO of:');
    expect(user).toContain('protagonistNeedVsWant.dynamic');
    expect(user).toContain('primaryAntagonisticForce.description');
    expect(user).toContain('primaryAntagonisticForce.pressureMechanism');
    expect(user).toContain('centralDramaticQuestion');
  });

  it('includes concept analysis constraints when conceptSpec is provided', () => {
    const conceptSpec = createConceptSpecFixture();
    const messages = buildSpinePrompt({
      ...baseContext,
      conceptSpec,
    });
    const user = getUserMessage(messages);

    expect(user).toContain('CONCEPT ANALYSIS (from upstream concept generation');
    expect(user).toContain(
      `Thematic tension axis: ${conceptSpec.conflictAxis} — Your spine MUST use this exact conflictAxis value.`
    );
    expect(user).toContain(
      `Structural opposition: ${conceptSpec.conflictType} — Your spine MUST use this exact conflictType value.`
    );
  });

  it('includes NC-21 content policy in system message', () => {
    const messages = buildSpinePrompt(baseContext);
    const system = getSystemMessage(messages);

    expect(system).toContain('NC-21');
  });
});
