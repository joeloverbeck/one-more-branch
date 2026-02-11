import type {
  CharacterStateIntentAdd,
  PagePlan,
  PageWriterResult,
  ThreadAdd,
} from '../llm/types.js';
import { ThreadType } from '../models/state/index.js';
import type {
  ReconciledCharacterStateAdd,
  ReconciledThreadAdd,
  StateReconciliationDiagnostic,
  StateReconciliationPreviousState,
  StateReconciliationResult,
} from './state-reconciler-types.js';

const UNKNOWN_STATE_ID = 'UNKNOWN_STATE_ID';
const DUPLICATE_CANON_FACT = 'DUPLICATE_CANON_FACT';
const MISSING_NARRATIVE_EVIDENCE = 'MISSING_NARRATIVE_EVIDENCE';
const THREAD_DUPLICATE_LIKE_ADD = 'THREAD_DUPLICATE_LIKE_ADD';
const THREAD_MISSING_EQUIVALENT_RESOLVE = 'THREAD_MISSING_EQUIVALENT_RESOLVE';
const THREAD_DANGER_IMMEDIATE_HAZARD = 'THREAD_DANGER_IMMEDIATE_HAZARD';

const THREAD_JACCARD_THRESHOLDS: Record<ThreadType, number> = {
  [ThreadType.RELATIONSHIP]: 0.58,
  [ThreadType.MORAL]: 0.58,
  [ThreadType.MYSTERY]: 0.62,
  [ThreadType.INFORMATION]: 0.62,
  [ThreadType.QUEST]: 0.66,
  [ThreadType.RESOURCE]: 0.66,
  [ThreadType.DANGER]: 0.66,
};

const THREAD_STOP_PHRASES = [
  'currently',
  'right now',
  'at this point',
  'for now',
] as const;

function normalizeIntentText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function intentComparisonKey(value: string): string {
  return normalizeIntentText(value).toLocaleLowerCase();
}

function normalizeId(value: string): string {
  return value.trim();
}

function normalizeEvidenceText(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function deriveLexicalAnchors(value: string): string[] {
  const normalized = normalizeEvidenceText(value);
  if (!normalized) {
    return [];
  }

  return dedupeByKey(
    normalized.split(/\s+/).filter(token => token.length >= 3),
    token => token,
  );
}

function hasEvidenceForAnchor(
  evidenceText: string,
  anchors: readonly string[],
): { matched: boolean; anchor: string } {
  const fallbackAnchor = anchors[0] ?? '';
  for (const anchor of anchors) {
    if (evidenceText.includes(anchor)) {
      return {
        matched: true,
        anchor,
      };
    }
  }

  return {
    matched: false,
    anchor: fallbackAnchor,
  };
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

function normalizeThreadSimilarityText(value: string): string {
  let normalized = normalizeEvidenceText(value);

  for (const phrase of THREAD_STOP_PHRASES) {
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`\\b${escapedPhrase}\\b`, 'g'), ' ');
  }

  return normalized.replace(/\s+/g, ' ').trim();
}

function tokenizeThreadSimilarityText(value: string): ReadonlySet<string> {
  const normalized = normalizeThreadSimilarityText(value);
  if (!normalized) {
    return new Set();
  }

  return new Set(normalized.split(/\s+/).filter(token => token.length >= 2));
}

function jaccardSimilarity(
  leftTokens: ReadonlySet<string>,
  rightTokens: ReadonlySet<string>,
): number {
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  const smaller = leftTokens.size <= rightTokens.size ? leftTokens : rightTokens;
  const larger = leftTokens.size <= rightTokens.size ? rightTokens : leftTokens;

  for (const token of smaller) {
    if (larger.has(token)) {
      intersectionSize += 1;
    }
  }

  const unionSize = leftTokens.size + rightTokens.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

function isImmediateDangerHazardText(value: string): boolean {
  const normalized = normalizeThreadSimilarityText(value);
  if (!normalized) {
    return false;
  }

  if (
    /\b(right now|currently|immediately|this scene|this moment|at once)\b/.test(normalized)
  ) {
    return true;
  }

  return /\b(is|are)\b.*\b(burning|collapsing|flooding|exploding|attacking|choking|spreading)\b/.test(
    normalized,
  );
}

function applyThreadDedupAndContradictionRules(
  candidateAdds: readonly ReconciledThreadAdd[],
  previousThreads: StateReconciliationPreviousState['threads'],
  resolvedThreadIds: readonly string[],
  diagnostics: StateReconciliationDiagnostic[],
): ReconciledThreadAdd[] {
  const resolvedThreadIdSet = new Set(resolvedThreadIds);
  const acceptedAdds: ReconciledThreadAdd[] = [];

  for (const candidate of candidateAdds) {
    if (
      candidate.threadType === ThreadType.DANGER &&
      isImmediateDangerHazardText(candidate.text)
    ) {
      diagnostics.push({
        code: THREAD_DANGER_IMMEDIATE_HAZARD,
        field: 'threadsAdded',
        message: `DANGER thread "${candidate.text}" describes an immediate scene hazard and must be tracked as a threat/constraint instead.`,
      });
      continue;
    }

    const threshold = THREAD_JACCARD_THRESHOLDS[candidate.threadType];
    const candidateTokens = tokenizeThreadSimilarityText(candidate.text);
    const equivalentPreviousThreads = previousThreads.filter(previousThread => {
      if (previousThread.threadType !== candidate.threadType) {
        return false;
      }
      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(previousThread.text),
      );
      return similarity >= threshold;
    });

    if (equivalentPreviousThreads.length > 0) {
      const unresolvedEquivalentThread = equivalentPreviousThreads.find(
        previousThread => !resolvedThreadIdSet.has(previousThread.id),
      );

      if (unresolvedEquivalentThread) {
        diagnostics.push({
          code: THREAD_DUPLICATE_LIKE_ADD,
          field: 'threadsAdded',
          message: `Thread add "${candidate.text}" is near-duplicate of existing thread "${unresolvedEquivalentThread.id}".`,
        });
        diagnostics.push({
          code: THREAD_MISSING_EQUIVALENT_RESOLVE,
          field: 'threadsAdded',
          message: `Near-duplicate thread add "${candidate.text}" requires resolving "${unresolvedEquivalentThread.id}" in the same payload.`,
        });
        continue;
      }
    }

    const duplicateAcceptedThread = acceptedAdds.find(accepted => {
      if (accepted.threadType !== candidate.threadType) {
        return false;
      }

      const similarity = jaccardSimilarity(
        candidateTokens,
        tokenizeThreadSimilarityText(accepted.text),
      );
      return similarity >= threshold;
    });

    if (duplicateAcceptedThread) {
      diagnostics.push({
        code: THREAD_DUPLICATE_LIKE_ADD,
        field: 'threadsAdded',
        message: `Thread add "${candidate.text}" is near-duplicate of another added thread "${duplicateAcceptedThread.text}".`,
      });
      continue;
    }

    acceptedAdds.push(candidate);
  }

  return acceptedAdds;
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

function applyNarrativeEvidenceGate<T>(
  values: readonly T[],
  field: string,
  toSourceText: (value: T) => string,
  evidenceText: string,
  diagnostics: StateReconciliationDiagnostic[],
): T[] {
  const result: T[] = [];

  values.forEach(value => {
    const sourceText = normalizeIntentText(toSourceText(value));
    const anchors = deriveLexicalAnchors(sourceText);
    const evidence = hasEvidenceForAnchor(evidenceText, anchors);

    if (evidence.matched) {
      result.push(value);
      return;
    }

    diagnostics.push({
      code: MISSING_NARRATIVE_EVIDENCE,
      field,
      anchor: evidence.anchor,
      message: `No narrative evidence found for ${field} anchor "${evidence.anchor}".`,
    });
  });

  return result;
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

  const threatsRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.threats.removeIds,
    new Set(previousState.threats.map(entry => entry.id)),
    'threatsRemoved',
    diagnostics,
  );

  const constraintsRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.constraints.removeIds,
    new Set(previousState.constraints.map(entry => entry.id)),
    'constraintsRemoved',
    diagnostics,
  );

  const threadsResolved = normalizeAndValidateRemoveIds(
    plan.stateIntents.threads.resolveIds,
    new Set(previousState.threads.map(entry => entry.id)),
    'threadsResolved',
    diagnostics,
  );

  const inventoryRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.inventory.removeIds,
    new Set(previousState.inventory.map(entry => entry.id)),
    'inventoryRemoved',
    diagnostics,
  );

  const healthRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.health.removeIds,
    new Set(previousState.health.map(entry => entry.id)),
    'healthRemoved',
    diagnostics,
  );

  const characterStateChangesRemoved = normalizeAndValidateRemoveIds(
    plan.stateIntents.characterState.removeIds,
    new Set(previousState.characterState.map(entry => entry.id)),
    'characterStateChangesRemoved',
    diagnostics,
  );

  const threatsAdded = applyNarrativeEvidenceGate(
    normalizeTextIntents(plan.stateIntents.threats.add),
    'threatsAdded',
    value => value,
    evidenceText,
    diagnostics,
  );

  const threatsRemovedWithEvidence = applyNarrativeEvidenceGate(
    threatsRemoved,
    'threatsRemoved',
    value => previousState.threats.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
    diagnostics,
  );

  const constraintsAdded = applyNarrativeEvidenceGate(
    normalizeTextIntents(plan.stateIntents.constraints.add),
    'constraintsAdded',
    value => value,
    evidenceText,
    diagnostics,
  );

  const constraintsRemovedWithEvidence = applyNarrativeEvidenceGate(
    constraintsRemoved,
    'constraintsRemoved',
    value => previousState.constraints.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
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

  const inventoryAdded = applyNarrativeEvidenceGate(
    normalizeTextIntents(plan.stateIntents.inventory.add),
    'inventoryAdded',
    value => value,
    evidenceText,
    diagnostics,
  );

  const inventoryRemovedWithEvidence = applyNarrativeEvidenceGate(
    inventoryRemoved,
    'inventoryRemoved',
    value => previousState.inventory.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
    diagnostics,
  );

  const healthAdded = applyNarrativeEvidenceGate(
    normalizeTextIntents(plan.stateIntents.health.add),
    'healthAdded',
    value => value,
    evidenceText,
    diagnostics,
  );

  const healthRemovedWithEvidence = applyNarrativeEvidenceGate(
    healthRemoved,
    'healthRemoved',
    value => previousState.health.find(entry => entry.id === value)?.text ?? '',
    evidenceText,
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
    threatsAdded,
    threatsRemoved: threatsRemovedWithEvidence,
    constraintsAdded,
    constraintsRemoved: constraintsRemovedWithEvidence,
    threadsAdded,
    threadsResolved: threadsResolvedWithEvidence,
    inventoryAdded,
    inventoryRemoved: inventoryRemovedWithEvidence,
    healthAdded,
    healthRemoved: healthRemovedWithEvidence,
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
