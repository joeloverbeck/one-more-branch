import { LLMError } from '../../../src/llm/llm-client-types';
import { parseMacroArchitectureResponseObject } from '../../../src/llm/macro-architecture-response-parser';

function createValidMacroArchitecture(): Record<string, unknown> {
  return {
    overallTheme: 'Justice demands dismantling the stage that protects power.',
    premise: 'A framed captain must turn a public tribunal into the site of its own exposure.',
    openingImage: 'A captain stands alone before the tribunal banners.',
    closingImage: 'The same harbor stands bannerless at dawn.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The captain is framed during a public hearing.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: 'The tribunal’s ritual chamber is publicly overturned.' },
      signatureScenarioPlacement: {
        actIndex: 1,
        description: 'A rigged hearing erupts into ritual violence in front of the fleet.',
      },
    },
    initialNpcAgendas: [
      {
        npcName: 'Admiral Vance',
        currentGoal: 'Delay exposure until the records are purged.',
        leverage: 'Commands fleet logistics.',
        fear: 'Public audit of the tribunal.',
        offScreenBehavior: 'Rotates loyal officers through key checkpoints.',
      },
    ],
    acts: [
      {
        name: 'Act I',
        objective: 'Survive disgrace long enough to identify the leak.',
        stakes: 'Failure means execution and silence.',
        entryCondition: 'The tribunal frames the captain.',
        actQuestion: 'Who benefits from the framing?',
        exitReversal: 'The conspiracy reaches into fleet command.',
        promiseTargets: ['The tribunal becomes the battleground.'],
        obligationTargets: ['crime_or_puzzle_presented'],
      },
      {
        name: 'Act II',
        objective: 'Force the conspirators into public risk.',
        stakes: 'Failure locks the harbor into martial rule.',
        entryCondition: 'Evidence points to internal command channels.',
        actQuestion: 'Can public pressure outpace institutional control?',
        exitReversal: 'A public reveal succeeds, but the city chooses order over truth.',
        promiseTargets: ['An ally inside the system is morally compromised.'],
        obligationTargets: ['key_clue_recontextualized'],
      },
      {
        name: 'Act III',
        objective: 'Break the ritual machinery that protects the tribunal.',
        stakes: 'Failure cements authoritarian legitimacy.',
        entryCondition: 'The tribunal exposes its violence to preserve control.',
        actQuestion: 'What kind of justice survives after the system breaks?',
        exitReversal: '',
        promiseTargets: ['The tribunal becomes the battleground.'],
        obligationTargets: ['culprit_unmasked'],
      },
    ],
  };
}

describe('parseMacroArchitectureResponseObject', () => {
  it('parses a valid macro architecture response', () => {
    const result = parseMacroArchitectureResponseObject(createValidMacroArchitecture());

    expect(result.acts).toHaveLength(3);
    expect(result.anchorMoments.midpoint).toEqual({
      actIndex: 1,
      milestoneSlot: 1,
      midpointType: 'FALSE_VICTORY',
    });
    expect(result.initialNpcAgendas).toEqual([
      expect.objectContaining({ npcName: 'Admiral Vance' }),
    ]);
  });

  it('rejects anchor moments that point to a non-existent act', () => {
    const parsed = createValidMacroArchitecture();
    (parsed['anchorMoments'] as Record<string, unknown>)['climax'] = {
      actIndex: 3,
      description: 'Invalid climax placement.',
    };

    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(
      'anchorMoments.climax.actIndex must reference a valid act index between 0 and 2'
    );
  });

  it('rejects midpoint milestone slots outside the supported range', () => {
    const parsed = createValidMacroArchitecture();
    ((parsed['anchorMoments'] as Record<string, unknown>)['midpoint'] as Record<string, unknown>)[
      'milestoneSlot'
    ] = 4;

    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(
      'anchorMoments.midpoint.milestoneSlot must be an integer between 0 and 3'
    );
  });

  it('rejects a non-final act with an empty exit reversal', () => {
    const parsed = createValidMacroArchitecture();
    ((parsed['acts'] as Array<Record<string, unknown>>)[0] as Record<string, unknown>)['exitReversal'] = '';

    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(
      'acts[0].exitReversal must be a non-empty string'
    );
  });

  it('rejects a final act that tries to set another reversal', () => {
    const parsed = createValidMacroArchitecture();
    ((parsed['acts'] as Array<Record<string, unknown>>)[2] as Record<string, unknown>)['exitReversal'] =
      'One more cliffhanger';

    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(
      'Final macro act must use an empty exitReversal'
    );
  });

  it('rejects non-string promise target arrays', () => {
    const parsed = createValidMacroArchitecture();
    ((parsed['acts'] as Array<Record<string, unknown>>)[1] as Record<string, unknown>)['promiseTargets'] =
      ['Valid', 42];

    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseMacroArchitectureResponseObject(parsed)).toThrow(
      'acts[1].promiseTargets must be an array of strings'
    );
  });
});
