export const STATE_ID_PREFIXES = {
  threats: 'th-',
  constraints: 'cn-',
  inventory: 'inv-',
  health: 'hp-',
  threads: 'td-',
  promises: 'pr-',
  characterState: 'cs-',
} as const;

export type CanonicalStateIdPrefix = (typeof STATE_ID_PREFIXES)[keyof typeof STATE_ID_PREFIXES];

export const STATE_ID_RULE_KEYS = {
  ADDITION_MUST_NOT_BE_ID_LIKE: 'state_id.addition.must_not_be_id_like',
  ID_ONLY_FIELD_REQUIRES_ID: 'state_id.id_only_field.requires_id',
  ID_ONLY_FIELD_PREFIX_MISMATCH: 'state_id.id_only_field.prefix_mismatch',
} as const;

export type StateIdRuleKey = (typeof STATE_ID_RULE_KEYS)[keyof typeof STATE_ID_RULE_KEYS];

export interface PrefixValidationIssue {
  readonly ruleKey: StateIdRuleKey;
  readonly field: string;
  readonly index: number;
  readonly value: string;
  readonly expectedPrefix?: CanonicalStateIdPrefix;
}

const ID_LIKE_PATTERN = /^[a-z]+-\d+$/;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isIdLikeValue(value: string): boolean {
  const trimmed = value.trim();
  return Object.values(STATE_ID_PREFIXES).some((prefix) => trimmed.startsWith(prefix));
}

export function isCanonicalIdForPrefix(
  value: string,
  expectedPrefix: CanonicalStateIdPrefix
): boolean {
  const trimmed = value.trim();
  const idPattern = new RegExp(`^${escapeRegex(expectedPrefix)}\\d+$`);
  return idPattern.test(trimmed);
}

export function validateNoIdLikeAdditions(
  values: readonly string[],
  field: string
): PrefixValidationIssue[] {
  const issues: PrefixValidationIssue[] = [];
  values.forEach((value, index) => {
    if (isIdLikeValue(value)) {
      issues.push({
        ruleKey: STATE_ID_RULE_KEYS.ADDITION_MUST_NOT_BE_ID_LIKE,
        field,
        index,
        value,
      });
    }
  });
  return issues;
}

export function validateIdOnlyField(
  values: readonly string[],
  field: string,
  expectedPrefix: CanonicalStateIdPrefix
): PrefixValidationIssue[] {
  const issues: PrefixValidationIssue[] = [];
  values.forEach((value, index) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    if (!ID_LIKE_PATTERN.test(trimmed)) {
      issues.push({
        ruleKey: STATE_ID_RULE_KEYS.ID_ONLY_FIELD_REQUIRES_ID,
        field,
        index,
        value,
        expectedPrefix,
      });
      return;
    }

    if (!isCanonicalIdForPrefix(trimmed, expectedPrefix)) {
      issues.push({
        ruleKey: STATE_ID_RULE_KEYS.ID_ONLY_FIELD_PREFIX_MISMATCH,
        field,
        index,
        value,
        expectedPrefix,
      });
    }
  });
  return issues;
}
