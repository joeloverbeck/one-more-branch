import { ThreadType, Urgency } from '../../../src/models/state';
import type { PagePlan, PageWriterResult } from '../../../src/llm/types';
import { reconcileState } from '../../../src/engine/state-reconciler';
import type { StateReconciliationPreviousState } from '../../../src/engine/state-reconciler-types';

function buildPlan(overrides?: Partial<PagePlan>): PagePlan {
  return {
    sceneIntent: 'Advance the scene with concrete consequences.',
    continuityAnchors: ['Watch patrols every bridge crossing'],
    stateIntents: {
      threats: { add: [], removeIds: [], replace: [] },
      constraints: { add: [], removeIds: [], replace: [] },
      threads: { add: [], resolveIds: [], replace: [] },
      inventory: { add: [], removeIds: [], replace: [] },
      health: { add: [], removeIds: [], replace: [] },
      characterState: { add: [], removeIds: [], replace: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    writerBrief: {
      openingLineDirective: 'Open with motion under pressure.',
      mustIncludeBeats: ['Immediate consequence'],
      forbiddenRecaps: ['Do not restate the prior page ending'],
    },
    ...overrides,
  };
}

function buildWriterResult(): PageWriterResult {
  return {
    narrative: 'A bell tolls as patrols fan out through the alleys.',
    choices: [
      { text: 'Slip into the market crowd', choiceType: 'TACTICAL_APPROACH', primaryDelta: 'LOCATION_CHANGE' },
      { text: 'Confront the nearest sentry', choiceType: 'CONFRONTATION', primaryDelta: 'THREAT_SHIFT' },
    ],
    protagonistAffect: {
      primaryEmotion: 'alertness',
      primaryIntensity: 'moderate',
      primaryCause: 'Patrols tightening checkpoints',
      secondaryEmotions: [],
      dominantMotivation: 'Avoid capture',
    },
    isEnding: false,
    sceneSummary: 'Patrol pressure increases and routes narrow.',
    rawResponse: '{"ok":true}',
  };
}

function buildPreviousState(): StateReconciliationPreviousState {
  return {
    currentLocation: 'South market district',
    threats: [{ id: 'th-1', text: 'City patrols sweep the district' }],
    constraints: [{ id: 'cn-1', text: 'Curfew sirens close side streets' }],
    threads: [{ id: 'td-1', text: 'Reach the archive safely', threadType: ThreadType.QUEST, urgency: Urgency.HIGH }],
    inventory: [{ id: 'inv-1', text: 'Forged gate pass' }],
    health: [{ id: 'hp-1', text: 'Bruised ribs' }],
    characterState: [{ id: 'cs-1', text: 'Mara is wary of informants' }],
  };
}

describe('state-reconciler', () => {
  it('normalizes intent text deterministically with whitespace collapse and casefold dedupe', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: {
          add: ['  Patrol   pressure  rising  ', 'patrol pressure rising'],
          removeIds: [],
          replace: [],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsAdded).toEqual(['Patrol pressure rising']);
  });

  it('expands replace intents into remove+add operations for text/thread/character-state categories', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: {
          add: [],
          removeIds: [],
          replace: [{ removeId: 'th-1', addText: '   Patrols split into two search teams  ' }],
        },
        threads: {
          add: [],
          resolveIds: [],
          replace: [{ resolveId: 'td-1', add: { text: 'Find a hidden route', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM } }],
        },
        characterState: {
          add: [],
          removeIds: [],
          replace: [{ removeId: 'cs-1', add: { characterName: ' Mara ', states: ['  Focused  under pressure  '] } }],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsRemoved).toEqual(['th-1']);
    expect(result.threatsAdded).toEqual(['Patrols split into two search teams']);
    expect(result.threadsResolved).toEqual(['td-1']);
    expect(result.threadsAdded).toEqual([
      { text: 'Find a hidden route', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM },
    ]);
    expect(result.characterStateChangesRemoved).toEqual(['cs-1']);
    expect(result.characterStateChangesAdded).toEqual([
      { characterName: 'Mara', states: ['Focused under pressure'] },
    ]);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('rejects unknown remove/resolve IDs with deterministic diagnostics', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: { add: [], removeIds: ['th-999'], replace: [] },
        threads: { add: [], resolveIds: ['td-999'], replace: [] },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsRemoved).toEqual([]);
    expect(result.threadsResolved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'UNKNOWN_STATE_ID',
        field: 'threatsRemoved',
        message: 'Unknown state ID "th-999" in threatsRemoved.',
      },
      {
        code: 'UNKNOWN_STATE_ID',
        field: 'threadsResolved',
        message: 'Unknown state ID "td-999" in threadsResolved.',
      },
    ]);
  });

  it('returns diagnostics for malformed replace payloads and does not apply malformed entries', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: {
          add: [],
          removeIds: [],
          replace: [{ removeId: '   ', addText: 'valid text' }],
        },
        characterState: {
          add: [],
          removeIds: [],
          replace: [{ removeId: 'cs-1', add: { characterName: 'Mara', states: ['   '] } }],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsAdded).toEqual([]);
    expect(result.threatsRemoved).toEqual([]);
    expect(result.characterStateChangesAdded).toEqual([]);
    expect(result.characterStateChangesRemoved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'MALFORMED_REPLACE_PAYLOAD',
        field: 'stateIntents.threats.replace[0]',
        message: 'Malformed replace payload at stateIntents.threats.replace[0].',
      },
      {
        code: 'MALFORMED_REPLACE_PAYLOAD',
        field: 'stateIntents.characterState.replace[0]',
        message: 'Malformed replace payload at stateIntents.characterState.replace[0].',
      },
    ]);
  });

  it('produces stable output for repeated runs with identical input', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        inventory: {
          add: ['  Lockpick   Set ', 'lockpick set'],
          removeIds: ['inv-1'],
          replace: [],
        },
      },
    });
    const writer = buildWriterResult();
    const previousState = buildPreviousState();

    const first = reconcileState(plan, writer, previousState);
    const second = reconcileState(plan, writer, previousState);
    const third = reconcileState(plan, writer, previousState);

    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });
});
