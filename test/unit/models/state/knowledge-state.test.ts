import {
  isKnowledgeAsymmetry,
} from '../../../../src/models/state/knowledge-state.js';

describe('isKnowledgeAsymmetry', () => {
  it('returns true for a valid knowledge asymmetry object', () => {
    expect(
      isKnowledgeAsymmetry({
        characterName: 'Captain Elara',
        knownFacts: ['The relay will fail at dawn'],
        falseBeliefs: ['The envoy is loyal'],
        secrets: ['Sabotaged the relay herself'],
      })
    ).toBe(true);
  });

  it('returns false when characterName is empty', () => {
    expect(
      isKnowledgeAsymmetry({
        characterName: '   ',
        knownFacts: [],
        falseBeliefs: [],
        secrets: [],
      })
    ).toBe(false);
  });

  it('returns false when any bucket is not an array of strings', () => {
    expect(
      isKnowledgeAsymmetry({
        characterName: 'Captain Elara',
        knownFacts: ['Valid fact'],
        falseBeliefs: 'not-an-array',
        secrets: [],
      })
    ).toBe(false);
  });
});
