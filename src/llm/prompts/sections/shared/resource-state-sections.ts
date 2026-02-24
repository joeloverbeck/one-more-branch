import type { KeyedEntry } from '../../../../models/state/keyed-entry.js';

export function buildInventorySection(inventory: readonly KeyedEntry[]): string {
  if (inventory.length === 0) {
    return '';
  }

  const items = inventory.map((entry) => `- [${entry.id}] ${entry.text}`).join('\n');
  return `YOUR INVENTORY:
${items}

`;
}

export function buildHealthSection(health: readonly KeyedEntry[]): string {
  if (health.length === 0) {
    return '';
  }

  const conditions = health.map((entry) => `- [${entry.id}] ${entry.text}`).join('\n');
  return `YOUR HEALTH:
${conditions}

`;
}
