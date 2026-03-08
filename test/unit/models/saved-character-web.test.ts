import { isSavedCharacterWeb } from '../../../src/models/saved-character-web.js';

function makeValidWeb(): Record<string, unknown> {
  return {
    id: 'web-1',
    name: 'Test Web',
    createdAt: '2026-03-08T00:00:00Z',
    updatedAt: '2026-03-08T00:00:00Z',
    sourceKernelId: 'k-1',
    sourceConceptId: 'c-1',
    inputs: { kernelSummary: 'A dark tale' },
    assignments: [
      {
        characterName: 'Alice',
        isProtagonist: true,
        storyFunction: 'PROTAGONIST',
        characterDepth: 'DEEP',
        narrativeRole: 'hero',
        conflictRelationship: 'internal',
      },
    ],
    relationshipArchetypes: [
      {
        fromCharacter: 'Alice',
        toCharacter: 'Bob',
        relationshipType: 'RIVAL',
        valence: 'HOSTILE',
        essentialTension: 'They compete for the throne',
      },
    ],
    castDynamicsSummary: 'A tense ensemble driven by rivalry.',
  };
}

describe('isSavedCharacterWeb', () => {
  it('returns true for a valid SavedCharacterWeb object', () => {
    expect(isSavedCharacterWeb(makeValidWeb())).toBe(true);
  });

  it('returns true when optional sourceKernelId and sourceConceptId are absent', () => {
    const web = makeValidWeb();
    delete web['sourceKernelId'];
    delete web['sourceConceptId'];
    expect(isSavedCharacterWeb(web)).toBe(true);
  });

  it('returns false when id is missing', () => {
    const web = makeValidWeb();
    delete web['id'];
    expect(isSavedCharacterWeb(web)).toBe(false);
  });

  it('returns false when assignments is missing', () => {
    const web = makeValidWeb();
    delete web['assignments'];
    expect(isSavedCharacterWeb(web)).toBe(false);
  });

  it('returns false when relationshipArchetypes is missing', () => {
    const web = makeValidWeb();
    delete web['relationshipArchetypes'];
    expect(isSavedCharacterWeb(web)).toBe(false);
  });

  it('returns false when castDynamicsSummary is missing', () => {
    const web = makeValidWeb();
    delete web['castDynamicsSummary'];
    expect(isSavedCharacterWeb(web)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isSavedCharacterWeb(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isSavedCharacterWeb(undefined)).toBe(false);
  });

  it('returns false for non-object inputs', () => {
    expect(isSavedCharacterWeb('string')).toBe(false);
    expect(isSavedCharacterWeb(42)).toBe(false);
    expect(isSavedCharacterWeb(true)).toBe(false);
  });
});
