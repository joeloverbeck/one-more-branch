import type { GenerationResult } from '../types.js';
import { GenerationResultSchema } from './validation-schema.js';

export function validateGenerationResponse(
  rawJson: unknown,
  rawResponse: string,
): GenerationResult {
  const validated = GenerationResultSchema.parse(rawJson);
  const storyArc = validated.storyArc.trim();

  // Process newCharacterCanonFacts: trim all values
  const newCharacterCanonFacts: Record<string, string[]> = {};
  for (const [name, facts] of Object.entries(validated.newCharacterCanonFacts)) {
    const trimmedFacts = facts.map(fact => fact.trim()).filter(fact => fact);
    if (trimmedFacts.length > 0) {
      newCharacterCanonFacts[name.trim()] = trimmedFacts;
    }
  }

  // Process characterStateChangesAdded: trim all values
  const characterStateChangesAdded = validated.characterStateChangesAdded.map(entry => ({
    characterName: entry.characterName.trim(),
    states: entry.states.map(s => s.trim()).filter(s => s),
  })).filter(entry => entry.characterName && entry.states.length > 0);

  // Process characterStateChangesRemoved: trim all values
  const characterStateChangesRemoved = validated.characterStateChangesRemoved.map(entry => ({
    characterName: entry.characterName.trim(),
    states: entry.states.map(s => s.trim()).filter(s => s),
  })).filter(entry => entry.characterName && entry.states.length > 0);

  return {
    narrative: validated.narrative.trim(),
    choices: validated.choices.map(choice => choice.trim()),
    stateChangesAdded: validated.stateChangesAdded.map(change => change.trim()).filter(change => change),
    stateChangesRemoved: validated.stateChangesRemoved.map(change => change.trim()).filter(change => change),
    newCanonFacts: validated.newCanonFacts.map(fact => fact.trim()).filter(fact => fact),
    newCharacterCanonFacts,
    inventoryAdded: validated.inventoryAdded.map(item => item.trim()).filter(item => item),
    inventoryRemoved: validated.inventoryRemoved.map(item => item.trim()).filter(item => item),
    healthAdded: validated.healthAdded.map(entry => entry.trim()).filter(entry => entry),
    healthRemoved: validated.healthRemoved.map(entry => entry.trim()).filter(entry => entry),
    characterStateChangesAdded,
    characterStateChangesRemoved,
    isEnding: validated.isEnding,
    storyArc: storyArc ? storyArc : undefined,
    rawResponse,
  };
}
