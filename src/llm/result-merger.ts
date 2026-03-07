import { createBeatDeviation, createNoDeviation } from '../models/story-arc.js';
import type { ChoiceType, PrimaryDelta } from '../models/choice-enums.js';
import type { StateReconciliationResult } from '../engine/state-reconciler-types.js';
import type { AnalystResult } from './analyst-types.js';
import type { ContinuationGenerationResult } from './generation-pipeline-types.js';
import type { PageWriterResult } from './writer-types.js';

function buildAnalystFields(
  sceneSummary: string,
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
  const canonicalSceneSummary = sceneSummary.trim();
  const invalidatedBeatIds = analyst?.invalidatedBeatIds ?? [];

  const deviation =
    analyst?.deviationDetected &&
    deviationReason &&
    canonicalSceneSummary &&
    invalidatedBeatIds.length > 0
      ? createBeatDeviation(deviationReason, invalidatedBeatIds, canonicalSceneSummary)
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
  analyst: AnalystResult | null,
  choices: ReadonlyArray<{ text: string; choiceType: ChoiceType; primaryDelta: PrimaryDelta }> = [],
  isEnding: boolean = false
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
    ...buildAnalystFields(writer.sceneSummary, analyst),
    isEnding,
    choices: [...choices],
    rawResponse: writer.rawResponse,
  };
}
