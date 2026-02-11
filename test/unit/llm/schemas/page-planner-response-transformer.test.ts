import { LLMError } from '../../../../src/llm/types';
import { validatePagePlannerResponse } from '../../../../src/llm/schemas/page-planner-response-transformer';

function createValidPlannerPayload(): Record<string, unknown> {
  return {
    sceneIntent: 'Escalate the watchtower breach into a forced commitment.',
    continuityAnchors: ['The alarm bells are still ringing'],
    stateIntents: {
      currentLocation: 'Eastern watchtower parapet',
      threats: {
        add: ['Archers establish crossfire from the catwalk'],
        removeIds: [],
      },
      constraints: {
        add: ['Visibility is reduced by smoke'],
        removeIds: [],
      },
      threads: {
        add: [{ text: 'Secure a fallback route through the lower gate', threadType: 'DANGER', urgency: 'HIGH' }],
        resolveIds: [],
      },
      inventory: {
        add: ['A cracked signal horn'],
        removeIds: [],
      },
      health: {
        add: ['Shallow cut on your forearm'],
        removeIds: [],
      },
      characterState: {
        add: [{ characterName: 'Captain Ives', states: ['Pinned near the eastern stair'] }],
        removeIds: [],
      },
      canon: {
        worldAdd: ['The eastern stairwell overlooks the collapsed market square.'],
        characterAdd: [{ characterName: 'Captain Ives', facts: ['Ives served at the tower before the war.'] }],
      },
    },
    writerBrief: {
      openingLineDirective: 'Open on immediate incoming fire.',
      mustIncludeBeats: ['Incoming volley at the parapet', 'Split-second route decision'],
      forbiddenRecaps: ['Do not restate the full ambush setup'],
    },
  };
}

describe('validatePagePlannerResponse', () => {
  it('returns normalized PagePlanGenerationResult and preserves rawResponse', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.sceneIntent = '  Escalate the watchtower breach into a forced commitment.  ';
    rawJson.continuityAnchors = ['  The alarm bells are still ringing  ', '   '];
    (rawJson.stateIntents as { canon: { worldAdd: string[] } }).canon.worldAdd = [
      '  The eastern stairwell overlooks the collapsed market square.  ',
      '   ',
    ];

    const result = validatePagePlannerResponse(rawJson, '{"raw":"planner"}');

    expect(result.sceneIntent).toBe('Escalate the watchtower breach into a forced commitment.');
    expect(result.continuityAnchors).toEqual(['The alarm bells are still ringing']);
    expect(result.stateIntents.canon.worldAdd).toEqual([
      'The eastern stairwell overlooks the collapsed market square.',
    ]);
    expect(result.rawResponse).toBe('{"raw":"planner"}');
  });

  it('throws LLMError with machine-readable context for ID prefix mismatch', () => {
    const rawJson = createValidPlannerPayload();
    (rawJson.stateIntents as { threats: { removeIds: string[] } }).threats.removeIds = ['cn-9'];

    try {
      validatePagePlannerResponse(rawJson, '{"raw":"planner"}');
      throw new Error('Expected validatePagePlannerResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      expect(llmError.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(llmError.context?.validationIssues)).toBe(true);
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(issues.some(issue => issue.ruleKey === 'state_id.id_only_field.prefix_mismatch')).toBe(
        true,
      );
    }
  });

  it('throws on duplicate normalized intents in the same category', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.continuityAnchors = ['  Active smoke cover ', 'active smoke cover'];

    expect(() => validatePagePlannerResponse(rawJson, '{"raw":"planner"}')).toThrow(LLMError);
  });

  it('throws when character state add has no non-empty states', () => {
    const rawJson = createValidPlannerPayload();
    (
      rawJson.stateIntents as {
        characterState: { add: Array<{ characterName: string; states: string[] }> };
      }
    ).characterState.add = [{ characterName: 'Mara', states: ['   '] }];

    expect(() => validatePagePlannerResponse(rawJson, '{"raw":"planner"}')).toThrow(LLMError);
  });

  it('throws when thread text is empty after trim with deterministic rule key', () => {
    const rawJson = createValidPlannerPayload();
    (
      rawJson.stateIntents as {
        threads: { add: Array<{ text: string; threadType: string; urgency: string }> };
      }
    ).threads.add = [
      { text: '   ', threadType: 'DANGER', urgency: 'HIGH' },
    ];

    try {
      validatePagePlannerResponse(rawJson, '{"raw":"planner"}');
      throw new Error('Expected validatePagePlannerResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(
        issues.some(issue => issue.ruleKey === 'planner.required_text.empty_after_trim'),
      ).toBe(true);
    }
  });

  it('maps invalid thread taxonomy enums to deterministic rule keys', () => {
    const rawJson = createValidPlannerPayload();
    (
      rawJson.stateIntents as {
        threads: { add: Array<{ text: string; threadType: unknown; urgency: string }> };
      }
    ).threads.add = [
      { text: 'Maintain pressure on the eastern stair.', threadType: 'NOT_A_THREAD_TYPE', urgency: 'HIGH' },
    ];

    try {
      validatePagePlannerResponse(rawJson, '{"raw":"planner"}');
      throw new Error('Expected validatePagePlannerResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(
        issues.some(issue => issue.ruleKey === 'planner.thread_taxonomy.invalid_enum'),
      ).toBe(true);
      expect(llmError.context?.ruleKeys).toContain('planner.thread_taxonomy.invalid_enum');
    }
  });
});
