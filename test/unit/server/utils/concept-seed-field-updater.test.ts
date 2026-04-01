import {
  isEditableConceptSeedField,
  validateConceptSeedFieldValue,
  applyConceptSeedFieldUpdate,
} from '../../../../src/server/utils/concept-seed-field-updater.js';
import type { ConceptSeed } from '../../../../src/models/concept-seed.js';

function makeSeed(overrides: Partial<ConceptSeed> = {}): ConceptSeed {
  return {
    id: 'seed-1',
    name: 'Test Seed',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    sourceKernelId: 'kernel-1',
    protagonistDetails: 'A test character',
    oneLineHook: 'A hook',
    genreFrame: 'FANTASY' as ConceptSeed['genreFrame'],
    genreSubversion: 'Subversion text',
    conflictAxis: 'POWER_VS_MORALITY' as ConceptSeed['conflictAxis'],
    conflictType: 'PERSON_VS_SELF' as ConceptSeed['conflictType'],
    whatIfQuestion: 'What if?',
    playerFantasy: 'Fantasy text',
    protagonistRole: 'A warrior',
    coreCompetence: 'Swordsmanship',
    coreFlaw: 'Arrogance',
    actionVerbs: ['fight', 'defend', 'conquer', 'charge', 'rally', 'endure'],
    coreConflictLoop: 'Conflict loop',
    settingAxioms: ['Axiom 1', 'Axiom 2'],
    constraintSet: ['Constraint 1', 'Constraint 2'],
    keyInstitutions: ['Institution 1', 'Institution 2'],
    settingScale: 'LOCAL' as ConceptSeed['settingScale'],
    ...overrides,
  };
}

describe('isEditableConceptSeedField', () => {
  it('allows editable string fields', () => {
    expect(isEditableConceptSeedField('name')).toBe(true);
    expect(isEditableConceptSeedField('oneLineHook')).toBe(true);
    expect(isEditableConceptSeedField('protagonistRole')).toBe(true);
    expect(isEditableConceptSeedField('coreCompetence')).toBe(true);
    expect(isEditableConceptSeedField('coreFlaw')).toBe(true);
    expect(isEditableConceptSeedField('coreConflictLoop')).toBe(true);
    expect(isEditableConceptSeedField('whatIfQuestion')).toBe(true);
    expect(isEditableConceptSeedField('playerFantasy')).toBe(true);
    expect(isEditableConceptSeedField('genreSubversion')).toBe(true);
  });

  it('allows editable array fields', () => {
    expect(isEditableConceptSeedField('actionVerbs')).toBe(true);
    expect(isEditableConceptSeedField('settingAxioms')).toBe(true);
    expect(isEditableConceptSeedField('constraintSet')).toBe(true);
    expect(isEditableConceptSeedField('keyInstitutions')).toBe(true);
  });

  it('blocks immutable and metadata fields', () => {
    expect(isEditableConceptSeedField('id')).toBe(false);
    expect(isEditableConceptSeedField('createdAt')).toBe(false);
    expect(isEditableConceptSeedField('updatedAt')).toBe(false);
    expect(isEditableConceptSeedField('sourceKernelId')).toBe(false);
  });

  it('blocks enum/badge fields', () => {
    expect(isEditableConceptSeedField('genreFrame')).toBe(false);
    expect(isEditableConceptSeedField('conflictAxis')).toBe(false);
    expect(isEditableConceptSeedField('conflictType')).toBe(false);
    expect(isEditableConceptSeedField('settingScale')).toBe(false);
  });

  it('blocks unknown fields', () => {
    expect(isEditableConceptSeedField('fakeField')).toBe(false);
  });
});

describe('validateConceptSeedFieldValue', () => {
  it('accepts string for string fields', () => {
    expect(validateConceptSeedFieldValue('name', 'New Name')).toBeNull();
  });

  it('rejects non-string for string fields', () => {
    expect(validateConceptSeedFieldValue('name', 42)).toBe('Expected string for field "name"');
  });

  it('accepts string array for array fields', () => {
    expect(validateConceptSeedFieldValue('settingAxioms', ['a', 'b'])).toBeNull();
  });

  it('rejects non-array for array fields', () => {
    expect(validateConceptSeedFieldValue('settingAxioms', 'not-array')).toBe(
      'Expected string array for field "settingAxioms"'
    );
  });

  it('rejects array with non-string items', () => {
    expect(validateConceptSeedFieldValue('settingAxioms', ['ok', 42])).toBe(
      'Expected string array for field "settingAxioms"'
    );
  });

  it('returns error for unknown fields', () => {
    expect(validateConceptSeedFieldValue('fakeField', 'val')).toBe('Unknown field: "fakeField"');
  });
});

describe('applyConceptSeedFieldUpdate', () => {
  it('updates a string field immutably', () => {
    const original = makeSeed();
    const updated = applyConceptSeedFieldUpdate(original, 'name', 'New Name');

    expect(updated.name).toBe('New Name');
    expect(original.name).toBe('Test Seed');
    expect(updated).not.toBe(original);
  });

  it('updates an array field immutably', () => {
    const original = makeSeed();
    const updated = applyConceptSeedFieldUpdate(original, 'settingAxioms', ['X', 'Y']);

    expect(updated.settingAxioms).toEqual(['X', 'Y']);
    expect(original.settingAxioms).toEqual(['Axiom 1', 'Axiom 2']);
  });
});
