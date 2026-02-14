import {
  STATE_ID_PREFIXES,
  STATE_ID_RULE_KEYS,
  isCanonicalIdForPrefix,
  isIdLikeValue,
  validateIdOnlyField,
  validateNoIdLikeAdditions,
} from '../../../../src/llm/validation/state-id-prefixes';

describe('state-id-prefixes validation', () => {
  it('should detect canonical ID-like values by prefix', () => {
    expect(isIdLikeValue('th-1')).toBe(true);
    expect(isIdLikeValue('cn-2')).toBe(true);
    expect(isIdLikeValue('inv-3')).toBe(true);
    expect(isIdLikeValue('pr-4')).toBe(true);
    expect(isIdLikeValue('Threat text')).toBe(false);
  });

  it('should validate canonical IDs for a specific prefix', () => {
    expect(isCanonicalIdForPrefix('th-9', STATE_ID_PREFIXES.threats)).toBe(true);
    expect(isCanonicalIdForPrefix('pr-9', STATE_ID_PREFIXES.promises)).toBe(true);
    expect(isCanonicalIdForPrefix('cn-9', STATE_ID_PREFIXES.threats)).toBe(false);
    expect(isCanonicalIdForPrefix('th-x', STATE_ID_PREFIXES.threats)).toBe(false);
  });

  it('should return deterministic rule keys for ID-like additions', () => {
    const issues = validateNoIdLikeAdditions(['th-1', 'Fresh threat'], 'threatsAdded');

    expect(issues).toEqual([
      {
        ruleKey: STATE_ID_RULE_KEYS.ADDITION_MUST_NOT_BE_ID_LIKE,
        field: 'threatsAdded',
        index: 0,
        value: 'th-1',
      },
    ]);
  });

  it('should return deterministic rule keys for ID-only field validation', () => {
    const issues = validateIdOnlyField(
      ['plain text', 'th-2'],
      'constraintsRemoved',
      STATE_ID_PREFIXES.constraints
    );

    expect(issues).toEqual([
      {
        ruleKey: STATE_ID_RULE_KEYS.ID_ONLY_FIELD_REQUIRES_ID,
        field: 'constraintsRemoved',
        index: 0,
        value: 'plain text',
        expectedPrefix: STATE_ID_PREFIXES.constraints,
      },
      {
        ruleKey: STATE_ID_RULE_KEYS.ID_ONLY_FIELD_PREFIX_MISMATCH,
        field: 'constraintsRemoved',
        index: 1,
        value: 'th-2',
        expectedPrefix: STATE_ID_PREFIXES.constraints,
      },
    ]);
  });
});
