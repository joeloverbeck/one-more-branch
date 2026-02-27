import { isSavedConcept, type SavedConcept } from '../models/saved-concept.js';

export function parseSavedConcept(value: unknown, sourcePath: string): SavedConcept {
  if (isSavedConcept(value)) {
    return value;
  }

  throw new Error(`Invalid SavedConcept payload at ${sourcePath}`);
}
