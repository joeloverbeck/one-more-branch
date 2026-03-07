import { mergePageWriterAndReconciledStateWithAnalystResults } from '../../../src/llm/result-merger.js';
import type { AnalystResult } from '../../../src/llm/analyst-types.js';
import { ChoiceType, PrimaryDelta } from '../../../src/models/choice-enums.js';
import { ThreatType } from '../../../src/models/index.js';
import {
  createMockPageWriterResult,
  createMockReconciliationResult,
  createMockAnalystResult,
} from '../../fixtures/llm-results.js';

describe('mergePageWriterAndReconciledStateWithAnalystResults', () => {
  it('merges creative writer fields with reconciled deltas and analyst fields', () => {
    const writer = createMockPageWriterResult();
    const reconciliation = createMockReconciliationResult({
      currentLocation: 'Reconciled cave',
      threatsAdded: [
        {
          text: 'THREAT_BATS_RECONCILED: Confirmed bat swarm',
          threatType: ThreatType.ENVIRONMENTAL,
        },
      ],
    });
    const analyst = createMockAnalystResult({
      beatConcluded: true,
      beatResolution: 'The scene stabilizes',
    });
    const choices = [
      { text: 'Go left', choiceType: ChoiceType.INTERVENE, primaryDelta: PrimaryDelta.GOAL_PRIORITY_CHANGE },
      { text: 'Go right', choiceType: ChoiceType.INVESTIGATE, primaryDelta: PrimaryDelta.INFORMATION_STATE_CHANGE },
    ];

    const result = mergePageWriterAndReconciledStateWithAnalystResults(
      writer,
      reconciliation,
      analyst,
      choices
    );

    expect(result.narrative).toBe(writer.narrative);
    expect(result.choices).toEqual(choices);
    expect(result.currentLocation).toBe('Reconciled cave');
    expect(result.threatsAdded).toEqual([
      {
        text: 'THREAT_BATS_RECONCILED: Confirmed bat swarm',
        threatType: ThreatType.ENVIRONMENTAL,
      },
    ]);
    expect(result.beatConcluded).toBe(true);
    expect(result.beatResolution).toBe('The scene stabilizes');
  });

  it('uses writer rawResponse and preserves reconciliation diagnostics', () => {
    const writer = createMockPageWriterResult({ rawResponse: 'writer-only-raw' });
    const reconciliation = createMockReconciliationResult({
      reconciliationDiagnostics: [{ code: 'WARN', message: 'diagnostic detail' }],
    });

    const result = mergePageWriterAndReconciledStateWithAnalystResults(
      writer,
      reconciliation,
      null
    );

    expect(result.rawResponse).toBe('writer-only-raw');
    expect(result.reconciliationDiagnostics).toEqual([
      { code: 'WARN', message: 'diagnostic detail' },
    ]);
  });

  it('uses writer sceneSummary as the canonical deviation summary', () => {
    const writer = createMockPageWriterResult({
      sceneSummary: 'Writer summary is canonical.',
    });
    const reconciliation = createMockReconciliationResult();
    const analyst = {
      ...createMockAnalystResult({
        deviationDetected: true,
        deviationReason: 'Plan no longer matches events.',
        invalidatedBeatIds: ['1.2'],
      }),
      sceneSummary: 'Analyst summary should be ignored.',
    } as unknown as AnalystResult;

    const result = mergePageWriterAndReconciledStateWithAnalystResults(
      writer,
      reconciliation,
      analyst
    );

    expect(result.deviation).toEqual({
      detected: true,
      reason: 'Plan no longer matches events.',
      invalidatedBeatIds: ['1.2'],
      sceneSummary: 'Writer summary is canonical.',
    });
  });
});
