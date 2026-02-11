import type {
  CharacterStateIntentAdd,
  CharacterStateIntentReplace,
  PagePlan,
  PageWriterResult,
  TextIntentReplace,
  ThreadAdd,
  ThreadIntentReplace,
} from '../llm/types.js';
import type {
  ReconciledCharacterStateAdd,
  ReconciledThreadAdd,
  StateReconciliationDiagnostic,
  StateReconciliationPreviousState,
  StateReconciliationResult,
} from './state-reconciler-types.js';

const UNKNOWN_STATE_ID = 'UNKNOWN_STATE_ID';
const MALFORMED_REPLACE_PAYLOAD = 'MALFORMED_REPLACE_PAYLOAD';
const DUPLICATE_CANON_FACT = 'DUPLICATE_CANON_FACT';

function normalizeIntentText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function intentComparisonKey(value: string): string {
  return normalizeIntentText(value).toLocaleLowerCase();
}

function normalizeId(value: string): string {
  return value.trim();
}

function dedupeByKey<T>(
  values: readonly T[],
  keyFn: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const value of values) {
    const key = keyFn(value);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(value);
  }

  return result;
}

function normalizeTextIntents(values: readonly string[]): string[] {
  return dedupeByKey(
    values
      .map(normalizeIntentText)
      .filter(Boolean),
    intentComparisonKey,
  );
}

function normalizeAndValidateRemoveIds(
  ids: readonly string[],
  knownIds: ReadonlySet<string>,
  field: string,
  diagnostics: StateReconciliationDiagnostic[],
): string[] {
  const result: string[] = [];

  for (const id of dedupeByKey(ids.map(normalizeId).filter(Boolean), value => value)) {
    if (!knownIds.has(id)) {
      diagnostics.push({
        code: UNKNOWN_STATE_ID,
        field,
        message: `Unknown state ID "${id}" in ${field}.`,
      });
      continue;
    }

    result.push(id);
  }

  return result;
}

function expandTextReplacements(
  replacements: readonly TextIntentReplace[],
  field: string,
  diagnostics: StateReconciliationDiagnostic[],
): { add: string[]; removeIds: string[] } {
  const add: string[] = [];
  const removeIds: string[] = [];

  replacements.forEach((entry, index) => {
    const removeId = normalizeId(entry.removeId);
    const addText = normalizeIntentText(entry.addText);

    if (!removeId || !addText) {
      diagnostics.push({
        code: MALFORMED_REPLACE_PAYLOAD,
        field: `${field}.replace[${index}]`,
        message: `Malformed replace payload at ${field}.replace[${index}].`,
      });
      return;
    }

    removeIds.push(removeId);
    add.push(addText);
  });

  return { add, removeIds };
}

function normalizeThreadAdds(additions: readonly ThreadAdd[]): ReconciledThreadAdd[] {
  return dedupeByKey(
    additions
      .map(entry => ({
        text: normalizeIntentText(entry.text),
        threadType: entry.threadType,
        urgency: entry.urgency,
      }))
      .filter(entry => entry.text),
    entry => `${intentComparisonKey(entry.text)}|${entry.threadType}|${entry.urgency}`,
  );
}

function expandThreadReplacements(
  replacements: readonly ThreadIntentReplace[],
  diagnostics: StateReconciliationDiagnostic[],
): { add: ReconciledThreadAdd[]; resolveIds: string[] } {
  const add: ReconciledThreadAdd[] = [];
  const resolveIds: string[] = [];

  replacements.forEach((entry, index) => {
    const resolveId = normalizeId(entry.resolveId);
    const text = normalizeIntentText(entry.add.text);

    if (!resolveId || !text) {
      diagnostics.push({
        code: MALFORMED_REPLACE_PAYLOAD,
        field: `stateIntents.threads.replace[${index}]`,
        message: `Malformed replace payload at stateIntents.threads.replace[${index}].`,
      });
      return;
    }

    resolveIds.push(resolveId);
    add.push({
      text,
      threadType: entry.add.threadType,
      urgency: entry.add.urgency,
    });
  });

  return { add, resolveIds };
}

function normalizeCharacterStateAdds(
  additions: readonly CharacterStateIntentAdd[],
): ReconciledCharacterStateAdd[] {
  const byCharacter = new Map<string, ReconciledCharacterStateAdd>();

  for (const addition of additions) {
    const characterName = normalizeIntentText(addition.characterName);
    if (!characterName) {
      continue;
    }

    const characterKey = intentComparisonKey(characterName);
    const existing = byCharacter.get(characterKey) ?? {
      characterName,
      states: [],
    };

    const normalizedStates = dedupeByKey(
      addition.states
        .map(normalizeIntentText)
        .filter(Boolean),
      intentComparisonKey,
    );

    existing.states = dedupeByKey(
      [...existing.states, ...normalizedStates],
      intentComparisonKey,
    );

    if (existing.states.length > 0) {
      byCharacter.set(characterKey, existing);
    }
  }

  return [...byCharacter.values()];
}

function expandCharacterStateReplacements(
  replacements: readonly CharacterStateIntentReplace[],
  diagnostics: StateReconciliationDiagnostic[],
): { add: ReconciledCharacterStateAdd[]; removeIds: string[] } {
  const add: ReconciledCharacterStateAdd[] = [];
  const removeIds: string[] = [];

  replacements.forEach((entry, index) => {
    const removeId = normalizeId(entry.removeId);
    const characterName = normalizeIntentText(entry.add.characterName);
    const normalizedStates = dedupeByKey(
      entry.add.states.map(normalizeIntentText).filter(Boolean),
      intentComparisonKey,
    );

    if (!removeId || !characterName || normalizedStates.length === 0) {
      diagnostics.push({
        code: MALFORMED_REPLACE_PAYLOAD,
        field: `stateIntents.characterState.replace[${index}]`,
        message: `Malformed replace payload at stateIntents.characterState.replace[${index}].`,
      });
      return;
    }

    removeIds.push(removeId);
    add.push({
      characterName,
      states: normalizedStates,
    });
  });

  return { add, removeIds };
}

function normalizeCharacterCanonFacts(
  entries: readonly { characterName: string; facts: string[] }[],
  diagnostics: StateReconciliationDiagnostic[],
): Record<string, string[]> {
  const byCharacter = new Map<string, { characterName: string; facts: string[] }>();
  const seenFactsByCharacter = new Map<string, Set<string>>();

  entries.forEach((entry, characterIndex) => {
    const characterName = normalizeIntentText(entry.characterName);
    if (!characterName) {
      return;
    }

    const characterKey = intentComparisonKey(characterName);
    const existing = byCharacter.get(characterKey) ?? {
      characterName,
      facts: [],
    };
    const seenFacts = seenFactsByCharacter.get(characterKey) ?? new Set<string>();

    entry.facts.forEach((fact, factIndex) => {
      const normalizedFact = normalizeIntentText(fact);
      const factKey = intentComparisonKey(fact);
      if (!normalizedFact || !factKey) {
        return;
      }

      if (seenFacts.has(factKey)) {
        diagnostics.push({
          code: DUPLICATE_CANON_FACT,
          field: `stateIntents.canon.characterAdd[${characterIndex}].facts[${factIndex}]`,
          message: `Duplicate canon fact for character "${existing.characterName}" after normalization: "${normalizedFact}".`,
        });
        return;
      }

      seenFacts.add(factKey);
      existing.facts.push(normalizedFact);
    });

    if (existing.facts.length > 0) {
      byCharacter.set(characterKey, existing);
      seenFactsByCharacter.set(characterKey, seenFacts);
    }
  });

  return Object.fromEntries(
    [...byCharacter.values()].map(entry => [entry.characterName, entry.facts]),
  );
}

function normalizeCanonFacts(
  values: readonly string[],
  diagnostics: StateReconciliationDiagnostic[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value, index) => {
    const normalized = normalizeIntentText(value);
    const key = intentComparisonKey(value);

    if (!normalized || !key) {
      return;
    }

    if (seen.has(key)) {
      diagnostics.push({
        code: DUPLICATE_CANON_FACT,
        field: `stateIntents.canon.worldAdd[${index}]`,
        message: `Duplicate canon fact after normalization: "${normalized}".`,
      });
      return;
    }

    seen.add(key);
    result.push(normalized);
  });

  return result;
}

export function reconcileState(
  plan: PagePlan,
  _writerOutput: PageWriterResult,
  previousState: StateReconciliationPreviousState,
): StateReconciliationResult {
  const diagnostics: StateReconciliationDiagnostic[] = [];

  const textReplacementThreats = expandTextReplacements(
    plan.stateIntents.threats.replace,
    'stateIntents.threats',
    diagnostics,
  );
  const textReplacementConstraints = expandTextReplacements(
    plan.stateIntents.constraints.replace,
    'stateIntents.constraints',
    diagnostics,
  );
  const textReplacementInventory = expandTextReplacements(
    plan.stateIntents.inventory.replace,
    'stateIntents.inventory',
    diagnostics,
  );
  const textReplacementHealth = expandTextReplacements(
    plan.stateIntents.health.replace,
    'stateIntents.health',
    diagnostics,
  );

  const threadReplacements = expandThreadReplacements(
    plan.stateIntents.threads.replace,
    diagnostics,
  );

  const characterStateReplacements = expandCharacterStateReplacements(
    plan.stateIntents.characterState.replace,
    diagnostics,
  );

  const threatsRemoved = normalizeAndValidateRemoveIds(
    [...plan.stateIntents.threats.removeIds, ...textReplacementThreats.removeIds],
    new Set(previousState.threats.map(entry => entry.id)),
    'threatsRemoved',
    diagnostics,
  );

  const constraintsRemoved = normalizeAndValidateRemoveIds(
    [...plan.stateIntents.constraints.removeIds, ...textReplacementConstraints.removeIds],
    new Set(previousState.constraints.map(entry => entry.id)),
    'constraintsRemoved',
    diagnostics,
  );

  const threadsResolved = normalizeAndValidateRemoveIds(
    [...plan.stateIntents.threads.resolveIds, ...threadReplacements.resolveIds],
    new Set(previousState.threads.map(entry => entry.id)),
    'threadsResolved',
    diagnostics,
  );

  const inventoryRemoved = normalizeAndValidateRemoveIds(
    [...plan.stateIntents.inventory.removeIds, ...textReplacementInventory.removeIds],
    new Set(previousState.inventory.map(entry => entry.id)),
    'inventoryRemoved',
    diagnostics,
  );

  const healthRemoved = normalizeAndValidateRemoveIds(
    [...plan.stateIntents.health.removeIds, ...textReplacementHealth.removeIds],
    new Set(previousState.health.map(entry => entry.id)),
    'healthRemoved',
    diagnostics,
  );

  const characterStateChangesRemoved = normalizeAndValidateRemoveIds(
    [
      ...plan.stateIntents.characterState.removeIds,
      ...characterStateReplacements.removeIds,
    ],
    new Set(previousState.characterState.map(entry => entry.id)),
    'characterStateChangesRemoved',
    diagnostics,
  );

  return {
    currentLocation: previousState.currentLocation,
    threatsAdded: normalizeTextIntents([
      ...plan.stateIntents.threats.add,
      ...textReplacementThreats.add,
    ]),
    threatsRemoved,
    constraintsAdded: normalizeTextIntents([
      ...plan.stateIntents.constraints.add,
      ...textReplacementConstraints.add,
    ]),
    constraintsRemoved,
    threadsAdded: normalizeThreadAdds([
      ...plan.stateIntents.threads.add,
      ...threadReplacements.add,
    ]),
    threadsResolved,
    inventoryAdded: normalizeTextIntents([
      ...plan.stateIntents.inventory.add,
      ...textReplacementInventory.add,
    ]),
    inventoryRemoved,
    healthAdded: normalizeTextIntents([
      ...plan.stateIntents.health.add,
      ...textReplacementHealth.add,
    ]),
    healthRemoved,
    characterStateChangesAdded: normalizeCharacterStateAdds([
      ...plan.stateIntents.characterState.add,
      ...characterStateReplacements.add,
    ]),
    characterStateChangesRemoved,
    newCanonFacts: normalizeCanonFacts(plan.stateIntents.canon.worldAdd, diagnostics),
    newCharacterCanonFacts: normalizeCharacterCanonFacts(
      plan.stateIntents.canon.characterAdd,
      diagnostics,
    ),
    reconciliationDiagnostics: diagnostics,
  };
}
