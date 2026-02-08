/**
 * Tagged state entry types and parsing helpers for active-state categories.
 */

import { modelWarn } from '../model-logger.js';

export const VALID_CATEGORIES = ['THREAT', 'CONSTRAINT', 'THREAD'] as const;
export type StateCategory = typeof VALID_CATEGORIES[number];

export interface TaggedStateEntry {
  readonly prefix: string;
  readonly description: string;
  readonly raw: string;
}

function isValidCategoryPrefix(prefix: string): boolean {
  return VALID_CATEGORIES.some(
    category => prefix.startsWith(`${category}_`) && prefix.length > category.length + 1
  );
}

export function parseTaggedEntry(rawEntry: string): TaggedStateEntry | null {
  const separatorIndex = rawEntry.indexOf(':');
  if (separatorIndex === -1) {
    modelWarn(`Invalid tagged state entry (missing colon): "${rawEntry}"`);
    return null;
  }

  const prefix = rawEntry.slice(0, separatorIndex).trim();
  const description = rawEntry.slice(separatorIndex + 1).trim();

  if (!isValidCategoryPrefix(prefix)) {
    modelWarn(`Invalid tagged state entry prefix: "${rawEntry}"`);
    return null;
  }

  return {
    prefix,
    description,
    raw: rawEntry,
  };
}

export function isValidRemovalPrefix(prefix: string): boolean {
  const trimmed = prefix.trim();
  if (!trimmed || trimmed.includes(':')) {
    return false;
  }

  return isValidCategoryPrefix(trimmed);
}

export function extractPrefixFromRemoval(removal: string): string | null {
  const trimmed = removal.trim();
  if (!trimmed) {
    modelWarn('Invalid removal prefix (empty string)');
    return null;
  }

  if (!trimmed.includes(':')) {
    if (isValidRemovalPrefix(trimmed)) {
      return trimmed;
    }

    modelWarn(`Invalid removal prefix: "${removal}"`);
    return null;
  }

  const extractedPrefix = trimmed.slice(0, trimmed.indexOf(':')).trim();
  if (!isValidRemovalPrefix(extractedPrefix)) {
    modelWarn(`Invalid removal prefix: "${removal}"`);
    return null;
  }

  modelWarn(`Removal prefix included description; using extracted prefix "${extractedPrefix}"`);
  return extractedPrefix;
}
