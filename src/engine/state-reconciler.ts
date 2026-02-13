import type { PagePlan, TextIntentMutations } from '../llm/planner-types.js';
import type { KeyedEntry } from '../models/state/index.js';
import type {
  StateReconciliationDiagnostic,
  StateReconciliationPreviousState,
  StateReconciliationResult,
} from './state-reconciler-types.js';
import {
  normalizeTextIntents,
  normalizeAndValidateRemoveIds,
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
  removedField: string,
  diagnostics: StateReconciliationDiagnostic[]
): { added: string[]; removed: string[] } {
  const removed = normalizeAndValidateRemoveIds(
    mutations.removeIds,
    new Set(previousEntries.map((entry) => entry.id)),
    removedField,
    diagnostics
  );

  const added = normalizeTextIntents(mutations.add);

  return { added, removed };
}

export function reconcileState(
  plan: PagePlan,
  _writerOutput: unknown,
  previousState: StateReconciliationPreviousState
): StateReconciliationResult {
  const diagnostics: StateReconciliationDiagnostic[] = [];

  const threats = reconcileTextMutationField(
    plan.stateIntents.threats,
    previousState.threats,
    'threatsRemoved',
    diagnostics
  );

  const constraints = reconcileTextMutationField(
    plan.stateIntents.constraints,
    previousState.constraints,
    'constraintsRemoved',
    diagnostics
  );

  const threadsResolved = normalizeAndValidateRemoveIds(
    plan.stateIntents.threads.resolveIds,
    new Set(previousState.threads.map((entry) => entry.id)),
    'threadsResolved',
    diagnostics
  );

  const threadsAdded = applyThreadDedupAndContradictionRules(
    normalizeThreadAdds(plan.stateIntents.threads.add),
    previousState.threads,
    threadsResolved,
    diagnostics
  );

  const inventory = reconcileTextMutationField(
    plan.stateIntents.inventory,
    previousState.inventory,
    'inventoryRemoved',
    diagnostics
  );

  const health = reconcileTextMutationField(
    plan.stateIntents.health,
    previousState.health,
    'healthRemoved',
    diagnostics
  );

  const characterStateChangesRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.characterState.removeIds,
    new Set(previousState.characterState.map((entry) => entry.id)),
    'characterStateChangesRemoved',
    diagnostics
  );

  const characterStateChangesAdded = normalizeCharacterStateAdds(
    plan.stateIntents.characterState.add
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
    threadsResolved,
    inventoryAdded: inventory.added,
    inventoryRemoved: inventory.removed,
    healthAdded: health.added,
    healthRemoved: health.removed,
    characterStateChangesAdded,
    characterStateChangesRemoved,
    newCanonFacts: normalizeCanonFacts(plan.stateIntents.canon.worldAdd, diagnostics),
    newCharacterCanonFacts: normalizeCharacterCanonFacts(
      plan.stateIntents.canon.characterAdd,
      diagnostics
    ),
    reconciliationDiagnostics: diagnostics,
  };
}
