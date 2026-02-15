import type { StateAccountantResult } from '../accountant-types.js';

function normalizeStringArray(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function normalizeStateIntents(
  stateIntents: StateAccountantResult['stateIntents']
): StateAccountantResult['stateIntents'] {
  return {
    currentLocation: stateIntents.currentLocation.trim(),
    threats: {
      add: stateIntents.threats.add
        .map((entry) => ({
          text: entry.text.trim(),
          threatType: entry.threatType,
        }))
        .filter((entry) => entry.text),
      removeIds: normalizeStringArray(stateIntents.threats.removeIds),
    },
    constraints: {
      add: stateIntents.constraints.add
        .map((entry) => ({
          text: entry.text.trim(),
          constraintType: entry.constraintType,
        }))
        .filter((entry) => entry.text),
      removeIds: normalizeStringArray(stateIntents.constraints.removeIds),
    },
    threads: {
      add: stateIntents.threads.add
        .map((entry) => ({
          text: entry.text.trim(),
          threadType: entry.threadType,
          urgency: entry.urgency,
        }))
        .filter((entry) => entry.text),
      resolveIds: normalizeStringArray(stateIntents.threads.resolveIds),
    },
    inventory: {
      add: normalizeStringArray(stateIntents.inventory.add),
      removeIds: normalizeStringArray(stateIntents.inventory.removeIds),
    },
    health: {
      add: normalizeStringArray(stateIntents.health.add),
      removeIds: normalizeStringArray(stateIntents.health.removeIds),
    },
    characterState: {
      add: stateIntents.characterState.add
        .map((entry) => ({
          characterName: entry.characterName.trim(),
          states: normalizeStringArray(entry.states),
        }))
        .filter((entry) => entry.characterName && entry.states.length > 0),
      removeIds: normalizeStringArray(stateIntents.characterState.removeIds),
    },
    canon: {
      worldAdd: stateIntents.canon.worldAdd
        .map((entry) => ({
          text: entry.text.trim(),
          factType: entry.factType,
        }))
        .filter((entry) => entry.text),
      characterAdd: stateIntents.canon.characterAdd
        .map((entry) => ({
          characterName: entry.characterName.trim(),
          facts: normalizeStringArray(entry.facts),
        }))
        .filter((entry) => entry.characterName && entry.facts.length > 0),
    },
  };
}
