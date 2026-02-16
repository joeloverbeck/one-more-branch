import { ConstraintType, ThreatType, ThreadType, Urgency } from '../../../src/models/state';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import type { PageWriterResult } from '../../../src/llm/writer-types';
import type { PagePlan } from '../../../src/llm/planner-types';
import { reconcileState } from '../../../src/engine/state-reconciler';
import type { StateReconciliationPreviousState } from '../../../src/engine/state-reconciler-types';

function buildBasePlan(): PagePlan {
  return {
    sceneIntent: 'Advance the scene.',
    continuityAnchors: ['Patrol pressure remains'],
    stateIntents: {
      currentLocation: '',
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    writerBrief: {
      openingLineDirective: 'Open with action.',
      mustIncludeBeats: ['Consequence'],
      forbiddenRecaps: ['No recap'],
    },
  };
}

function buildWriterResult(overrides?: Partial<PageWriterResult>): PageWriterResult {
  return {
    narrative: 'The patrol sweeps the bridge crossing while Mara ducks into an alley.',
    choices: [
      {
        text: 'Hide deeper',
        choiceType: ChoiceType.TACTICAL_APPROACH,
        primaryDelta: PrimaryDelta.LOCATION_CHANGE,
      },
    ],
    protagonistAffect: {
      primaryEmotion: 'fear',
      primaryIntensity: 'moderate',
      primaryCause: 'Patrol closing in',
      secondaryEmotions: [],
      dominantMotivation: 'Escape',
    },
    isEnding: false,
    sceneSummary: 'Mara evades the patrol near the bridge crossing and ducks into an alley.',
    rawResponse: '{}',
    ...overrides,
  };
}

function buildPopulatedPreviousState(): StateReconciliationPreviousState {
  return {
    currentLocation: 'Bridge district',
    threats: [
      {
        id: 'th-1',
        text: 'Armed patrol sweeps the bridge crossing',
        threatType: ThreatType.HOSTILE_AGENT,
      },
      {
        id: 'th-2',
        text: 'Informant network watches the market',
        threatType: ThreatType.HOSTILE_AGENT,
      },
    ],
    constraints: [
      {
        id: 'cn-1',
        text: 'Curfew restricts movement after dark',
        constraintType: ConstraintType.TEMPORAL,
      },
      {
        id: 'cn-2',
        text: 'Bridge checkpoint requires identification',
        constraintType: ConstraintType.ENVIRONMENTAL,
      },
    ],
    threads: [
      {
        id: 'td-1',
        text: 'Reach the archive before dawn',
        threadType: ThreadType.QUEST,
        urgency: Urgency.HIGH,
      },
      {
        id: 'td-2',
        text: 'Decode the cipher hidden in the market ledger',
        threadType: ThreadType.MYSTERY,
        urgency: Urgency.MEDIUM,
      },
      {
        id: 'td-3',
        text: 'Can Mara trust the dock informant?',
        threadType: ThreadType.RELATIONSHIP,
        urgency: Urgency.LOW,
      },
    ],
    inventory: [
      { id: 'inv-1', text: 'Forged gate pass' },
      { id: 'inv-2', text: 'Concealed dagger' },
    ],
    health: [
      { id: 'hp-1', text: 'Bruised ribs from the fall' },
      { id: 'hp-2', text: 'Fatigue from lack of sleep' },
    ],
    characterState: [
      { id: 'cs-1', text: 'Mara is wary of informants' },
      { id: 'cs-2', text: 'Kael is waiting at the safe house' },
    ],
  };
}

describe('state-reconciler integration', () => {
  it('handles multi-field simultaneous mutations across threats, constraints, threads, inventory, health, and character state', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        currentLocation: 'Alley behind the bridge',
        threats: {
          add: [{ text: 'Sentry dog detected Mara in the alley', threatType: 'CREATURE' }],
          removeIds: ['th-1'],
        },
        constraints: {
          add: [
            { text: 'Alley is a dead end with no escape route', constraintType: 'ENVIRONMENTAL' },
          ],
          removeIds: ['cn-1'],
        },
        threads: {
          add: [
            {
              text: 'Find the hidden sewer entrance near the bridge',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
        inventory: {
          add: ['Stolen patrol whistle'],
          removeIds: ['inv-1'],
        },
        health: {
          add: ['Twisted ankle from the fall into the alley'],
          removeIds: ['hp-2'],
        },
        characterState: {
          add: [{ characterName: 'Mara', states: ['Desperate to find escape route'] }],
          removeIds: ['cs-1'],
        },
        canon: { worldAdd: [], characterAdd: [] },
      },
    };

    const writer = buildWriterResult({
      narrative:
        'A sentry dog catches her scent in the alley. Mara twists her ankle stumbling into the dead end. She grabs a patrol whistle from a hook. The hidden sewer entrance must be nearby near the bridge. The curfew restriction no longer matters underground. She drops the forged gate pass since it is useless now. Her fatigue from lack of sleep fades behind adrenaline. Mara is no longer wary of informants down here.',
      sceneSummary:
        'Mara is trapped in a dead-end alley behind the bridge with a sentry dog and a twisted ankle. She finds a stolen patrol whistle and desperately searches for an escape route to the hidden sewer entrance. The curfew no longer restricts. The forged gate pass is discarded. She overcomes fatigue and her wariness of informants.',
    });

    const result = reconcileState(plan, writer, buildPopulatedPreviousState());

    expect(result.currentLocation).toBe('Alley behind the bridge');
    expect(result.threatsAdded).toEqual([
      { text: 'Sentry dog detected Mara in the alley', threatType: ThreatType.CREATURE },
    ]);
    expect(result.threatsRemoved).toEqual(['th-1']);
    expect(result.constraintsAdded).toEqual([
      { text: 'Alley is a dead end with no escape route', constraintType: ConstraintType.ENVIRONMENTAL },
    ]);
    expect(result.constraintsRemoved).toEqual(['cn-1']);
    expect(result.threadsAdded).toEqual([
      {
        text: 'Find the hidden sewer entrance near the bridge',
        threadType: ThreadType.QUEST,
        urgency: Urgency.HIGH,
      },
    ]);
    expect(result.inventoryAdded).toEqual(['Stolen patrol whistle']);
    expect(result.inventoryRemoved).toEqual(['inv-1']);
    expect(result.healthAdded).toEqual(['Twisted ankle from the fall into the alley']);
    expect(result.healthRemoved).toEqual(['hp-2']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Mara', states: ['Desperate to find escape route'] },
    ]);
    expect(result.characterStateChangesRemoved).toEqual(['cs-1']);
  });

  it('exercises the full thread dedup pipeline: auto-resolves near-duplicate + accepts all adds', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        ...buildBasePlan().stateIntents,
        threads: {
          add: [
            {
              text: 'The building is collapsing right now around them',
              threadType: ThreadType.DANGER,
              urgency: Urgency.HIGH,
            },
            {
              text: 'Reach the archive before dawn breaks',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
            {
              text: 'Locate the hidden map inside the bridge crossing tunnel',
              threadType: ThreadType.QUEST,
              urgency: Urgency.MEDIUM,
            },
          ],
          resolveIds: [],
        },
      },
    };

    const writer = buildWriterResult({
      narrative:
        'The building is collapsing right now as Mara runs. She must reach the archive before dawn breaks. She remembers the hidden map inside the bridge crossing tunnel.',
      sceneSummary:
        'Mara escapes while the building collapses around them. The archive before dawn and the hidden map inside the bridge crossing tunnel are her goals.',
    });

    const result = reconcileState(plan, writer, buildPopulatedPreviousState());

    expect(result.threadsAdded).toEqual([
      {
        text: 'The building is collapsing right now around them',
        threadType: ThreadType.DANGER,
        urgency: Urgency.HIGH,
      },
      {
        text: 'Reach the archive before dawn breaks',
        threadType: ThreadType.QUEST,
        urgency: Urgency.HIGH,
      },
      {
        text: 'Locate the hidden map inside the bridge crossing tunnel',
        threadType: ThreadType.QUEST,
        urgency: Urgency.MEDIUM,
      },
    ]);
    expect(result.threadsResolved).toEqual(['td-1']);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('accepts all field type additions without narrative evidence gating', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        ...buildBasePlan().stateIntents,
        threats: {
          add: [{ text: 'Xylocarpa toxin infiltrating groundwater', threatType: 'ENVIRONMENTAL' }],
          removeIds: [],
        },
        constraints: {
          add: [{ text: 'Bridge crossing is blocked by patrol', constraintType: 'ENVIRONMENTAL' }],
          removeIds: [],
        },
        inventory: {
          add: ['Zyzzogeton gemstone amulet'],
          removeIds: [],
        },
        health: {
          add: ['Fatigue from the alley chase'],
          removeIds: [],
        },
        characterState: {
          add: [{ characterName: 'Mara', states: ['Determined after the alley escape'] }],
          removeIds: [],
        },
      },
    };

    const writer = buildWriterResult({
      narrative:
        'The bridge crossing is blocked by patrol. Mara feels the fatigue from the alley chase. She is determined after the alley escape.',
      sceneSummary:
        'Mara is fatigued from the alley chase and determined after the alley escape. The bridge crossing is blocked by patrol.',
    });

    const result = reconcileState(plan, writer, buildPopulatedPreviousState());

    expect(result.threatsAdded).toEqual([
      { text: 'Xylocarpa toxin infiltrating groundwater', threatType: ThreatType.ENVIRONMENTAL },
    ]);
    expect(result.constraintsAdded).toEqual([
      { text: 'Bridge crossing is blocked by patrol', constraintType: ConstraintType.ENVIRONMENTAL },
    ]);
    expect(result.inventoryAdded).toEqual(['Zyzzogeton gemstone amulet']);
    expect(result.healthAdded).toEqual(['Fatigue from the alley chase']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Mara', states: ['Determined after the alley escape'] },
    ]);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('normalizes canon facts and detects cross-character duplicate overlap', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        ...buildBasePlan().stateIntents,
        canon: {
          worldAdd: [
            { text: '  The bridge district is under martial law ', factType: 'LAW' },
            { text: 'the bridge district is under martial law', factType: 'LAW' },
            { text: 'The old archive holds forbidden texts', factType: 'LAW' },
          ],
          characterAdd: [
            {
              characterName: 'Mara',
              facts: [
                'Born in the bridge district',
                '  born in the bridge district ',
                'Trained by the archive keeper',
              ],
            },
            {
              characterName: ' mara ',
              facts: ['Speaks three languages', 'speaks three languages'],
            },
          ],
        },
      },
    };

    const result = reconcileState(plan, buildWriterResult(), buildPopulatedPreviousState());

    expect(result.newCanonFacts).toEqual([
      { text: 'The bridge district is under martial law', factType: 'LAW' },
      { text: 'The old archive holds forbidden texts', factType: 'LAW' },
    ]);
    expect(result.newCharacterCanonFacts).toEqual({
      Mara: [
        'Born in the bridge district',
        'Trained by the archive keeper',
        'Speaks three languages',
      ],
    });

    const worldDuplicates = result.reconciliationDiagnostics.filter(
      (d) => d.code === 'DUPLICATE_CANON_FACT' && d.field?.includes('worldAdd')
    );
    expect(worldDuplicates).toHaveLength(1);

    const charDuplicates = result.reconciliationDiagnostics.filter(
      (d) => d.code === 'DUPLICATE_CANON_FACT' && d.field?.includes('characterAdd')
    );
    expect(charDuplicates).toHaveLength(2);
  });

  it('validates remove IDs and accepts valid removals directly', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        ...buildBasePlan().stateIntents,
        threats: {
          add: [],
          removeIds: ['th-1', 'th-999'],
        },
        constraints: {
          add: [],
          removeIds: ['cn-1', 'cn-2'],
        },
      },
    };

    const result = reconcileState(plan, buildWriterResult(), buildPopulatedPreviousState());

    const unknownIdDiag = result.reconciliationDiagnostics.find(
      (d) => d.code === 'UNKNOWN_STATE_ID' && d.message.includes('th-999')
    );
    expect(unknownIdDiag).toBeDefined();

    expect(result.threatsRemoved).toEqual(['th-1']);
    expect(result.constraintsRemoved).toEqual(['cn-1', 'cn-2']);
    expect(result.reconciliationDiagnostics).toHaveLength(1);
    expect(result.reconciliationDiagnostics[0].code).toBe('UNKNOWN_STATE_ID');
  });

  it('enforces per-type Jaccard thresholds for QUEST, RELATIONSHIP, and MYSTERY in batch', () => {
    const tokens = [
      'amber',
      'bravo',
      'cinder',
      'delta',
      'ember',
      'fable',
      'garnet',
      'harbor',
      'ivory',
      'juniper',
      'kepler',
      'lumen',
    ];
    const previousText = tokens.join(' ');

    const previousState: StateReconciliationPreviousState = {
      ...buildPopulatedPreviousState(),
      threads: [
        {
          id: 'td-quest',
          text: previousText,
          threadType: ThreadType.QUEST,
          urgency: Urgency.HIGH,
        },
        {
          id: 'td-rel',
          text: previousText,
          threadType: ThreadType.RELATIONSHIP,
          urgency: Urgency.HIGH,
        },
        {
          id: 'td-mys',
          text: previousText,
          threadType: ThreadType.MYSTERY,
          urgency: Urgency.HIGH,
        },
      ],
    };

    const belowRelText = tokens.slice(0, 6).join(' ');
    const dupRelText = tokens.slice(0, 7).join(' ');
    const belowMysText = tokens.slice(0, 7).join(' ');
    const dupMysText = tokens.slice(0, 8).join(' ');
    const belowQuestText = tokens.slice(0, 7).join(' ');
    const dupQuestText = tokens.slice(0, 8).join(' ');

    const belowRelResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [
              { text: belowRelText, threadType: ThreadType.RELATIONSHIP, urgency: Urgency.HIGH },
            ],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${belowRelText} while reflecting.`,
        sceneSummary: `Focus on: ${belowRelText}.`,
      }),
      previousState
    );
    expect(belowRelResult.threadsAdded).toHaveLength(1);

    const dupRelResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [{ text: dupRelText, threadType: ThreadType.RELATIONSHIP, urgency: Urgency.HIGH }],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${dupRelText} while reflecting.`,
        sceneSummary: `Focus on: ${dupRelText}.`,
      }),
      previousState
    );
    expect(dupRelResult.threadsAdded).toHaveLength(1);
    expect(dupRelResult.threadsResolved).toContain('td-rel');
    expect(dupRelResult.reconciliationDiagnostics).toEqual([]);

    const belowQuestResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [{ text: belowQuestText, threadType: ThreadType.QUEST, urgency: Urgency.HIGH }],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${belowQuestText} while planning.`,
        sceneSummary: `Focus on: ${belowQuestText}.`,
      }),
      previousState
    );
    expect(belowQuestResult.threadsAdded).toHaveLength(1);

    const dupQuestResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [{ text: dupQuestText, threadType: ThreadType.QUEST, urgency: Urgency.HIGH }],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${dupQuestText} while planning.`,
        sceneSummary: `Focus on: ${dupQuestText}.`,
      }),
      previousState
    );
    expect(dupQuestResult.threadsAdded).toHaveLength(1);
    expect(dupQuestResult.threadsResolved).toContain('td-quest');
    expect(dupQuestResult.reconciliationDiagnostics).toEqual([]);

    const belowMysResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [{ text: belowMysText, threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH }],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${belowMysText} while investigating.`,
        sceneSummary: `Focus on: ${belowMysText}.`,
      }),
      previousState
    );
    expect(belowMysResult.threadsAdded).toHaveLength(1);

    const dupMysResult = reconcileState(
      {
        ...buildBasePlan(),
        stateIntents: {
          ...buildBasePlan().stateIntents,
          threads: {
            add: [{ text: dupMysText, threadType: ThreadType.MYSTERY, urgency: Urgency.HIGH }],
            resolveIds: [],
          },
        },
      },
      buildWriterResult({
        narrative: `Mara considers ${dupMysText} while investigating.`,
        sceneSummary: `Focus on: ${dupMysText}.`,
      }),
      previousState
    );
    expect(dupMysResult.threadsAdded).toHaveLength(1);
    expect(dupMysResult.threadsResolved).toContain('td-mys');
    expect(dupMysResult.reconciliationDiagnostics).toEqual([]);
  });

  it('produces a complete result for a full realistic page reconciliation scenario', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        currentLocation: 'Sewer tunnel beneath the bridge',
        threats: {
          add: [{ text: 'Rats swarm the sewer tunnel', threatType: 'CREATURE' }],
          removeIds: ['th-1'],
        },
        constraints: {
          add: [{ text: 'Sewer tunnel is flooded knee-deep', constraintType: 'ENVIRONMENTAL' }],
          removeIds: [],
        },
        threads: {
          add: [
            {
              text: 'Find the old sewer exit that leads to the archive district',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
        inventory: {
          add: ['Waterproof lantern found in the tunnel'],
          removeIds: ['inv-1'],
        },
        health: {
          add: [],
          removeIds: [],
        },
        characterState: {
          add: [{ characterName: 'Mara', states: ['Navigating by memory'] }],
          removeIds: [],
        },
        canon: {
          worldAdd: [{ text: 'The sewer system predates the current city by centuries', factType: 'LAW' }],
          characterAdd: [
            { characterName: 'Mara', facts: ['Explored the sewer tunnel as a child'] },
          ],
        },
      },
    };

    const writer = buildWriterResult({
      narrative:
        'Mara drops into the sewer tunnel beneath the bridge. Rats swarm the sewer tunnel ahead. The water is knee-deep and rising. She finds a waterproof lantern in the tunnel hanging from a rusted hook. She must find the old sewer exit that leads to the archive district. Navigating by memory, she remembers the way from childhood.',
      sceneSummary:
        'Mara enters the sewer tunnel beneath the bridge. Rats swarm. The tunnel is flooded knee-deep. She finds a waterproof lantern. The patrol that was sweeping the bridge crossing is above. She navigates by memory seeking the archive district exit.',
    });

    const result = reconcileState(plan, writer, buildPopulatedPreviousState());

    expect(result.currentLocation).toBe('Sewer tunnel beneath the bridge');
    expect(result.threatsAdded).toEqual([
      { text: 'Rats swarm the sewer tunnel', threatType: ThreatType.CREATURE },
    ]);
    expect(result.threatsRemoved).toEqual(['th-1']);
    expect(result.constraintsAdded).toEqual([
      { text: 'Sewer tunnel is flooded knee-deep', constraintType: ConstraintType.ENVIRONMENTAL },
    ]);
    expect(result.threadsAdded).toEqual([
      {
        text: 'Find the old sewer exit that leads to the archive district',
        threadType: ThreadType.QUEST,
        urgency: Urgency.HIGH,
      },
    ]);
    expect(result.inventoryAdded).toEqual(['Waterproof lantern found in the tunnel']);
    expect(result.inventoryRemoved).toEqual(['inv-1']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Mara', states: ['Navigating by memory'] },
    ]);
    expect(result.newCanonFacts).toEqual([
      { text: 'The sewer system predates the current city by centuries', factType: 'LAW' },
    ]);
    expect(result.newCharacterCanonFacts).toEqual({
      Mara: ['Explored the sewer tunnel as a child'],
    });

    const criticalDiags = result.reconciliationDiagnostics.filter(
      (d) => d.code === 'UNKNOWN_STATE_ID'
    );
    expect(criticalDiags).toHaveLength(0);
  });

  it('returns no-op result when mutations are empty but previous state is populated', () => {
    const plan = buildBasePlan();
    const previousState = buildPopulatedPreviousState();
    const result = reconcileState(plan, buildWriterResult(), previousState);

    expect(result.currentLocation).toBe(previousState.currentLocation);
    expect(result.threatsAdded).toEqual([]);
    expect(result.threatsRemoved).toEqual([]);
    expect(result.constraintsAdded).toEqual([]);
    expect(result.constraintsRemoved).toEqual([]);
    expect(result.threadsAdded).toEqual([]);
    expect(result.threadsResolved).toEqual([]);
    expect(result.inventoryAdded).toEqual([]);
    expect(result.inventoryRemoved).toEqual([]);
    expect(result.healthAdded).toEqual([]);
    expect(result.healthRemoved).toEqual([]);
    expect(result.characterStateChangesAdded).toEqual([]);
    expect(result.characterStateChangesRemoved).toEqual([]);
    expect(result.newCanonFacts).toEqual([]);
    expect(result.newCharacterCanonFacts).toEqual({});
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('produces deterministic output when called 3x with identical complex multi-field input', () => {
    const plan: PagePlan = {
      ...buildBasePlan(),
      stateIntents: {
        currentLocation: 'Sewer junction',
        threats: {
          add: [{ text: 'Collapsing section ahead in the tunnel', threatType: 'ENVIRONMENTAL' }],
          removeIds: ['th-2'],
        },
        constraints: {
          add: [{ text: 'Water level rising in the tunnel', constraintType: 'ENVIRONMENTAL' }],
          removeIds: ['cn-1'],
        },
        threads: {
          add: [
            {
              text: 'Locate the valve to drain the sewer tunnel flooding',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
        inventory: {
          add: ['Rusty wrench from the tunnel wall'],
          removeIds: ['inv-2'],
        },
        health: {
          add: ['Hypothermia setting in from the tunnel water'],
          removeIds: [],
        },
        characterState: {
          add: [{ characterName: 'Mara', states: ['Shivering and focused'] }],
          removeIds: [],
        },
        canon: {
          worldAdd: [{ text: 'The sewer junction connects three districts', factType: 'LAW' }],
          characterAdd: [{ characterName: 'Mara', facts: ['Remembers the valve location'] }],
        },
      },
    };

    const writer = buildWriterResult({
      narrative:
        'At the sewer junction, a collapsing section ahead in the tunnel blocks one path. Water level rising in the tunnel pushes Mara forward. She grabs a rusty wrench from the tunnel wall. Hypothermia setting in from the tunnel water makes her hands shake. She must locate the valve to drain the sewer tunnel flooding. Shivering and focused, she presses on, remembering the valve location.',
      sceneSummary:
        'Mara reaches the sewer junction. A collapsing section threatens one route. Water is rising. She finds a wrench, uses the concealed dagger as leverage, and pushes toward the valve. The informant network above remains a concern.',
    });

    const previousState = buildPopulatedPreviousState();

    const first = reconcileState(plan, writer, previousState);
    const second = reconcileState(plan, writer, previousState);
    const third = reconcileState(plan, writer, previousState);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });
});
