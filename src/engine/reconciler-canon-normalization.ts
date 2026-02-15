import type { TaggedCanonFact } from '../models/state/index.js';
import type { WorldFactType } from '../models/decomposed-world.js';
import type { CanonWorldAddItem } from '../llm/planner-types.js';
import type { StateReconciliationDiagnostic } from './state-reconciler-types.js';
import { normalizeIntentText, intentComparisonKey } from './reconciler-text-utils.js';

export const DUPLICATE_CANON_FACT = 'DUPLICATE_CANON_FACT';

const VALID_FACT_TYPES: ReadonlySet<string> = new Set<string>([
  'LAW',
  'NORM',
  'BELIEF',
  'DISPUTED',
  'RUMOR',
  'MYSTERY',
]);

export function normalizeCanonFacts(
  values: readonly CanonWorldAddItem[],
  diagnostics: StateReconciliationDiagnostic[]
): TaggedCanonFact[] {
  const seen = new Set<string>();
  const result: TaggedCanonFact[] = [];

  values.forEach((value, index) => {
    const normalized = normalizeIntentText(value.text);
    const key = intentComparisonKey(value.text);

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

    const factType: WorldFactType = VALID_FACT_TYPES.has(value.factType)
      ? (value.factType as WorldFactType)
      : 'LAW';

    seen.add(key);
    result.push({ text: normalized, factType });
  });

  return result;
}

export function normalizeCharacterCanonFacts(
  entries: readonly { characterName: string; facts: string[] }[],
  diagnostics: StateReconciliationDiagnostic[]
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
    [...byCharacter.values()].map((entry) => [entry.characterName, entry.facts])
  );
}
