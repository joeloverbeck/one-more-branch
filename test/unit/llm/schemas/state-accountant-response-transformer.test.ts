import { LLMError } from '../../../../src/llm/llm-client-types';
import { validateStateAccountantResponse } from '../../../../src/llm/schemas/state-accountant-response-transformer';

function createValidStatePayload(): Record<string, unknown> {
  return {
    stateIntents: {
      currentLocation: 'Eastern watchtower parapet',
      threats: {
        add: [{ text: 'Archers establish crossfire from the catwalk', threatType: 'HOSTILE_AGENT' }],
        removeIds: [],
      },
      constraints: {
        add: [{ text: 'Visibility is reduced by smoke', constraintType: 'ENVIRONMENTAL' }],
        removeIds: [],
      },
      threads: {
        add: [
          {
            text: 'Secure a fallback route through the lower gate',
            threadType: 'DANGER',
            urgency: 'HIGH',
          },
        ],
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
        worldAdd: [{ text: 'The eastern stairwell overlooks the collapsed market square.', factType: 'LAW' }],
        characterAdd: [
          { characterName: 'Captain Ives', facts: ['Ives served at the tower before the war.'] },
        ],
      },
    },
  };
}

describe('validateStateAccountantResponse', () => {
  it('returns normalized StateAccountantGenerationResult and preserves rawResponse', () => {
    const rawJson = createValidStatePayload();
    (rawJson.stateIntents as { currentLocation: string }).currentLocation = '  Eastern watchtower parapet  ';

    const result = validateStateAccountantResponse(rawJson, '{"raw":"accountant"}');

    expect(result.stateIntents.currentLocation).toBe('Eastern watchtower parapet');
    expect(result.stateIntents.threats.add).toHaveLength(1);
    expect(result.rawResponse).toBe('{"raw":"accountant"}');
  });

  it('throws LLMError with machine-readable context for ID prefix mismatch', () => {
    const rawJson = createValidStatePayload();
    (rawJson.stateIntents as { threats: { removeIds: string[] } }).threats.removeIds = ['cn-9'];

    expect(() => validateStateAccountantResponse(rawJson, '{}')).toThrow(LLMError);
  });

  it('maps invalid thread taxonomy enums to deterministic rule keys', () => {
    const rawJson = createValidStatePayload();
    (
      rawJson.stateIntents as {
        threads: { add: Array<{ text: string; threadType: unknown; urgency: string }> };
      }
    ).threads.add = [
      {
        text: 'Maintain pressure on the eastern stair.',
        threadType: 'NOT_A_THREAD_TYPE',
        urgency: 'HIGH',
      },
    ];

    try {
      validateStateAccountantResponse(rawJson, '{"raw":"accountant"}');
      throw new Error('Expected validateStateAccountantResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(LLMError);
      const llmError = error as LLMError;
      const issues = llmError.context?.validationIssues as Array<{ ruleKey?: string }>;
      expect(issues.some((issue) => issue.ruleKey === 'planner.thread_taxonomy.invalid_enum')).toBe(
        true
      );
    }
  });
});
