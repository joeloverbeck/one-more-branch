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

function buildWriterResult(overrides?: Partial<PageWriterResult>): PageWriterResult {
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
    sceneSummary: 'Patrol pressure increases, routes narrow, and Mara stays wary of informants.',
    rawResponse: '{"ok":true}',
    ...overrides,
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

  it('validates cross-field inventory/health/character-state remove IDs against previous-state IDs', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        inventory: { add: [], removeIds: ['inv-999'], replace: [] },
        health: { add: [], removeIds: ['hp-999'], replace: [] },
        characterState: { add: [], removeIds: ['cs-999'], replace: [] },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.inventoryRemoved).toEqual([]);
    expect(result.healthRemoved).toEqual([]);
    expect(result.characterStateChangesRemoved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'UNKNOWN_STATE_ID',
        field: 'inventoryRemoved',
        message: 'Unknown state ID "inv-999" in inventoryRemoved.',
      },
      {
        code: 'UNKNOWN_STATE_ID',
        field: 'healthRemoved',
        message: 'Unknown state ID "hp-999" in healthRemoved.',
      },
      {
        code: 'UNKNOWN_STATE_ID',
        field: 'characterStateChangesRemoved',
        message: 'Unknown state ID "cs-999" in characterStateChangesRemoved.',
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

  it('reports canon duplicates under reconciler normalization and keeps deterministic first-seen facts', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        canon: {
          worldAdd: ['  Iron   gates remain sealed ', 'iron gates remain sealed'],
          characterAdd: [
            { characterName: 'Mara', facts: ['Keeps a hidden ledger', '  keeps   a hidden ledger '] },
            { characterName: ' mara ', facts: ['Distrusts city watch', 'distrusts   city   watch'] },
          ],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.newCanonFacts).toEqual(['Iron gates remain sealed']);
    expect(result.newCharacterCanonFacts).toEqual({
      Mara: ['Keeps a hidden ledger', 'Distrusts city watch'],
    });
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'DUPLICATE_CANON_FACT',
        field: 'stateIntents.canon.worldAdd[1]',
        message: 'Duplicate canon fact after normalization: "iron gates remain sealed".',
      },
      {
        code: 'DUPLICATE_CANON_FACT',
        field: 'stateIntents.canon.characterAdd[0].facts[1]',
        message: 'Duplicate canon fact for character "Mara" after normalization: "keeps a hidden ledger".',
      },
      {
        code: 'DUPLICATE_CANON_FACT',
        field: 'stateIntents.canon.characterAdd[1].facts[1]',
        message: 'Duplicate canon fact for character "Mara" after normalization: "distrusts city watch".',
      },
    ]);
  });

  it('drops intents with no narrative evidence and emits machine-readable diagnostics', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        constraints: {
          add: ['Obsidian cipher fallback'],
          removeIds: [],
          replace: [],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.constraintsAdded).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'MISSING_NARRATIVE_EVIDENCE',
        field: 'constraintsAdded',
        anchor: 'obsidian',
        message: 'No narrative evidence found for constraintsAdded anchor "obsidian".',
      },
    ]);
  });

  it('matches evidence anchors deterministically across punctuation and case differences', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        inventory: {
          add: ['IRON-GATE breach kit'],
          removeIds: [],
          replace: [],
        },
      },
    });

    const writer = buildWriterResult({
      narrative: 'She braces as the iron gate erupts inward.',
      sceneSummary: 'A breach opens while patrols regroup.',
    });

    const result = reconcileState(plan, writer, buildPreviousState());

    expect(result.inventoryAdded).toEqual(['IRON-GATE breach kit']);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });
});
