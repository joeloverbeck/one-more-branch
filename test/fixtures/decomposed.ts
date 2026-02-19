import type { DecomposedCharacter, SpeechFingerprint } from '../../src/models/decomposed-character';
import type { DecomposedWorld } from '../../src/models/decomposed-world';

export const EMPTY_SPEECH_FINGERPRINT: SpeechFingerprint = {
  catchphrases: [],
  vocabularyProfile: '',
  sentencePatterns: '',
  verbalTics: [],
  dialogueSamples: [],
  metaphorFrames: '',
  antiExamples: [],
  discourseMarkers: [],
  registerShifts: '',
};

export function buildMinimalDecomposedCharacter(
  name: string,
  overrides?: Partial<DecomposedCharacter>
): DecomposedCharacter {
  return {
    name,
    speechFingerprint: EMPTY_SPEECH_FINGERPRINT,
    coreTraits: [],
    motivations: '',
    protagonistRelationship: null,
    knowledgeBoundaries: '',
    decisionPattern: '',
    coreBeliefs: [],
    conflictPriority: '',
    appearance: '',
    rawDescription: '',
    ...overrides,
  };
}

export const MINIMAL_DECOMPOSED_WORLD: DecomposedWorld = {
  facts: [],
  rawWorldbuilding: '',
};

export function buildMinimalDecomposedWorld(
  overrides?: Partial<DecomposedWorld>
): DecomposedWorld {
  return {
    facts: [],
    rawWorldbuilding: '',
    ...overrides,
  };
}
