import { isSavedConcept, type SavedConcept } from '../models/saved-concept.js';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function upcastScores(scores: Record<string, unknown>): Record<string, unknown> {
  const patched = { ...scores };
  if (!('contentCharge' in patched)) {
    patched['contentCharge'] = 0;
  }
  delete patched['llmFeasibility'];
  return patched;
}

function upcastEvaluatedConcept(ec: Record<string, unknown>): Record<string, unknown> {
  const patched = { ...ec };
  const scores = patched['scores'];
  if (isObjectRecord(scores)) {
    patched['scores'] = upcastScores(scores);
  }
  const evidence = patched['scoreEvidence'];
  if (isObjectRecord(evidence)) {
    const patchedEvidence = { ...evidence };
    delete patchedEvidence['llmFeasibility'];
    patched['scoreEvidence'] = patchedEvidence;
  }
  return patched;
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
