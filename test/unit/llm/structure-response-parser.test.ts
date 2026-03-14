import { LLMError } from '../../../src/llm/llm-client-types';
import { parseStructureResponseObject } from '../../../src/llm/structure-response-parser';

function createValidParsedStructure(): Record<string, unknown> {
  return {
    overallTheme: 'Trust must survive orchestrated betrayal.',
    premise: 'A captain must expose the tribunal before the fleet fractures.',
    openingImage: 'A lone captain under storm-lantern light at an empty war table.',
    closingImage: 'The captain under dawn light as the fleet lowers tribunal banners.',
    pacingBudget: { targetPagesMin: 18, targetPagesMax: 36 },
    anchorMoments: {
      incitingIncident: { actIndex: 0, description: 'The captain is framed in public.' },
      midpoint: { actIndex: 1, milestoneSlot: 1, midpointType: 'FALSE_VICTORY' },
      climax: { actIndex: 2, description: 'The harbor tribunal collapses at dawn.' },
      signatureScenarioPlacement: null,
    },
    acts: [
      {
        name: 'Act I',
        objective: 'Identify the hidden conspirator.',
        stakes: 'Failure means immediate execution.',
        entryCondition: 'The captain is framed for mutiny.',
        actQuestion: 'Who engineered the framing?',
        exitReversal: 'The conspiracy reaches into the navy payroll.',
        promiseTargets: ['The tribunal can be exposed'],
        obligationTargets: ['crime_or_puzzle_presented'],
        milestones: [
          {
            name: 'Smuggler meeting',
            description: 'Meet a smuggler at low tide.',
            objective: 'Obtain a cipher fragment.',
            causalLink: 'Because the tribunal sealed official records.',
            exitCondition: 'The captain gets the cipher fragment.',
            role: 'setup',
            isMidpoint: false,
            midpointType: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Dock raid',
            description: 'Raid an armored dock office.',
            objective: 'Recover missing tribunal ledgers.',
            causalLink: 'Because the smuggler reveals where ledgers moved.',
            exitCondition: 'The captain secures the ledgers or loses them publicly.',
            role: 'turning_point',
            secondaryEscalationType: 'REVELATION_SHIFT',
            expectedGapMagnitude: 'WIDE',
            isMidpoint: false,
            midpointType: null,
            obligatorySceneTag: 'red_herring_planted',
          },
        ],
      },
      {
        name: 'Act II',
        objective: 'Force traitors into the open.',
        stakes: 'Failure cements martial law.',
        entryCondition: 'The ledgers reveal navy payroll fraud.',
        actQuestion: 'Can public pressure fracture the traitors?',
        exitReversal: 'One conspirator is exposed, but the city hardens.',
        promiseTargets: ['The tribunal can be exposed'],
        obligationTargets: ['key_clue_recontextualized'],
        milestones: [
          {
            name: 'Signal interception',
            description: 'Intercept coded harbor lanterns.',
            objective: 'Map tribunal loyalist routes.',
            causalLink: 'Because ledger numbers align to ship movements.',
            exitCondition: 'The loyalist routes are mapped.',
            role: 'escalation',
            isMidpoint: false,
            midpointType: null,
            obligatorySceneTag: 'key_clue_recontextualized',
          },
          {
            name: 'Public tribunal ambush',
            description: 'Trigger evidence reveal during tribunal session.',
            objective: 'Expose one conspirator in public view.',
            causalLink: 'Because intercepted routes identify the courier chain.',
            exitCondition: 'The public sees undeniable evidence.',
            role: 'turning_point',
            isMidpoint: true,
            midpointType: 'FALSE_VICTORY',
            obligatorySceneTag: 'crime_or_puzzle_presented',
          },
        ],
      },
      {
        name: 'Act III',
        objective: 'Collapse the conspiracy.',
        stakes: 'Failure installs permanent authoritarian rule.',
        entryCondition: 'A public reveal fractures tribunal unity.',
        actQuestion: 'What version of justice will replace the tribunal?',
        exitReversal: '',
        promiseTargets: ['The tribunal can be exposed'],
        obligationTargets: ['culprit_unmasked'],
        milestones: [
          {
            name: 'Mutiny containment',
            description: 'Contain a staged mutiny on the flagship.',
            objective: 'Prevent loyalist takeover.',
            causalLink: 'Because exposed traitors trigger emergency protocols.',
            exitCondition: 'The mutiny is contained long enough for a final confrontation.',
            role: 'turning_point',
            isMidpoint: false,
            midpointType: null,
            obligatorySceneTag: null,
          },
          {
            name: 'Harbor reckoning',
            description: 'Confront the architect at harbor gates.',
            objective: 'Finalize transfer of command.',
            causalLink: 'Because containment isolates the remaining conspirators.',
            exitCondition: 'Authority transfers away from the conspirators.',
            role: 'resolution',
            isMidpoint: false,
            midpointType: null,
            obligatorySceneTag: 'culprit_unmasked',
          },
        ],
      },
    ],
  };
}

describe('structure-response-parser', () => {
  it('parses a valid structure object and keeps initial NPC agendas when complete', () => {
    const parsed = createValidParsedStructure();
    parsed['initialNpcAgendas'] = [
      {
        npcName: 'Admiral Vance',
        currentGoal: 'Delay inspection long enough to burn records.',
        leverage: 'Controls warship deployment orders.',
        fear: 'Exposure of payroll theft.',
        offScreenBehavior: 'Bribes dock officials and rotates loyal captains.',
      },
      {
        npcName: 'Harbormaster Neri',
        currentGoal: 'Keep neutral captains from joining the alliance.',
        leverage: 'Controls berth assignments and customs delays.',
        fear: 'Losing office after reforms.',
        offScreenBehavior: 'Stalls permits and leaks route plans to rivals.',
      },
    ];

    const result = parseStructureResponseObject(parsed);

    expect(result.initialNpcAgendas).toEqual(parsed['initialNpcAgendas']);
    expect(result.acts).toHaveLength(3);
    expect(result.acts[1]?.milestones[1]).toMatchObject({
      isMidpoint: true,
      midpointType: 'FALSE_VICTORY',
    });
    expect(result.acts[0]?.milestones[1]?.secondaryEscalationType).toBe('REVELATION_SHIFT');
    expect(result.acts[0]?.milestones[1]?.expectedGapMagnitude).toBe('WIDE');
    expect(result.acts[2]?.milestones[1]?.obligatorySceneTag).toBe('culprit_unmasked');
    expect(result.openingImage).toContain('storm-lantern');
    expect(result.closingImage).toContain('dawn light');
    expect(result.anchorMoments.midpoint).toEqual({
      actIndex: 1,
      milestoneSlot: 1,
      midpointType: 'FALSE_VICTORY',
    });
    expect(result.acts[0]?.actQuestion).toBe('Who engineered the framing?');
    expect(result.acts[0]?.milestones[0]?.exitCondition).toBe(
      'The captain gets the cipher fragment.'
    );
  });

  it('throws when openingImage is missing', () => {
    const parsed = createValidParsedStructure();
    delete parsed['openingImage'];

    expect(() => parseStructureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseStructureResponseObject(parsed)).toThrow(
      'Structure response missing openingImage'
    );
  });

  it('throws when midpointType exists but isMidpoint is false', () => {
    const parsed = createValidParsedStructure();
    const invalidBeat = (parsed.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[0]
      .milestones[0];
    invalidBeat['midpointType'] = 'FALSE_DEFEAT';

    expect(() => parseStructureResponseObject(parsed)).toThrow(LLMError);
    expect(() => parseStructureResponseObject(parsed)).toThrow(
      'Structure milestone 1.1 has midpointType but isMidpoint is false'
    );
  });

  it('drops malformed initial NPC agendas instead of failing structure parsing', () => {
    const parsed = createValidParsedStructure();
    parsed['initialNpcAgendas'] = [
      {
        npcName: 'Valid NPC',
        currentGoal: 'Do a valid thing.',
        leverage: 'Has leverage.',
        fear: 'Has fear.',
        offScreenBehavior: 'Acts off screen.',
      },
      {
        npcName: 'Invalid NPC',
        currentGoal: 42,
        leverage: 'Has leverage.',
        fear: 'Has fear.',
      },
    ];

    const result = parseStructureResponseObject(parsed);

    expect(result.initialNpcAgendas).toEqual([
      {
        npcName: 'Valid NPC',
        currentGoal: 'Do a valid thing.',
        leverage: 'Has leverage.',
        fear: 'Has fear.',
        offScreenBehavior: 'Acts off screen.',
      },
    ]);
  });

  it('coerces invalid expectedGapMagnitude values to null', () => {
    const parsed = createValidParsedStructure();
    const invalidBeat = (parsed.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[1]
      .milestones[0];
    invalidBeat['expectedGapMagnitude'] = 'IMPOSSIBLE';

    const result = parseStructureResponseObject(parsed);

    expect(result.acts[1]?.milestones[0]?.expectedGapMagnitude).toBeNull();
  });

  it('coerces invalid obligatorySceneTag values to null', () => {
    const parsed = createValidParsedStructure();
    const invalidBeat = (parsed.acts as Array<{ milestones: Array<Record<string, unknown>> }>)[2]
      .milestones[0];
    invalidBeat['obligatorySceneTag'] = 'not_a_valid_obligation_tag';

    const result = parseStructureResponseObject(parsed);

    expect(result.acts[2]?.milestones[0]?.obligatorySceneTag).toBeNull();
  });

  it('defaults the new fields when the current structure response omits them', () => {
    const parsed = createValidParsedStructure();
    delete parsed['anchorMoments'];

    const actOne = (parsed.acts as Array<Record<string, unknown>>)[0]!;
    delete actOne['actQuestion'];
    delete actOne['exitReversal'];
    delete actOne['promiseTargets'];
    delete actOne['obligationTargets'];

    const firstMilestone = (actOne['milestones'] as Array<Record<string, unknown>>)[0]!;
    delete firstMilestone['exitCondition'];

    const result = parseStructureResponseObject(parsed);

    expect(result.anchorMoments.midpoint).toEqual({
      actIndex: 1,
      milestoneSlot: 0,
      midpointType: 'FALSE_DEFEAT',
    });
    expect(result.acts[0]?.actQuestion).toBe('');
    expect(result.acts[0]?.exitReversal).toBe('');
    expect(result.acts[0]?.promiseTargets).toEqual([]);
    expect(result.acts[0]?.obligationTargets).toEqual([]);
    expect(result.acts[0]?.milestones[0]?.exitCondition).toBe('');
  });
});
