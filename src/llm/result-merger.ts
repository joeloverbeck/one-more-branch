import { createBeatDeviation, createNoDeviation } from '../models/story-arc.js';
import type { StateReconciliationResult } from '../engine/state-reconciler-types.js';
import type { AnalystResult } from './analyst-types.js';
import type { ContinuationGenerationResult } from './generation-pipeline-types.js';
import type { PageWriterResult } from './writer-types.js';

function buildAnalystFields(
  analyst: AnalystResult | null
): Pick<
  ContinuationGenerationResult,
  | 'beatConcluded'
  | 'beatResolution'
  | 'deviation'
  | 'pacingIssueDetected'
  | 'pacingIssueReason'
  | 'recommendedAction'
> {
  const beatConcluded = analyst?.beatConcluded ?? false;
  const beatResolution = analyst?.beatResolution ?? '';
  const deviationReason = analyst?.deviationReason?.trim() ?? '';
  const narrativeSummary = analyst?.narrativeSummary?.trim() ?? '';
  const invalidatedBeatIds = analyst?.invalidatedBeatIds ?? [];

  const deviation =
    analyst?.deviationDetected &&
    deviationReason &&
    narrativeSummary &&
    invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, narrativeSummary)
      : createNoDeviation();

  return {
    beatConcluded,
    beatResolution,
    deviation,
    pacingIssueDetected: analyst?.pacingIssueDetected ?? false,
    pacingIssueReason: analyst?.pacingIssueReason ?? '',
    recommendedAction: analyst?.recommendedAction ?? 'none',
  };
}

export function mergePageWriterAndReconciledStateWithAnalystResults(
  writer: PageWriterResult,
  reconciliation: StateReconciliationResult,
  analyst: AnalystResult | null
): ContinuationGenerationResult {
  const stateDelta = {
    currentLocation: reconciliation.currentLocation,
    threatsAdded: reconciliation.threatsAdded,
    threatsRemoved: reconciliation.threatsRemoved,
    constraintsAdded: reconciliation.constraintsAdded,
    constraintsRemoved: reconciliation.constraintsRemoved,
    threadsAdded: reconciliation.threadsAdded,
    threadsResolved: reconciliation.threadsResolved,
    inventoryAdded: reconciliation.inventoryAdded,
    inventoryRemoved: reconciliation.inventoryRemoved,
    healthAdded: reconciliation.healthAdded,
    healthRemoved: reconciliation.healthRemoved,
    characterStateChangesAdded: reconciliation.characterStateChangesAdded,
    characterStateChangesRemoved: reconciliation.characterStateChangesRemoved,
    newCanonFacts: reconciliation.newCanonFacts,
    newCharacterCanonFacts: reconciliation.newCharacterCanonFacts,
    reconciliationDiagnostics: reconciliation.reconciliationDiagnostics,
  };

  return {
    ...writer,
    ...stateDelta,
    ...buildAnalystFields(analyst),
    rawResponse: writer.rawResponse,
  };
}
