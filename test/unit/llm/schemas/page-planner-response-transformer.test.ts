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
    dramaticQuestion: 'Will you hold the parapet or fall back to the stairwell?',
    choiceIntents: [
      { hook: 'Stand and return fire from cover', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
      { hook: 'Fall back to the lower stair', choiceType: 'AVOIDANCE_RETREAT', primaryDelta: 'LOCATION_CHANGE' },
    ],
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

  it('rejects ID-like values in add payload fields', () => {
    const rawJson = createValidPlannerPayload();
    (rawJson.stateIntents as { constraints: { add: string[] } }).constraints.add = ['cn-7'];

    try {
      validatePagePlannerResponse(rawJson, '{"raw":"planner"}');
      throw new Error('Expected validatePagePlannerResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(
        issues.some(issue => issue.ruleKey === 'state_id.addition.must_not_be_id_like'),
      ).toBe(true);
    }
  });

  it('trims and includes dramaticQuestion and choiceIntents in result', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.dramaticQuestion = '  Will you hold the parapet or fall back?  ';
    (rawJson.choiceIntents as Array<{ hook: string }>)[0].hook = '  Stand and return fire  ';

    const result = validatePagePlannerResponse(rawJson, '{"raw":"planner"}');

    expect(result.dramaticQuestion).toBe('Will you hold the parapet or fall back?');
    expect(result.choiceIntents).toHaveLength(2);
    expect(result.choiceIntents[0].hook).toBe('Stand and return fire');
    expect(result.choiceIntents[0].choiceType).toBe('CONFRONTATION');
    expect(result.choiceIntents[0].primaryDelta).toBe('THREAT_SHIFT');
    expect(result.choiceIntents[1].choiceType).toBe('AVOIDANCE_RETREAT');
    expect(result.choiceIntents[1].primaryDelta).toBe('LOCATION_CHANGE');
  });

  it('throws when dramaticQuestion is missing', () => {
    const rawJson = createValidPlannerPayload();
    delete rawJson.dramaticQuestion;

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when dramaticQuestion is empty after trim', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.dramaticQuestion = '   ';

    try {
      validatePagePlannerResponse(rawJson, '{}');
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

  it('throws when choiceIntents is missing', () => {
    const rawJson = createValidPlannerPayload();
    delete rawJson.choiceIntents;

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when choiceIntents has fewer than 2 entries', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.choiceIntents = [
      { hook: 'Only one intent', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
    ];

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when choiceIntents has invalid choiceType enum', () => {
    const rawJson = createValidPlannerPayload();
    (rawJson.choiceIntents as Array<{ choiceType: string }>)[0].choiceType = 'INVALID_TYPE';

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when choiceIntents has invalid primaryDelta enum', () => {
    const rawJson = createValidPlannerPayload();
    (rawJson.choiceIntents as Array<{ primaryDelta: string }>)[0].primaryDelta = 'INVALID_DELTA';

    expect(() => validatePagePlannerResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('throws when choiceIntents has duplicate (choiceType, primaryDelta) pair', () => {
    const rawJson = createValidPlannerPayload();
    rawJson.choiceIntents = [
      { hook: 'Stand and fight', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
      { hook: 'Attack from the flank', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
    ];

    try {
      validatePagePlannerResponse(rawJson, '{}');
      throw new Error('Expected validatePagePlannerResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(
        issues.some(issue => issue.ruleKey === 'planner.choice_intent.duplicate_type_delta'),
      ).toBe(true);
    }
  });

  it('throws when choiceIntent hook is empty after trim', () => {
    const rawJson = createValidPlannerPayload();
    (rawJson.choiceIntents as Array<{ hook: string }>)[0].hook = '   ';

    try {
      validatePagePlannerResponse(rawJson, '{}');
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
});
