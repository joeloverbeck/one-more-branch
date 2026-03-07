import { LLMError } from '../../../../src/llm/llm-client-types';
import { validatePagePlannerResponse } from '../../../../src/llm/schemas/page-planner-response-transformer';

function createValidPlannerPayload(): Record<string, unknown> {
  return {
    sceneIntent: 'Escalate the watchtower breach into a forced commitment.',
    continuityAnchors: ['The alarm bells are still ringing'],
    writerBrief: {
      openingLineDirective: 'Open on immediate incoming fire.',
      mustIncludeBeats: ['Incoming volley at the parapet', 'Split-second route decision'],
      forbiddenRecaps: ['Do not restate the full ambush setup'],
    },
    dramaticQuestion: 'Will you hold the parapet or fall back to the stairwell?',
    isEnding: false,
  };
}

describe('validatePagePlannerResponse', () => {
  it('returns normalized ReducedPagePlanGenerationResult and preserves rawResponse', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.sceneIntent = '  Escalate the watchtower breach into a forced commitment.  ';
    rawJson.continuityAnchors = ['  The alarm bells are still ringing  ', '   '];

    const result = validatePagePlannerResponse(rawJson, '{"raw":"planner"}');

    expect(result.sceneIntent).toBe('Escalate the watchtower breach into a forced commitment.');
    expect(result.continuityAnchors).toEqual(['The alarm bells are still ringing']);
    expect(result.rawResponse).toBe('{"raw":"planner"}');
    expect('stateIntents' in result).toBe(false);
  });

  it('throws on duplicate normalized continuity anchors', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.continuityAnchors = ['  Active smoke cover ', 'active smoke cover'];

    expect(() => validatePagePlannerResponse(rawJson, '{"raw":"planner"}')).toThrow(LLMError);
  });

  it('trims dramaticQuestion in result', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.dramaticQuestion = '  Will you hold the parapet or fall back?  ';

    const result = validatePagePlannerResponse(rawJson, '{"raw":"planner"}');

    expect(result.dramaticQuestion).toBe('Will you hold the parapet or fall back?');
  });

  it('throws when dramaticQuestion is missing', () => {
    const rawJson = createValidPlannerPayload();
    delete rawJson.dramaticQuestion;

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when dramaticQuestion is empty after trim', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.dramaticQuestion = '   ';

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

});
