import {
  Health,
  HealthChanges,
  applyHealthChanges as applyChanges,
  createEmptyHealthChanges,
} from '../models';

function getMaxHealthId(health: Health): number {
  let maxId = 0;
  for (const entry of health) {
    if (entry.id.startsWith('hp-')) {
      const num = Number.parseInt(entry.id.slice(3), 10);
      if (Number.isFinite(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  return maxId;
}

/**
 * Normalizes a health entry for comparison purposes.
 * Used for duplicate detection and removal matching.
 */
export function normalizeHealthEntry(entry: string): string {
  return entry.trim().toLowerCase();
}

/**
 * Adds a health entry immutably.
 * Allows duplicates (e.g., multiple injuries).
 */
export function addHealthEntry(health: Health, entry: string): Health {
  const trimmed = entry.trim();
  if (!trimmed) {
    return health;
  }

  const nextId = getMaxHealthId(health) + 1;
  return [...health, { id: `hp-${nextId}`, text: trimmed }];
}

/**
 * Removes a health entry immutably.
 * Matches by entry ID and returns unchanged health if ID is not found.
 */
export function removeHealthEntry(health: Health, entryId: string): Health {
  const result = [...health];
  const index = result.findIndex(e => e.id === entryId);
  if (index !== -1) {
    result.splice(index, 1);
  }
  return result;
}

/**
 * Applies health changes (additions and removals) to current health.
 * Re-exports from models for convenience.
 */
export function applyHealthChanges(current: Health, changes: HealthChanges): Health {
  return applyChanges(current, changes);
}

/**
 * Formats health for inclusion in LLM prompts.
 * Returns default text "You feel fine." if no health conditions.
 */
export function formatHealthForPrompt(health: Health): string {
  if (health.length === 0) {
    return 'YOUR HEALTH:\n- You feel fine.\n';
  }

  const formattedEntries = health.map(entry => `- [${entry.id}] ${entry.text}`).join('\n');
  return `YOUR HEALTH:\n${formattedEntries}\n`;
}

/**
 * Creates health changes from arrays of added/removed entries.
 */
export function createHealthChanges(
  added: readonly string[],
  removed: readonly string[],
): HealthChanges {
  return {
    added: added.map(entry => entry.trim()).filter(entry => entry),
    removed: removed.map(entry => entry.trim()).filter(entry => entry),
  };
}

/**
 * Checks if health contains a specific condition (case-insensitive).
 */
export function hasHealthCondition(health: Health, condition: string): boolean {
  const normalizedCondition = normalizeHealthEntry(condition);
  return health.some(e => normalizeHealthEntry(e.text) === normalizedCondition);
}

/**
 * Gets parent accumulated health from a page.
 */
export function getParentAccumulatedHealth(
  parentPage: { accumulatedHealth: Health },
): Health {
  return parentPage.accumulatedHealth;
}

// Re-export for convenience
export { createEmptyHealthChanges };
