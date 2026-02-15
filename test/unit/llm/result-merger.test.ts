import { mergePageWriterAndReconciledStateWithAnalystResults } from '../../../src/llm/result-merger.js';
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

    const result = mergePageWriterAndReconciledStateWithAnalystResults(
      writer,
      reconciliation,
      analyst
    );

    expect(result.narrative).toBe(writer.narrative);
    expect(result.choices).toEqual(writer.choices);
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
});
