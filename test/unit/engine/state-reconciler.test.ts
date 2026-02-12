import fs from 'node:fs';
import path from 'node:path';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums';
import { ThreadType, Urgency } from '../../../src/models/state';
import type { PagePlan, PageWriterResult } from '../../../src/llm/types';
import { reconcileState } from '../../../src/engine/state-reconciler';
import type { StateReconciliationPreviousState } from '../../../src/engine/state-reconciler-types';

function buildPlan(overrides?: Partial<PagePlan>): PagePlan {
  return {
    sceneIntent: 'Advance the scene with concrete consequences.',
    continuityAnchors: ['Watch patrols every bridge crossing'],
    stateIntents: {
      currentLocation: 'South market district',
      threats: { add: [], removeIds: [] },
      constraints: { add: [], removeIds: [] },
      threads: { add: [], resolveIds: [] },
      inventory: { add: [], removeIds: [] },
      health: { add: [], removeIds: [] },
      characterState: { add: [], removeIds: [] },
      canon: { worldAdd: [], characterAdd: [] },
    },
    writerBrief: {
      openingLineDirective: 'Open with motion under pressure.',
      mustIncludeBeats: ['Immediate consequence'],
      forbiddenRecaps: ['Do not restate the prior page ending'],
    },
    dramaticQuestion: 'Will you confront the danger or seek another path?',
    choiceIntents: [
      { hook: 'Face the threat directly', choiceType: ChoiceType.CONFRONTATION, primaryDelta: PrimaryDelta.THREAT_SHIFT },
      { hook: 'Find an alternative route', choiceType: ChoiceType.TACTICAL_APPROACH, primaryDelta: PrimaryDelta.LOCATION_CHANGE },
    ],
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

const THRESHOLD_PREVIOUS_TOKENS = [
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
] as const;

interface ThreadDedupFixtureThread {
  id: string;
  text: string;
  threadType: ThreadType;
  urgency: Urgency;
}

interface ThreadDedupFixtureScenario {
  add: {
    text: string;
    threadType: ThreadType;
    urgency: Urgency;
  }[];
  resolveIds: string[];
  expectedDuplicateOfId?: string;
}

interface ThreadDedupFixture {
  previousThreads: ThreadDedupFixtureThread[];
  scenarios: {
    duplicateWithoutResolve: ThreadDedupFixtureScenario;
    replacementWithResolve: ThreadDedupFixtureScenario;
    distinctSharedEntities: ThreadDedupFixtureScenario;
  };
}

function loadThreadDedupFixture(): ThreadDedupFixture {
  const fixturePath = path.join(
    __dirname,
    '../../fixtures/reconciler/thread-dedup/alicia-bobby-duplicate-loops.json',
  );
  const fixtureContents = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(fixtureContents) as ThreadDedupFixture;
}

const THREAD_DEDUP_FIXTURE = loadThreadDedupFixture();

function buildThreadAddPlan(threadType: ThreadType, text: string): PagePlan {
  return buildPlan({
    stateIntents: {
      ...buildPlan().stateIntents,
      threads: {
        add: [{ text, threadType, urgency: Urgency.HIGH }],
        resolveIds: [],
      },
    },
  });
}

function buildThreadEvidenceWriter(threadText: string): PageWriterResult {
  return buildWriterResult({
    narrative: `Mara keeps repeating ${threadText} while planning the next move.`,
    sceneSummary: `The scene keeps this focus in view: ${threadText}.`,
  });
}

function buildPreviousStateWithThread(
  threadType: ThreadType,
  text: string,
): StateReconciliationPreviousState {
  return {
    ...buildPreviousState(),
    threads: [{ id: 'td-threshold', text, threadType, urgency: Urgency.HIGH }],
  };
}

function buildPreviousStateWithThreads(
  threads: StateReconciliationPreviousState['threads'],
): StateReconciliationPreviousState {
  return {
    ...buildPreviousState(),
    threads,
  };
}

function buildThreadFixturePlan(scenario: ThreadDedupFixtureScenario): PagePlan {
  return buildPlan({
    stateIntents: {
      ...buildPlan().stateIntents,
      threads: {
        add: scenario.add,
        resolveIds: scenario.resolveIds,
      },
    },
  });
}

describe('state-reconciler', () => {
  it('normalizes intent text deterministically with whitespace collapse and casefold dedupe', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: {
          add: ['  Patrol   pressure  rising  ', 'patrol pressure rising'],
          removeIds: [],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsAdded).toEqual(['Patrol pressure rising']);
  });

  it('applies remove+add progression for text/thread/character-state categories', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: {
          add: ['   Patrols split into two search teams  '],
          removeIds: ['th-1'],
        },
        threads: {
          add: [{ text: 'Find a hidden route', threadType: ThreadType.QUEST, urgency: Urgency.MEDIUM }],
          resolveIds: ['td-1'],
        },
        characterState: {
          add: [{ characterName: ' Mara ', states: ['  Focused  under pressure  '] }],
          removeIds: ['cs-1'],
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

  it('rejects near-duplicate thread add intents when equivalent previous thread is not resolved', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threads: {
          add: [
            {
              text: 'Safely reach the archive',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
      },
    });

    const writer = buildWriterResult({
      narrative: 'Mara studies every route to safely reach the archive before patrols tighten.',
      sceneSummary: 'The archive remains central to her objective.',
    });

    const result = reconcileState(plan, writer, buildPreviousState());

    expect(result.threadsAdded).toEqual([]);
    expect(result.threadsResolved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'THREAD_DUPLICATE_LIKE_ADD',
        field: 'threadsAdded',
        message:
          'Thread add "Safely reach the archive" is near-duplicate of existing thread "td-1".',
      },
      {
        code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
        field: 'threadsAdded',
        message:
          'Near-duplicate thread add "Safely reach the archive" requires resolving "td-1" in the same payload.',
      },
    ]);
  });

  it('allows equivalent thread refinement when the previous equivalent thread is resolved', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threads: {
          add: [
            {
              text: 'Safely reach the archive and extract the ledger',
              threadType: ThreadType.QUEST,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: ['td-1'],
        },
      },
    });

    const writer = buildWriterResult({
      narrative:
        'Mara reaches the archive safely, then commits to extracting the hidden ledger.',
      sceneSummary: 'The archive objective is refined with a concrete next step.',
    });

    const result = reconcileState(plan, writer, buildPreviousState());

    expect(result.threadsResolved).toEqual(['td-1']);
    expect(result.threadsAdded).toEqual([
      {
        text: 'Safely reach the archive and extract the ledger',
        threadType: ThreadType.QUEST,
        urgency: Urgency.HIGH,
      },
    ]);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('rejects fixture-backed duplicate relationship loop adds without explicit resolve', () => {
    const scenario = THREAD_DEDUP_FIXTURE.scenarios.duplicateWithoutResolve;
    const candidateText = scenario.add[0]?.text ?? '';
    const duplicateId = scenario.expectedDuplicateOfId ?? '';
    const result = reconcileState(
      buildThreadFixturePlan(scenario),
      buildThreadEvidenceWriter(candidateText),
      buildPreviousStateWithThreads(THREAD_DEDUP_FIXTURE.previousThreads),
    );

    expect(result.threadsAdded).toEqual([]);
    expect(result.threadsResolved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'THREAD_DUPLICATE_LIKE_ADD',
        field: 'threadsAdded',
        message: `Thread add "${candidateText}" is near-duplicate of existing thread "${duplicateId}".`,
      },
      {
        code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
        field: 'threadsAdded',
        message: `Near-duplicate thread add "${candidateText}" requires resolving "${duplicateId}" in the same payload.`,
      },
    ]);
  });

  it('accepts fixture-backed duplicate relationship refinement when matching resolve is present', () => {
    const scenario = THREAD_DEDUP_FIXTURE.scenarios.replacementWithResolve;
    const candidateText = scenario.add[0]?.text ?? '';
    const result = reconcileState(
      buildThreadFixturePlan(scenario),
      buildThreadEvidenceWriter(candidateText),
      buildPreviousStateWithThreads(THREAD_DEDUP_FIXTURE.previousThreads),
    );

    expect(result.threadsAdded).toEqual(scenario.add);
    expect(result.threadsResolved).toEqual(scenario.resolveIds);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('allows fixture-backed shared-entity loops when unresolved questions differ', () => {
    const scenario = THREAD_DEDUP_FIXTURE.scenarios.distinctSharedEntities;
    const candidateText = scenario.add[0]?.text ?? '';
    const result = reconcileState(
      buildThreadFixturePlan(scenario),
      buildThreadEvidenceWriter(candidateText),
      buildPreviousStateWithThreads(THREAD_DEDUP_FIXTURE.previousThreads),
    );

    expect(result.threadsAdded).toEqual(scenario.add);
    expect(result.threadsResolved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it.each([
    {
      label: '0.58 threshold group (RELATIONSHIP)',
      threadType: ThreadType.RELATIONSHIP,
      belowOverlapTokenCount: 6,
      duplicateOverlapTokenCount: 7,
    },
    {
      label: '0.62 threshold group (MYSTERY)',
      threadType: ThreadType.MYSTERY,
      belowOverlapTokenCount: 7,
      duplicateOverlapTokenCount: 8,
    },
    {
      label: '0.66 threshold group (QUEST)',
      threadType: ThreadType.QUEST,
      belowOverlapTokenCount: 7,
      duplicateOverlapTokenCount: 8,
    },
  ])(
    'enforces deterministic near-duplicate boundaries for $label',
    ({
      threadType,
      belowOverlapTokenCount,
      duplicateOverlapTokenCount,
    }: {
      threadType: ThreadType;
      belowOverlapTokenCount: number;
      duplicateOverlapTokenCount: number;
    }) => {
      const previousText = THRESHOLD_PREVIOUS_TOKENS.join(' ');
      const belowThresholdText = THRESHOLD_PREVIOUS_TOKENS.slice(
        0,
        belowOverlapTokenCount,
      ).join(' ');
      const duplicateText = THRESHOLD_PREVIOUS_TOKENS.slice(
        0,
        duplicateOverlapTokenCount,
      ).join(' ');
      const previousState = buildPreviousStateWithThread(threadType, previousText);

      const belowThresholdResult = reconcileState(
        buildThreadAddPlan(threadType, belowThresholdText),
        buildThreadEvidenceWriter(belowThresholdText),
        previousState,
      );

      expect(belowThresholdResult.threadsAdded).toEqual([
        { text: belowThresholdText, threadType, urgency: Urgency.HIGH },
      ]);
      expect(belowThresholdResult.reconciliationDiagnostics).toEqual([]);

      const duplicateResult = reconcileState(
        buildThreadAddPlan(threadType, duplicateText),
        buildThreadEvidenceWriter(duplicateText),
        previousState,
      );

      expect(duplicateResult.threadsAdded).toEqual([]);
      expect(duplicateResult.reconciliationDiagnostics).toEqual([
        {
          code: 'THREAD_DUPLICATE_LIKE_ADD',
          field: 'threadsAdded',
          message:
            `Thread add "${duplicateText}" is near-duplicate of existing thread "td-threshold".`,
        },
        {
          code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
          field: 'threadsAdded',
          message:
            `Near-duplicate thread add "${duplicateText}" requires resolving "td-threshold" in the same payload.`,
        },
      ]);
    },
  );

  it('trims filler stop-phrases before thread similarity scoring', () => {
    const previousText = 'decode hidden ledger cipher';
    const candidateText = 'decode hidden ledger cipher at this point currently';
    const plan = buildThreadAddPlan(ThreadType.MYSTERY, candidateText);
    const writer = buildThreadEvidenceWriter(candidateText);
    const previousState = buildPreviousStateWithThread(ThreadType.MYSTERY, previousText);

    const result = reconcileState(plan, writer, previousState);

    expect(result.threadsAdded).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'THREAD_DUPLICATE_LIKE_ADD',
        field: 'threadsAdded',
        message:
          `Thread add "${candidateText}" is near-duplicate of existing thread "td-threshold".`,
      },
      {
        code: 'THREAD_MISSING_EQUIVALENT_RESOLVE',
        field: 'threadsAdded',
        message:
          `Near-duplicate thread add "${candidateText}" requires resolving "td-threshold" in the same payload.`,
      },
    ]);
  });

  it('rejects near-duplicate thread adds within the same payload deterministically', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threads: {
          add: [
            {
              text: 'Decode the cipher ledger',
              threadType: ThreadType.INFORMATION,
              urgency: Urgency.MEDIUM,
            },
            {
              text: 'Decode cipher ledger',
              threadType: ThreadType.INFORMATION,
              urgency: Urgency.MEDIUM,
            },
          ],
          resolveIds: [],
        },
      },
    });

    const writer = buildWriterResult({
      narrative: 'She vows to decode the cipher ledger before dawn.',
      sceneSummary: 'The cipher ledger becomes the key open question.',
    });

    const result = reconcileState(plan, writer, buildPreviousState());

    expect(result.threadsAdded).toEqual([
      {
        text: 'Decode the cipher ledger',
        threadType: ThreadType.INFORMATION,
        urgency: Urgency.MEDIUM,
      },
    ]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'THREAD_DUPLICATE_LIKE_ADD',
        field: 'threadsAdded',
        message:
          'Thread add "Decode cipher ledger" is near-duplicate of another added thread "Decode the cipher ledger".',
      },
    ]);
  });

  it('rejects DANGER threads that describe immediate scene hazards', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threads: {
          add: [
            {
              text: 'The roof is collapsing right now',
              threadType: ThreadType.DANGER,
              urgency: Urgency.HIGH,
            },
          ],
          resolveIds: [],
        },
      },
    });

    const writer = buildWriterResult({
      narrative: 'Sparks shower as the roof is collapsing right now above Mara.',
      sceneSummary: 'The tavern may fail in seconds.',
    });

    const result = reconcileState(plan, writer, buildPreviousState());

    expect(result.threadsAdded).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([
      {
        code: 'THREAD_DANGER_IMMEDIATE_HAZARD',
        field: 'threadsAdded',
        message:
          'DANGER thread "The roof is collapsing right now" describes an immediate scene hazard and must be tracked as a threat/constraint instead.',
      },
    ]);
  });

  it('rejects unknown remove/resolve IDs with deterministic diagnostics', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        threats: { add: [], removeIds: ['th-999'] },
        threads: { add: [], resolveIds: ['td-999'] },
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
        inventory: { add: [], removeIds: ['inv-999'] },
        health: { add: [], removeIds: ['hp-999'] },
        characterState: { add: [], removeIds: ['cs-999'] },
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

  it('drops malformed character-state additions without emitting reconciliation diagnostics', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        characterState: {
          add: [{ characterName: 'Mara', states: ['   '] }],
          removeIds: [],
        },
      },
    });

    const result = reconcileState(plan, buildWriterResult(), buildPreviousState());

    expect(result.threatsAdded).toEqual([]);
    expect(result.threatsRemoved).toEqual([]);
    expect(result.characterStateChangesAdded).toEqual([]);
    expect(result.characterStateChangesRemoved).toEqual([]);
    expect(result.reconciliationDiagnostics).toEqual([]);
  });

  it('produces stable output for repeated runs with identical input', () => {
    const plan = buildPlan({
      stateIntents: {
        ...buildPlan().stateIntents,
        inventory: {
          add: ['  Lockpick   Set ', 'lockpick set'],
          removeIds: ['inv-1'],
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
