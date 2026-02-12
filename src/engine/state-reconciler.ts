import type { PagePlan, PageWriterResult, TextIntentMutations } from '../llm/types.js';
import type { KeyedEntry } from '../models/state/index.js';
import type {
  StateReconciliationDiagnostic,
  StateReconciliationPreviousState,
  StateReconciliationResult,
} from './state-reconciler-types.js';
import {
  normalizeEvidenceText,
  normalizeTextIntents,
  normalizeAndValidateRemoveIds,
  applyNarrativeEvidenceGate,
} from './reconciler-text-utils.js';
import {
  normalizeThreadAdds,
  applyThreadDedupAndContradictionRules,
} from './reconciler-thread-dedup.js';
import {
  normalizeCanonFacts,
  normalizeCharacterCanonFacts,
} from './reconciler-canon-normalization.js';
import { normalizeCharacterStateAdds } from './reconciler-character-state.js';

function reconcileTextMutationField(
  mutations: TextIntentMutations,
  previousEntries: readonly KeyedEntry[],
  addedField: string,
  removedField: string,
  evidenceText: string,
  diagnostics: StateReconciliationDiagnostic[],
): { added: string[]; removed: string[] } {
  const validatedRemoveIds = normalizeAndValidateRemoveIds(
    mutations.removeIds,
    new Set(previousEntries.map(entry => entry.id)),
    removedField,
    diagnostics,
  );

  const added = applyNarrativeEvidenceGate(
    normalizeTextIntents(mutations.add),
    addedField,
    value => value,
    evidenceText,
    diagnostics,
  );

  const removed = applyNarrativeEvidenceGate(
    validatedRemoveIds,
    removedField,
    value => previousEntries.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
    diagnostics,
  );

  return { added, removed };
}

export function reconcileState(
  plan: PagePlan,
  writerOutput: PageWriterResult,
  previousState: StateReconciliationPreviousState,
): StateReconciliationResult {
  const diagnostics: StateReconciliationDiagnostic[] = [];
  const evidenceText = normalizeEvidenceText(
    `${writerOutput.narrative} ${writerOutput.sceneSummary}`,
  );

  const threats = reconcileTextMutationField(
    plan.stateIntents.threats,
    previousState.threats,
    'threatsAdded',
    'threatsRemoved',
    evidenceText,
    diagnostics,
  );

  const constraints = reconcileTextMutationField(
    plan.stateIntents.constraints,
    previousState.constraints,
    'constraintsAdded',
    'constraintsRemoved',
    evidenceText,
    diagnostics,
  );

  const threadsResolved = normalizeAndValidateRemoveIds(
    plan.stateIntents.threads.resolveIds,
    new Set(previousState.threads.map(entry => entry.id)),
    'threadsResolved',
    diagnostics,
  );

  const threadsAdded = applyNarrativeEvidenceGate(
    applyThreadDedupAndContradictionRules(
      normalizeThreadAdds(plan.stateIntents.threads.add),
      previousState.threads,
      threadsResolved,
      diagnostics,
    ),
    'threadsAdded',
    value => value.text,
    evidenceText,
    diagnostics,
  );

  const threadsResolvedWithEvidence = applyNarrativeEvidenceGate(
    threadsResolved,
    'threadsResolved',
    value => previousState.threads.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
    diagnostics,
  );

  const inventory = reconcileTextMutationField(
    plan.stateIntents.inventory,
    previousState.inventory,
    'inventoryAdded',
    'inventoryRemoved',
    evidenceText,
    diagnostics,
  );

  const health = reconcileTextMutationField(
    plan.stateIntents.health,
    previousState.health,
    'healthAdded',
    'healthRemoved',
    evidenceText,
    diagnostics,
  );

  const characterStateChangesRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.characterState.removeIds,
    new Set(previousState.characterState.map(entry => entry.id)),
    'characterStateChangesRemoved',
    diagnostics,
  );

  const characterStateChangesAdded = applyNarrativeEvidenceGate(
    normalizeCharacterStateAdds(plan.stateIntents.characterState.add),
    'characterStateChangesAdded',
    value => `${value.characterName} ${value.states.join(' ')}`,
    evidenceText,
    diagnostics,
  );

  const characterStateChangesRemovedWithEvidence = applyNarrativeEvidenceGate(
    characterStateChangesRemoved,
    'characterStateChangesRemoved',
    value => previousState.characterState.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
    diagnostics,
  );

  const reconciledCurrentLocation =
    plan.stateIntents.currentLocation?.trim() || previousState.currentLocation;

  return {
    currentLocation: reconciledCurrentLocation,
    threatsAdded: threats.added,
    threatsRemoved: threats.removed,
    constraintsAdded: constraints.added,
    constraintsRemoved: constraints.removed,
    threadsAdded,
    threadsResolved: threadsResolvedWithEvidence,
    inventoryAdded: inventory.added,
    inventoryRemoved: inventory.removed,
    healthAdded: health.added,
    healthRemoved: health.removed,
    characterStateChangesAdded,
    characterStateChangesRemoved: characterStateChangesRemovedWithEvidence,
    newCanonFacts: normalizeCanonFacts(plan.stateIntents.canon.worldAdd, diagnostics),
    newCharacterCanonFacts: normalizeCharacterCanonFacts(
      plan.stateIntents.canon.characterAdd,
      diagnostics,
    ),
    reconciliationDiagnostics: diagnostics,
  };
}
