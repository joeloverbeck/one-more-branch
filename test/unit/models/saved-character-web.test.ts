import {
  CharacterDepth,
  StoryFunction,
} from '../../../src/models/character-enums.js';
import type { CastRoleAssignment } from '../../../src/models/character-pipeline-types.js';
import {
  getProtagonistAssignment,
  isSavedCharacterWeb,
} from '../../../src/models/saved-character-web.js';

function makeValidWeb(): Record<string, unknown> {
  return {
    id: 'web-1',
    name: 'Test Web',
    createdAt: '2026-03-08T00:00:00Z',
    updatedAt: '2026-03-08T00:00:00Z',
    sourceConceptId: 'c-1',
    protagonistName: 'Alice',
    inputs: { kernelSummary: 'A dark tale', worldbuilding: '' },
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

  it('returns false when sourceConceptId is missing', () => {
    const web = makeValidWeb();
    delete web['sourceConceptId'];
    expect(isSavedCharacterWeb(web)).toBe(false);
  });

  it('returns false when sourceConceptId is empty', () => {
    const web = makeValidWeb();
    web['sourceConceptId'] = '';
    expect(isSavedCharacterWeb(web)).toBe(false);
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

  it('returns false when inputs.worldbuilding is missing', () => {
    const web = makeValidWeb();
    web['inputs'] = { kernelSummary: 'A dark tale' };
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

describe('getProtagonistAssignment', () => {
  it('returns the sole protagonist assignment', () => {
    const protagonist = getProtagonistAssignment(
      [
        {
          characterName: 'Alice',
          isProtagonist: true,
          storyFunction: StoryFunction.ALLY,
          characterDepth: CharacterDepth.ROUND,
          narrativeRole: 'hero',
          conflictRelationship: 'internal',
        },
      ] satisfies readonly CastRoleAssignment[],
    );

    expect(protagonist.characterName).toBe('Alice');
  });

  it('throws when there is no protagonist assignment', () => {
    expect(() =>
      getProtagonistAssignment([
        {
          characterName: 'Alice',
          isProtagonist: false,
          storyFunction: StoryFunction.ALLY,
          characterDepth: CharacterDepth.ROUND,
          narrativeRole: 'hero',
          conflictRelationship: 'internal',
        },
      ] satisfies readonly CastRoleAssignment[]),
    ).toThrow('Character web requires exactly one protagonist assignment; found 0');
  });

  it('throws when there are multiple protagonist assignments', () => {
    expect(() =>
      getProtagonistAssignment([
        {
          characterName: 'Alice',
          isProtagonist: true,
          storyFunction: StoryFunction.ALLY,
          characterDepth: CharacterDepth.ROUND,
          narrativeRole: 'hero',
          conflictRelationship: 'internal',
        },
        {
          characterName: 'Bob',
          isProtagonist: true,
          storyFunction: StoryFunction.ALLY,
          characterDepth: CharacterDepth.ROUND,
          narrativeRole: 'hero',
          conflictRelationship: 'internal',
        },
      ] satisfies readonly CastRoleAssignment[]),
    ).toThrow('Character web requires exactly one protagonist assignment; found 2');
  });
});
