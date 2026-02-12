import type { CharacterStateIntentAdd } from '../llm/types.js';
import type { ReconciledCharacterStateAdd } from './state-reconciler-types.js';
import {
  normalizeIntentText,
  intentComparisonKey,
  dedupeByKey,
} from './reconciler-text-utils.js';

export function normalizeCharacterStateAdds(
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
