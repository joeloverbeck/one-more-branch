import { isSavedConcept, type SavedConcept } from '../models/saved-concept.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function upcastScores(scores: Record<string, unknown>): Record<string, unknown> {
  if (!('contentCharge' in scores)) {
    return { ...scores, contentCharge: 0 };
  }
  return scores;
}

function upcastEvaluatedConcept(ec: Record<string, unknown>): Record<string, unknown> {
  const scores = ec['scores'];
  if (isObjectRecord(scores)) {
    return { ...ec, scores: upcastScores(scores) };
  }
  return ec;
}

function upcastSavedConceptPayload(value: unknown): unknown {
  if (!isObjectRecord(value)) {
    return value;
  }

  const patched: Record<string, unknown> = { ...value };

  const ec = patched['evaluatedConcept'];
  if (isObjectRecord(ec)) {
    patched['evaluatedConcept'] = upcastEvaluatedConcept(ec);
  }

  const preHardened = patched['preHardenedConcept'];
  if (isObjectRecord(preHardened)) {
    patched['preHardenedConcept'] = upcastEvaluatedConcept(preHardened);
  }

  return patched;
}

export function parseSavedConcept(value: unknown, sourcePath: string): SavedConcept {
  const upcasted = upcastSavedConceptPayload(value);

  if (isSavedConcept(upcasted)) {
    return upcasted;
  }

  throw new Error(`Invalid SavedConcept payload at ${sourcePath}`);
}
